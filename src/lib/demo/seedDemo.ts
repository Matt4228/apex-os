// src/lib/demo/seedDemo.ts
// Relative imports keep this file runnable outside Next.js: `npm run seed` runs it with tsx
import type { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { parseDateOnly, toDateInputValue, todayIn } from "../dates"
import { occurrences } from "../occurrences"

export const DEMO_EMAIL = "demo@apex-os.app"
export const DEMO_PASSWORD = "superP@ssword"
/** The demo's "today" follows US Eastern time, so its plan is current for US visitors all day */
export const DEMO_TIMEZONE = "America/New_York"

const DAY_MS = 24 * 60 * 60 * 1000
const HISTORY_DAYS = 120

type SeedBlock = {
    label: string
    category: string
    startTime: string
    endTime: string
    startDate: Date
    repeat: string
    repeatDays: number[]
    endsAfter?: number
}

type SeedChange = { label: string; date: Date; cancelled?: boolean; startTime?: string; endTime?: string }

const WEEKDAYS = [1, 2, 3, 4, 5]

/**
 * The demo's calendar, relative to its today: a repeating core that began eight weeks ago, a monthly review, a course
 * that ends, one-off events and a few changed days, so every week a visitor clicks to looks a little different
 */
function demoSchedule(day: (offset: number) => Date, weekday: number) {
    // Days from today to the Sunday that starts a week: 0 is this week, -1 last week, 1 next week
    const sunday = (week: number) => -weekday + week * 7
    const began = day(sunday(-8))
    const repeating = (label: string, category: string, startTime: string, endTime: string, repeat: string, repeatDays: number[] = []) =>
        ({ label, category, startTime, endTime, startDate: began, repeat, repeatDays })
    const once = (label: string, category: string, startTime: string, endTime: string, offset: number) =>
        ({ label, category, startTime, endTime, startDate: day(offset), repeat: "none", repeatDays: [] })
    const today = day(0)

    const blocks: SeedBlock[] = [
        repeating("Morning run", "Fitness", "06:00", "07:00", "weekly", WEEKDAYS),
        repeating("Breakfast and planning", "Personal", "07:00", "08:00", "weekday"),
        repeating("Deep work: product engineering", "Work", "09:00", "12:00", "weekday"),
        repeating("Lunch and walk", "Personal", "12:00", "13:00", "weekday"),
        repeating("Meetings and collaborative work", "Work", "13:00", "17:00", "weekday"),
        repeating("Job search: applications and outreach", "Career", "17:00", "18:00", "weekday"),
        repeating("Technical study block", "Career", "19:00", "21:00", "weekly", [1, 3, 5]),
        repeating("Long run", "Fitness", "08:00", "10:00", "weekly", [6]),
        repeating("LeetCode practice", "Career", "10:00", "12:00", "weekly", [6]),
        repeating("Side project work", "Career", "13:00", "16:00", "weekly", [0, 6]),
        repeating("Free time", "Personal", "16:00", "18:00", "weekly", [6]),
        repeating("Weekly review and planning", "Personal", "09:00", "10:00", "weekly", [0]),
        repeating("System design study", "Career", "10:00", "12:00", "weekly", [0]),
        repeating("Meal prep", "Personal", "16:00", "18:00", "weekly", [0]),
        // On the 1st of every month, since three months ago
        {
            label: "Budget review", category: "Finance", startTime: "18:00", endTime: "18:30", repeat: "monthly", repeatDays: [],
            startDate: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 3, 1)),
        },
        // Tuesdays and Thursdays from two weeks ago; the sixth class is this Thursday
        {
            label: "Postgres course", category: "Learning", startTime: "19:00", endTime: "20:30", repeat: "weekly",
            repeatDays: [2, 4], startDate: day(sunday(-2) + 2), endsAfter: 6,
        },
        once("Dentist", "Health", "14:00", "15:00", sunday(0) + 4),
        once("Onsite interview", "Career", "10:00", "15:00", sunday(1) + 3),
        once("Conference", "Learning", "09:00", "17:00", sunday(2) + 4),
    ]

    const changes: SeedChange[] = [
        // Last week's Friday was a holiday
        { label: "Meetings and collaborative work", date: day(sunday(-1) + 5), cancelled: true },
        { label: "Lunch and walk", date: day(sunday(0) + 3), startTime: "12:30", endTime: "13:30" },
        { label: "Deep work: product engineering", date: day(sunday(1) + 1), endTime: "11:00" },
    ]

    return { blocks, changes }
}

