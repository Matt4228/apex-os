-- Every competition gets a join code for its invite link. Existing competitions get a random one first, then the
-- column becomes required. md5 gives 0-9 and a-f; uppercased with 0 and 1 swapped for G and H, no code has a
-- look-alike character (0/O, 1/I/L)
ALTER TABLE "Competition" ADD COLUMN "joinCode" TEXT;
UPDATE "Competition" SET "joinCode" = translate(upper(substr(md5(random()::text || "id"), 1, 10)), '01', 'GH');
ALTER TABLE "Competition" ALTER COLUMN "joinCode" SET NOT NULL;
-- CreateTable
CREATE TABLE "CompetitionInvite" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitionInvite_inviteeId_idx" ON "CompetitionInvite"("inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionInvite_competitionId_inviteeId_key" ON "CompetitionInvite"("competitionId", "inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_joinCode_key" ON "Competition"("joinCode");

-- AddForeignKey
ALTER TABLE "CompetitionInvite" ADD CONSTRAINT "CompetitionInvite_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionInvite" ADD CONSTRAINT "CompetitionInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionInvite" ADD CONSTRAINT "CompetitionInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Like every other table: no access through Supabase's public API. Prisma connects as the owner, so the app is unaffected
ALTER TABLE "CompetitionInvite" ENABLE ROW LEVEL SECURITY;
