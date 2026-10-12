-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "scheduleBlockId" TEXT;

-- CreateIndex
CREATE INDEX "Task_scheduleBlockId_idx" ON "Task"("scheduleBlockId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_scheduleBlockId_fkey" FOREIGN KEY ("scheduleBlockId") REFERENCES "ScheduleBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