// Each habit's history follows a fixed pattern (dow: 0 is Sunday; n: days ago), so every reseed tells the same story
const HABITS = [
    { title: "Run or workout", category: "Fitness", frequency: "daily", targetPerWeek: 5, doneToday: true,
    didIt: (dow: number, n: number) => dow !== 0 && n % 6 !== 0 },
    { title: "LeetCode problems", category: "Career", frequency: "daily", targetPerWeek: 6, doneToday: false,
    didIt: (_dow: number, n: number) => n % 5 !== 0 },
    { title: "Read technical content", category: "Learning", frequency: "daily", targetPerWeek: 7, doneToday: true,
    didIt: (_dow: number, n: number) => n % 9 !== 0 },
    { title: "Side project work", category: "Career", frequency: "weekly", targetPerWeek: 3, doneToday: false,
    didIt: (dow: number) => dow === 0 || dow === 3 || dow === 6 },
    { title: "No phone first hour of the day", category: "Wellness", frequency: "daily", targetPerWeek: 7, doneToday:
true,
    didIt: (_dow: number, n: number) => n % 4 !== 0 },
    { title: "System design study", category: "Career", frequency: "weekly", targetPerWeek: 2, doneToday: false,
    didIt: (dow: number) => dow === 0 || dow === 6 },
]

const BOOKS = [
    "Finished Designing Data-Intensive Applications",
    "Finished The Pragmatic Programmer",
    "Finished A Philosophy of Software Design",
    "Finished Database Internals",
    "Finished System Design Interview, volume 1",
    "Finished Staff Engineer",
    "Finished Learning SQL",
]

/**
 * Resets the demo account to a story that shows the top-down flow: goals broken into steps,
 * a weekly schedule, tasks that come from goals, a plan for today and habits in progress
 */
