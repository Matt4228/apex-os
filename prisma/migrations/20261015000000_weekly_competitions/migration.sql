-- Competitions move to weekly targets. Existing competitions are removed (no real users yet; the demo is reseeded):
-- the new required columns have nothing to fill them from.
DELETE FROM "CompetitionEntry";
DELETE FROM "Competition";

-- DropForeignKey
ALTER TABLE "Competition" DROP CONSTRAINT "Competition_userId_fkey";

-- DropForeignKey
ALTER TABLE "CompetitionEntry" DROP CONSTRAINT "CompetitionEntry_competitionId_fkey";

-- AlterTable
ALTER TABLE "Competition" DROP COLUMN "endDate",
DROP COLUMN "rulesJson",
DROP COLUMN "status",
DROP COLUMN "userId",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "weeks" INTEGER NOT NULL;

-- DropTable
DROP TABLE "CompetitionEntry";

-- CreateTable
CREATE TABLE "CompetitionMetric" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompetitionMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekTarget" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WeekTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressLog" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitionMetric_competitionId_idx" ON "CompetitionMetric"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekTarget_metricId_week_key" ON "WeekTarget"("metricId", "week");

-- CreateIndex
CREATE INDEX "Participant_userId_idx" ON "Participant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_competitionId_userId_key" ON "Participant"("competitionId", "userId");

-- CreateIndex
CREATE INDEX "ProgressLog_participantId_week_idx" ON "ProgressLog"("participantId", "week");

-- CreateIndex
CREATE INDEX "ProgressLog_metricId_idx" ON "ProgressLog"("metricId");

-- CreateIndex
CREATE INDEX "Competition_ownerId_idx" ON "Competition"("ownerId");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionMetric" ADD CONSTRAINT "CompetitionMetric_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekTarget" ADD CONSTRAINT "WeekTarget_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "CompetitionMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressLog" ADD CONSTRAINT "ProgressLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressLog" ADD CONSTRAINT "ProgressLog_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "CompetitionMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Like every other table: no access through Supabase's public API. Prisma connects as the owner, so the app is unaffected
ALTER TABLE "CompetitionMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeekTarget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Participant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProgressLog" ENABLE ROW LEVEL SECURITY;
