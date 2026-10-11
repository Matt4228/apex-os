-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "plannedFor" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_userId_plannedFor_idx" ON "Task"("userId", "plannedFor");