export async function seedDemo(prisma: PrismaClient, now: Date = new Date()) {
    const today = parseDateOnly(todayIn(DEMO_TIMEZONE, now))
    /** A calendar day relative to the demo's today: day(0) is today, day(-1) yesterday */
    const day = (offset: number) => new Date(today.getTime() + offset * DAY_MS)

    const password = await bcrypt.hash(DEMO_PASSWORD, 12)
    const user = await prisma.user.upsert({
        where: { email: DEMO_EMAIL },
        update: { name: "Demo User", password },
        create: { email: DEMO_EMAIL, name: "Demo User", password },
    })
    const userId = user.id

    // Goal, habit and competition children cascade from their parents
    await prisma.$transaction([
        prisma.task.deleteMany({ where: { userId } }),
        prisma.goal.deleteMany({ where: { userId } }),
        prisma.habit.deleteMany({ where: { userId } }),
        prisma.competition.deleteMany({ where: { userId } }),
        prisma.scheduleBlock.deleteMany({ where: { userId } }),
    ])

    // The calendar: blocks first, then the days that were changed, which point at their block
    const schedule = demoSchedule(day, today.getUTCDay())
    const blocks = await prisma.scheduleBlock.createManyAndReturn({ data: schedule.blocks.map(block => ({ ...block, userId })) })
    const idOf = (label: string) => blocks.find(block => block.label === label)!.id
    const changes = schedule.changes.map(({ label, ...change }) => ({ blockId: idOf(label), ...change }))
    await prisma.blockException.createMany({ data: changes })

    // Some of today's plan sits in today's blocks: each task names the blocks it fits, and the first one on today's schedule wins
    const todayText = toDateInputValue(today)
    const exceptions = changes.map(c => ({
        cancelled: false, newDate: null, startTime: null, endTime: null, label: null, category: null, ...c,
    }))
    const todaysBlocks = occurrences(blocks, exceptions, todayText, todayText)
    const blockFor = (...labels: string[]) =>
        labels.map(label => todaysBlocks.find(block => block.label === label)).find(block => block !== undefined)?.blockId ?? null

    // Goals with steps: the top of the flow. Steps are tasks, created with their goal
    await prisma.goal.create({
        data: {
            userId,
            title: "Land a backend engineering role",
            description: "Show backend work in public, then apply steadily.",
            category: "Career",
            status: "active",
            targetDate: day(75),
            tasks: {
                create: [
                    { userId, title: "Update resume with recent projects", status: "done", priority: "high", createdAt: day(-30), completedAt: day(-12) },
                    { userId, title: "Write a README for the portfolio project", status: "done", priority: "medium", createdAt: day(-20), completedAt: day(-5) },
                    { userId, title: "Apply to 10 backend roles", status: "todo", priority: "high", dueDate: day(2), plannedFor: day(0), scheduleBlockId: blockFor("Job search: applications and outreach"), createdAt: day(-14) },
                    { userId, title: "Mock system design interview with a friend", status: "todo", priority: "medium", dueDate: day(9), createdAt: day(-14) },
                    { userId, title: "Ask 3 engineers for referrals", status: "todo", priority: "medium", createdAt: day(-10) },
                ],
            },
        },
    })

    await prisma.goal.create({
        data: {
            userId,
            title: "Ship an open source contribution",
            description: "A merged pull request to a project with 1k+ stars.",
            category: "Career",
            status: "active",
            targetDate: day(40),
            tasks: {
                create: [
                    { userId, title: "Pick a good first issue", status: "done", priority: "medium", createdAt: day(-25), completedAt: day(-20) },
                    { userId, title: "Reproduce the bug locally", status: "done", priority: "medium", createdAt: day(-20), completedAt: day(-9) },
                    { userId, title: "Open the pull request", status: "todo", priority: "high", dueDate: day(-2), createdAt: day(-9) },
                    { userId, title: "Respond to review comments", status: "todo", priority: "medium", createdAt: day(-9) },
                ],
            },
        },
    })

    await prisma.goal.create({
        data: {
            userId,
            title: "Get comfortable with Postgres performance",
            description: "Read query plans and fix a slow query in a real project.",
            category: "Learning",
            status: "active",
            targetDate: day(30),
            tasks: {
                create: [
                    { userId, title: "Read the Postgres docs on EXPLAIN", status: "done", priority: "medium", createdAt: day(-15), completedAt: day(-7) },
                    { userId, title: "Add an index to a slow side project query", status: "todo", priority: "medium", dueDate: day(4), createdAt: day(-7) },
                    { userId, title: "Write a short post on what I learned", status: "todo", priority: "low", createdAt: day(-7) },
                ],
            },
        },
    })

    // Numeric goals: progress logged as numbers instead of steps, one of each way they add up
    await prisma.goal.create({
        data: {
            userId,
            title: "Complete 200 LeetCode problems",
            description: "Mostly medium difficulty: arrays, trees, graphs, dynamic programming.",
            category: "Career",
            status: "active",
            targetValue: 200,
            unit: "problems",
            targetDate: day(90),
            entries: {
                create: Array.from({ length: 16 }, (_, i) => ({
                    value: (i + 1) * 8 + [0, 2, -1, 3][i % 4],
                    note: ["Dynamic programming week", "Tree traversal practice", "Graphs were harder than expected", null][i % 4],
                    loggedOn: day(-(15 - i) * 7),
                })),
            },
        },
    })

    await prisma.goal.create({
        data: {
            userId,
            title: "Run a half marathon",
            description: "Build up to 21.1 km before race day.",
            category: "Fitness",
            status: "active",
            targetValue: 21.1,
            unit: "km",
            tracking: "best",
            targetDate: day(60),
            entries: {
                create: Array.from({ length: 16 }, (_, i) => ({
                    value: Math.round((8 + i * 0.8 - (i === 7 ? 2 : 0)) * 10) / 10,
                    note: i === 7 ? "Eased off for a sore knee" : i === 15 ? "Longest run yet" : null,
                    loggedOn: day(-(15 - i) * 7),
                })),
            },
        },
    })

    await prisma.goal.create({
        data: {
            userId,
            title: "Read 12 technical books this year",
            category: "Learning",
            status: "active",
            targetValue: 12,
            unit: "books",
            tracking: "total",
            targetDate: day(80),
            entries: {
                create: BOOKS.map((note, i) => ({ value: 1, note, loggedOn: day(-(6 - i) * 18) })),
            },
        },
    })

    await prisma.goal.create({
        data: {
            userId,
            title: "Earn the AWS Solutions Architect Associate certification",
            category: "Career",
            status: "complete",
            targetValue: 1,
            unit: "certification",
            targetDate: day(-30),
            entries: { create: [{ value: 1, note: "Passed the exam", loggedOn: day(-30) }] },
        },
    })

    // Habits with 4 months of history; today is partly checked off
    for (const habit of HABITS) {
        const history = Array.from({ length: HISTORY_DAYS }, (_, i) => i + 1)
            .filter(n => habit.didIt(day(-n).getUTCDay(), n))
            .map(n => ({ completedOn: day(-n) }))

        await prisma.habit.create({
            data: {
                userId,
                title: habit.title,
                category: habit.category,
                frequency: habit.frequency,
                targetPerWeek: habit.targetPerWeek,
                isActive: true,
                logs: { create: habit.doneToday ? [{ completedOn: day(0) }, ...history] : history },
            },
        })
    }

    // Tasks outside any goal: today's plan, an unfinished task from yesterday, urgent ones, and history
    await prisma.task.createMany({
        data: [
            { title: "Email the recruiter back about the phone screen", status: "todo", priority: "high", dueDate: day(1), plannedFor: day(0), scheduleBlockId: blockFor("Job search: applications and outreach", "Weekly review and planning"), createdAt: day(-1) },
              { title: "Prep questions for Thursday's coffee chat", status: "todo", priority: "medium", plannedFor: day(0), scheduleBlockId: blockFor("Breakfast and planning", "Weekly review and planning"), createdAt: day(-3) },
              { title: "Solve 3 LeetCode graph problems", status: "done", priority: "medium", plannedFor: day(0), scheduleBlockId: blockFor("Technical study block", "LeetCode practice"), createdAt: day(-1), completedAt: now },
            { title: "Read chapter 8 of Designing Data-Intensive Applications", status: "done", priority: "low", plannedFor: day(0), createdAt: day(-2), completedAt: now },
            { title: "Draft the portfolio demo script", status: "todo", priority: "medium", plannedFor: day(-1), createdAt: day(-4) },
            { title: "Pay rent", status: "todo", priority: "high", dueDate: day(0), createdAt: day(-6) },
            { title: "Renew car registration", status: "todo", priority: "low", dueDate: day(12), createdAt: day(-8) },
            { title: "Set up error monitoring for the side project", status: "todo", priority: "low", createdAt: day(-10) },
            { title: "Clean up GitHub profile README", status: "done", priority: "low", createdAt: day(-6), completedAt: day(-3) },
            { title: "Submit expense report", status: "done", priority: "medium", createdAt: day(-5), completedAt: day(-2) },
            { title: "Refactor auth module to use the repository pattern", status: "done", priority: "high", createdAt: day(-12), completedAt: day(-6) },
        ].map(task => ({ ...task, userId })),
    })

    await prisma.competition.create({
        data: {
            userId,
            title: "2026 Technical Growth Challenge",
            rulesJson: JSON.stringify({
                criteria: ["Complete 6+ LeetCode problems", "Log 1+ system design session", "Work on side project 2+ hours", "Read technical content 5+ days"],
                scoring: "25 points per criterion met per week",
                reward: "Winner picks the restaurant for team lunch",
            }),
            startDate: day(-112),
            endDate: day(60),
            status: "active",
            entries: {
                create: Array.from({ length: 16 }, (_, i) => ({
                    weekNumber: i + 1,
                    value: i < 3 ? 60 + i * 10 : 80 + ((i * 7) % 21),
                    metric: "weekly score",
                    weekComplete: i >= 3 && i % 5 !== 0,
                })),
            },
        },
    })
}