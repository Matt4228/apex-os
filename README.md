# Apex OS

A personal growth CRM built for daily use. Track goals, habits, tasks, and competitions in one place with a structured weekly schedule.

**Live:** https://apex-os-sand.vercel.app

---

## Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma 7
- **Auth:** NextAuth.js v5 (JWT, credentials provider)
- **Styling:** Tailwind CSS
- **Drag and drop:** dnd-kit
- **Deployment:** Vercel

---

## Architecture decisions

**`user_id` on every table.** Built single-user for v1 but every record is scoped to a user from day one. Adding a second user requires no schema changes.

**Local state over optimistic UI primitives.** After evaluating `useOptimistic`, the task and habit lists use plain `useState` with fire-and-forget server actions. This avoids the server re-render race condition that causes snap-back on toggle interactions.

**Server actions over a REST API.** Next.js server actions colocate the API layer with the UI, reducing boilerplate while keeping type safety end-to-end. Each action validates input with Zod before touching the database.

**Prisma with two connection URLs.** Vercel's serverless environment requires a connection pooler (`DATABASE_URL`) for runtime queries. Prisma migrations require a direct connection (`DIRECT_URL`). Both are configured in `prisma.config.ts`.

**`force-dynamic` on data pages.** Pages that read from the database are marked `force-dynamic` to prevent Next.js from caching stale data between requests.

---

## Features

- **Dashboard** — daily overview with today's schedule, task count, habit completion rate, goal progress, and active competitions
- **Tasks** — create, complete, and delete tasks with priority levels and due dates
- **Goals** — track goals with target values, log progress entries, and visualize completion with progress bars
- **Habits** — weekly completion grid with progress tracking and streak visibility
- **Schedule** — fully customizable weekly time blocks with drag-to-reorder and color coding
- **Competitions** — structured weekly competitions with logging and completion tracking

---

## Local development

```bash
# Install dependencies
npm install

# Add environment variables
cp .env.example .env.local
# Fill in DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL,
# NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXTAUTH_SECRET, NEXTAUTH_URL

# Push database schema
npx prisma migrate dev

# Start dev server
npm run dev
```

---

## Database schema

Nine tables: `User`, `Task`, `Goal`, `GoalEntry`, `Habit`, `HabitLog`, `ScheduleBlock`, `Competition`, `CompetitionEntry`. All tables include `userId` for multi-user readiness.

---

## Roadmap

- Multi-user support with shared competitions
- Mobile app
- Data export
- Analytics and trend charts