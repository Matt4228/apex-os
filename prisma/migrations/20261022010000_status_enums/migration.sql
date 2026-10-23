-- Status, role and other fixed-choice columns become Postgres enums, so a value outside the set can't be stored.
-- Prisma generated this as DROP COLUMN then ADD COLUMN with a default, which would have reset every task to "todo"
-- and every competition owner to "member". Each column is converted in place instead: drop the text default, cast
-- the values, set the default back. A row holding a value outside its set makes the cast fail, and the transaction
-- rolls the whole migration back rather than changing anything
BEGIN;

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('pending', 'accepted');
CREATE TYPE "Repeat" AS ENUM ('none', 'daily', 'weekday', 'weekly', 'monthly');
CREATE TYPE "GoalStatus" AS ENUM ('active', 'complete');
CREATE TYPE "GoalTracking" AS ENUM ('latest', 'total', 'best');
CREATE TYPE "HabitFrequency" AS ENUM ('daily', 'weekly');
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'done');
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'declined');
CREATE TYPE "ParticipantRole" AS ENUM ('owner', 'member');

-- AlterTable
ALTER TABLE "Friendship"
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" TYPE "FriendshipStatus" USING "status"::"FriendshipStatus",
    ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "ScheduleBlock"
    ALTER COLUMN "repeat" DROP DEFAULT,
    ALTER COLUMN "repeat" TYPE "Repeat" USING "repeat"::"Repeat",
    ALTER COLUMN "repeat" SET DEFAULT 'none';

ALTER TABLE "Goal"
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" TYPE "GoalStatus" USING "status"::"GoalStatus",
    ALTER COLUMN "status" SET DEFAULT 'active',
    ALTER COLUMN "tracking" DROP DEFAULT,
    ALTER COLUMN "tracking" TYPE "GoalTracking" USING "tracking"::"GoalTracking",
    ALTER COLUMN "tracking" SET DEFAULT 'latest';

ALTER TABLE "Habit"
    ALTER COLUMN "frequency" DROP DEFAULT,
    ALTER COLUMN "frequency" TYPE "HabitFrequency" USING "frequency"::"HabitFrequency",
    ALTER COLUMN "frequency" SET DEFAULT 'daily';

ALTER TABLE "Task"
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" TYPE "TaskStatus" USING "status"::"TaskStatus",
    ALTER COLUMN "status" SET DEFAULT 'todo',
    ALTER COLUMN "priority" DROP DEFAULT,
    ALTER COLUMN "priority" TYPE "Priority" USING "priority"::"Priority",
    ALTER COLUMN "priority" SET DEFAULT 'medium';

ALTER TABLE "CompetitionInvite"
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" TYPE "InviteStatus" USING "status"::"InviteStatus",
    ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "Participant"
    ALTER COLUMN "role" DROP DEFAULT,
    ALTER COLUMN "role" TYPE "ParticipantRole" USING "role"::"ParticipantRole",
    ALTER COLUMN "role" SET DEFAULT 'member';

COMMIT;
