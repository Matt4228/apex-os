-- Failed sign-ins, counted to slow down password guessing (src/lib/loginLimit.ts)
-- CreateTable
CREATE TABLE "LoginFailure" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginFailure_key_createdAt_idx" ON "LoginFailure"("key", "createdAt");

-- CreateIndex
CREATE INDEX "LoginFailure_createdAt_idx" ON "LoginFailure"("createdAt");

-- Like every other table: no access through Supabase's public API. Prisma connects as the owner, so the app is unaffected
ALTER TABLE "LoginFailure" ENABLE ROW LEVEL SECURITY;
