# Apex OS

A personal growth CRM built for daily use. Track goals, habits, tasks, and competitions in one place with a structured weekly schedule.

**Live:** https://apex-os-sand.vercel.app

---

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Database:** PostgreSQL (hosted on Supabase)
- **ORM:** Prisma 7
- **Auth:** NextAuth.js v5 (JWT, credentials provider)
- **Styling:** Tailwind CSS
- **Drag and drop:** dnd-kit
- **Testing:** Vitest and Testing Library, run in GitHub Actions
- **Deployment:** Vercel

---

## Architecture decisions

**`user_id` on every table.** Built single-user for v1 but every record is scoped to a user from day one. Adding a second user requires no schema changes.

**Local state over optimistic UI primitives.** After evaluating `useOptimistic`, the task and habit lists use plain `useState` with fire-and-forget server actions. This avoids the server re-render race condition that causes snap-back on toggle interactions.

**Server actions over a REST API.** Next.js server actions colocate the API layer with the UI, reducing boilerplate while keeping type safety end-to-end. Each action validates input with Zod before touching the database.

**Prisma with two connection URLs.** Vercel's serverless environment requires a connection pooler (`DATABASE_URL`) for runtime queries. Prisma migrations require a direct connection (`DIRECT_URL`). Both are configured in `prisma.config.ts`.

**Rules the database enforces, not just the code.** Fixed choices like a task's status or a participant's role are Postgres enums, and a habit can have one log per day through a unique index. Zod still checks input at the edge, but a bug or a race between two requests can't store a value outside the set or a second log for the same day.

**Sign-in limits kept in Postgres.** Serverless functions share no memory, so failed sign-ins are counted in a table: 5 per account per IP address and 20 per address, over 15 minutes. Keying an account by address too means nobody can lock someone else out, including the shared demo account. Keys are stored as hashes.

**`force-dynamic` on data pages.** Pages that read from the database are marked `force-dynamic` to prevent Next.js from caching stale data between requests.

---

## Features

- **Today:** the home page. Today's plan grouped by schedule block, urgent and due-soon tasks, habit check-ins, and this week's competitions.
- **Tasks:** priorities, due dates, links to goals, and undo after a delete.
- **Goals:** target values, progress entries, and steps (tasks linked to the goal).
- **Habits:** weekly targets, a 12-week heatmap, streaks, and pausing.
- **Schedule:** a calendar of repeating time blocks with drag and drop, and edits to one occurrence or the whole series.
- **Competitions:** weekly targets across several metrics, seasons up to three years long, and logging.
- **Friends:** friend requests by email, and invites to competitions by email or link.

---

## Testing and CI

```bash
npm test            # Vitest: about 580 tests
npm run typecheck   # tsc --noEmit
npm run lint
```

Server actions and library code are tested against a mocked Prisma client (`vitest-mock-extended`), and components render in jsdom with Testing Library. GitHub Actions runs lint, typecheck and the tests on every pull request and every push to `main`, and `main` only accepts changes through a pull request that passes them.

## Monitoring

A Vercel cron (`/api/cron/reseed-demo`, 05:00 UTC) resets the demo account every night. It reports success or failure to [Pulse](https://github.com/Matt4228/pulse), which alerts in Slack if the reseed fails or hasn't checked in by 06:30 UTC. Pulse also checks that the site is up. Set `PULSE_URL` and `PULSE_KEY` to turn reporting on; without them nothing is sent.

---

## Local development

```bash
# Install dependencies
npm install

# Environment: copy the example and fill in your DEVELOPMENT database URLs
cp .env.example .env.local

# Create the schema in the dev database, then add the demo account
npx prisma migrate deploy
npm run seed

# Start dev server
npm run dev
```
## Database environments

| | Development | Production |
|---|---|---|
| Database | Separate Supabase project | Production Supabase project |
| Connection strings | `.env.local` | Vercel environment variables, plus a local `.env.prod` used only by the scripts below |
| Schema changes | `npx prisma migrate dev --name <change>`, then `npx prisma generate` (Prisma 7 no longer generates on migrate) | `npm run db:status:prod`, then `npm run db:migrate:prod` (runs `prisma migrate deploy`) |

After pulling changes that touch `prisma/schema.prisma`, run `npx prisma generate`, or TypeScript will report missing models and enums.

---

## Database schema

16 tables and 9 enums, defined in `prisma/schema.prisma`. The core records are `User`, `Task`, `Goal`, `Habit` and `ScheduleBlock`. Competitions are spread across `Competition`, `CompetitionMetric`, `WeekTarget`, `Participant`, `ProgressLog` and `CompetitionInvite`, and `Friendship` connects users. Every user-owned record carries its owner's id, and server actions scope their queries to the signed-in user.

---

## Roadmap

- A multiplayer competition page: leaderboard, podium and a lane per person
- Mobile app
- Data export
- Analytics and trend charts