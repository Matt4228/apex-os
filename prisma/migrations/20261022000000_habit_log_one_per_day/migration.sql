-- A habit gets at most one log per day. Toggling used to check for a log and then add one, so two quick clicks
-- could log the same day twice. Calendar days are stored as UTC midnight (src/lib/dates.ts), but older rows got
-- now() from the column default. So first drop the extra copies of a day, keeping the earliest, then move every
-- log to its day's midnight. The index after that turns any later duplicate into an error
DELETE FROM "HabitLog" later
USING "HabitLog" earlier
WHERE later."habitId" = earlier."habitId"
  AND date_trunc('day', later."completedOn") = date_trunc('day', earlier."completedOn")
  AND (later."createdAt", later."id") > (earlier."createdAt", earlier."id");

UPDATE "HabitLog" SET "completedOn" = date_trunc('day', "completedOn")
WHERE "completedOn" <> date_trunc('day', "completedOn");

-- AlterTable
ALTER TABLE "HabitLog" ALTER COLUMN "completedOn" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_completedOn_key" ON "HabitLog"("habitId", "completedOn");
