-- Blocks move from a weekday to dates. Existing blocks are removed (no real users yet; the demo is reseeded).
-- Tasks keep their rows: their scheduleBlockId is set to null by the existing ON DELETE SET NULL.
DELETE FROM "ScheduleBlock";

-- AlterTable
ALTER TABLE "ScheduleBlock" DROP COLUMN "color",
DROP COLUMN "dayOfWeek",
DROP COLUMN "sortOrder",
ADD COLUMN     "endsAfter" INTEGER,
ADD COLUMN     "endsOn" TIMESTAMP(3),
ADD COLUMN     "repeat" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "repeatDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "BlockException" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "newDate" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "label" TEXT,
    "category" TEXT,

    CONSTRAINT "BlockException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleBlock_userId_startDate_idx" ON "ScheduleBlock"("userId", "startDate");

-- CreateIndex
CREATE INDEX "BlockException_blockId_idx" ON "BlockException"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockException_blockId_date_key" ON "BlockException"("blockId", "date");

-- AddForeignKey
ALTER TABLE "BlockException" ADD CONSTRAINT "BlockException_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ScheduleBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Like every other table: no access through Supabase's public API. Prisma connects as the owner, so the app is unaffected
ALTER TABLE "BlockException" ENABLE ROW LEVEL SECURITY;
