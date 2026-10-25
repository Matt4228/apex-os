// src/lib/demo/seedDemo.ts
// Relative imports keep this file runnable outside Next.js: `npm run seed` runs it with tsx
import type { HabitFrequency, Prisma, PrismaClient, Repeat } from "@prisma/client"
import bcrypt from "bcryptjs"
import { parseDateOnly, toDateInputValue, todayIn } from "../dates"
import { rampTargets } from "../competition"
import { newJoinCode } from "../joinCode"
import { occurrences } from "../occurrences"

export const DEMO_EMAIL = "demo@apex-os.app"
export const DEMO_PASSWORD = "superP@ssword"

/**
 * The demo's rivals: real accounts with the demo password, so every side of a competition can be tried by signing in
 * as them. Jordan only exists to have sent the demo a friend request
 */
export const RIVALS = [
    { key: "alex", email: "alex@apex-os.app", name: "Alex R." },
    { key: "sam", email: "sam@apex-os.app", name: "Sam C." },
    { key: "jordan", email: "jordan@apex-os.app", name: "Jordan P." },
] as const
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
    repeat: Repeat
    repeatDays: number[]
    endsAfter?: number
}

type SeedHabit = {
    title: string
    category: string
    frequency: HabitFrequency
    targetPerWeek: number
    doneToday: boolean
    didIt: (dow: number, n: number) => boolean
}

type SeedChange = { label: string; date: Date; cancelled?: boolean; startTime?: string; endTime?: string }

type SeedLog = { week: number; amount: number; at: Date; note?: string }
type RivalKey = (typeof RIVALS)[number]["key"]
/** A rival in one of the demo's competitions. `logs[i]` goes with `metrics[i]`; `joinedAt` is set for a late joiner */
type SeedRival = { key: RivalKey; joinedAt?: Date; logs: SeedLog[][] }
type SeedCompetition = {
    title: string
    category: string
    startDate: Date
    weeks: number
    metrics: { name: string; unit: string | null; targets: number[]; logs: SeedLog[] }[]
    rivals?: SeedRival[]
}

/**
 * The demo's competitions, relative to its today. Logs in the current week only reach today, so the week fills in
 * as the real week goes by. `logs` lists [week, weekday, amount]: Sunday is 0
 */
function demoCompetitions(day: (offset: number) => Date, weekday: number): SeedCompetition[] {
    const sunday = (week: number) => -weekday + week * 7
    const yearTargets = rampTargets(15, 40, 52)
    // A log at 7 in the evening of a weekday in a competition week; the current week keeps only days up to today
    const logs = (startWeek: number, entries: [number, number, number, string?][], currentWeek?: number) =>
        entries
            .filter(([week, dow]) => week !== currentWeek || dow <= weekday)
            .map(([week, dow, amount, note]) => ({
                week,
                amount,
                note,
                at: new Date(day(sunday(startWeek + week - 1) + dow).getTime() + 19 * 60 * 60 * 1000),
            }))

    return [
        {
            title: "October Run Club",
            category: "Fitness",
            startDate: day(sunday(-3)),
            weeks: 8,
            metrics: [
                {
                    name: "km run",
                    unit: "km",
                    targets: [15, 18, 20, 22, 24, 26, 28, 30],
                    logs: logs(-3, [
                        [1, 1, 5], [1, 3, 4], [1, 6, 6.5, "Long run by the river"],
                        [2, 1, 6], [2, 3, 5], [2, 6, 8],
                        [3, 1, 7], [3, 3, 6], [3, 6, 8.5, "New best pace"],
                        [4, 1, 5.2], [4, 3, 4.5], [4, 5, 6],
                    ], 4),
                },
                {
                    name: "Workouts",
                    unit: null,
                    targets: [3, 3, 4, 4, 4, 5, 5, 5],
                    logs: logs(-3, [
                        [1, 2, 1], [1, 4, 1], [1, 5, 1],
                        [2, 2, 1], [2, 4, 1], [2, 5, 1],
                        [3, 1, 1], [3, 2, 1], [3, 4, 1], [3, 5, 1],
                        [4, 1, 1], [4, 3, 1],
                    ], 4),
                },
            ],
            // Sam has every week with room to spare, so leads on the tie-break; Alex missed week 2 but leads this week
            rivals: [
                {
                    key: "alex",
                    logs: [
                        logs(-3, [
                            [1, 1, 6], [1, 4, 5], [1, 6, 5],
                            [2, 2, 5, "Sick most of the week"], [2, 6, 7],
                            [3, 1, 8], [3, 3, 7], [3, 5, 7],
                            [4, 1, 8], [4, 2, 7, "Legs were dead"], [4, 4, 6],
                        ], 4),
                        logs(-3, [
                            [1, 2, 1], [1, 3, 1], [1, 5, 1],
                            [2, 3, 1], [2, 5, 1],
                            [3, 2, 1], [3, 3, 1], [3, 4, 1], [3, 6, 1],
                            [4, 1, 1], [4, 2, 1], [4, 3, 1], [4, 4, 1],
                        ], 4),
                    ],
                },
                {
                    key: "sam",
                    logs: [
                        logs(-3, [
                            [1, 1, 6], [1, 3, 6], [1, 6, 6],
                            [2, 1, 7], [2, 3, 7], [2, 6, 7],
                            [3, 2, 8, "Hill repeats"], [3, 4, 8], [3, 6, 8],
                            [4, 1, 6, "Rest day tomorrow"],
                        ], 4),
                        logs(-3, [
                            [1, 2, 1], [1, 4, 1], [1, 5, 1],
                            [2, 2, 1], [2, 3, 1], [2, 4, 1], [2, 5, 1],
                            [3, 1, 1], [3, 3, 1], [3, 5, 1], [3, 6, 1],
                            [4, 2, 1],
                        ], 4),
                    ],
                },
            ],
        },
        {
            title: "LeetCode Sprint",
            category: "Career",
            startDate: day(sunday(-1)),
            weeks: 4,
            metrics: [
                {
                    name: "Problems solved",
                    unit: null,
                    targets: [10, 10, 10, 10],
                    logs: logs(-1, [[1, 1, 3], [1, 3, 4, "Graphs"], [1, 5, 4], [2, 1, 2], [2, 2, 3]], 2),
                },
            ],
            rivals: [{ key: "alex", logs: [logs(-1, [[1, 2, 4], [1, 4, 3], [1, 6, 4], [2, 1, 4, "Two mediums and a hard one"]], 2)] }],
        },
        {
            // A year-long one, about 20 weeks in, with targets that ramp up: shows how long seasons look
            title: "Year of Running",
            category: "Fitness",
            startDate: day(sunday(-19)),
            weeks: 52,
            metrics: [
                {
                    name: "km run",
                    unit: "km",
                    targets: yearTargets,
                    logs: logs(-19, Array.from({ length: 20 }, (_, i) => i + 1).flatMap(week => {
                        // Weeks 6, 12, 13 and 17 fell short; this week has two runs in so far
                        const target = yearTargets[week - 1]
                        const share = [6, 12, 13, 17].includes(week) ? 0.6 : week === 20 ? 0.45 : 1.05
                        const total = Math.round(target * share * 10) / 10
                        const runs: [number, number, number][] = [[week, 1, Math.round(total * 0.3 * 10) / 10], [week, 3, Math.round(total * 0.3 * 10) / 10]]
                        if (week !== 20) runs.push([week, 6, Math.round((total - 2 * Math.round(total * 0.3 * 10) / 10) * 10) / 10])
                        return runs
                    }), 20),
                },
            ],
            // Sam joined in week 3, so weeks 1 and 2 count as missed, and has run a little past every target since
            rivals: [
                {
                    key: "sam",
                    joinedAt: day(sunday(-19 + 2)),
                    logs: [logs(-19, Array.from({ length: 18 }, (_, i) => i + 3).flatMap(week => {
                        const total = Math.round(yearTargets[week - 1] * (week === 20 ? 0.5 : 1.1) * 10) / 10
                        const half = Math.round((total / 2) * 10) / 10
                        const runs: [number, number, number, string?][] = [[week, 2, half, week === 3 ? "First week in, catching up" : undefined]]
                        runs.push([week, 5, Math.round((total - half) * 10) / 10])
                        return runs
                    }), 20)],
                },
            ],
        },
        {
            title: "Summer Reading",
            category: "Learning",
            startDate: day(sunday(-11)),
            weeks: 6,
            metrics: [
                {
                    name: "Pages read",
                    unit: "pages",
                    targets: [150, 150, 150, 150, 150, 150],
                    logs: logs(-11, [
                        [1, 2, 80], [1, 5, 80], [2, 2, 75], [2, 6, 80], [3, 3, 90, "Busy week"],
                        [4, 1, 90], [4, 4, 80], [5, 2, 70], [5, 5, 80], [6, 1, 100], [6, 4, 80],
                    ]),
                },
            ],
            // The demo finished 1st on 5 weeks; Alex had 4, Sam 3. One of the past results the list shows a medal for
            rivals: [
                {
                    key: "alex",
                    logs: [logs(-11, [
                        [1, 1, 90], [1, 4, 70], [2, 2, 80], [2, 5, 75], [3, 1, 100], [3, 4, 60],
                        [4, 3, 60, "Vacation, barely read"], [5, 2, 90], [5, 6, 70], [6, 3, 110],
                    ])],
                },
                {
                    key: "sam",
                    logs: [logs(-11, [
                        [1, 3, 150], [2, 1, 60], [2, 4, 50], [3, 2, 155], [4, 1, 80], [4, 5, 80],
                        [5, 3, 90], [6, 2, 70], [6, 6, 40, "Too many deadlines"],
                    ])],
                },
            ],
        },
        {
            // Finished 2nd: 3 weeks to Sam's 4
            title: "Couch to 10K",
            category: "Fitness",
            startDate: day(sunday(-16)),
            weeks: 4,
            metrics: [
                {
                    name: "km run",
                    unit: "km",
                    targets: [12, 15, 18, 21],
                    logs: logs(-16, [
                        [1, 1, 4], [1, 3, 4], [1, 6, 5], [2, 1, 5], [2, 3, 5], [2, 6, 5],
                        [3, 1, 5], [3, 4, 4, "Shin splints, took it easy"], [3, 6, 5], [4, 1, 7], [4, 3, 7], [4, 6, 8, "First 10K!"],
                    ]),
                },
            ],
            rivals: [
                { key: "alex", logs: [logs(-16, [[1, 2, 6], [1, 5, 6], [2, 3, 7], [3, 1, 9], [3, 4, 9], [4, 2, 8], [4, 5, 6]])] },
                {
                    key: "sam",
                    logs: [logs(-16, [[1, 2, 6], [1, 5, 7], [2, 2, 8], [2, 5, 8], [3, 2, 9], [3, 5, 10], [4, 2, 10], [4, 6, 11.5, "Sub-60 10K"]])],
                },
            ],
        },
        {
            // Finished 3rd: 1 week, behind Alex's 3 and Sam's 2
            title: "Deep Work Hours",
            category: "Career",
            startDate: day(sunday(-9)),
            weeks: 3,
            metrics: [
                {
                    name: "Focused hours",
                    unit: "hours",
                    targets: [10, 10, 10],
                    logs: logs(-9, [[1, 1, 4], [1, 3, 4], [1, 5, 3], [2, 2, 3], [2, 4, 3, "Interview prep ate the week"], [3, 1, 4], [3, 3, 4]]),
                },
            ],
            rivals: [
                { key: "alex", logs: [logs(-9, [[1, 1, 5], [1, 4, 6], [2, 2, 5], [2, 5, 5], [3, 1, 6], [3, 3, 5, "Shipped the refactor"]])] },
                { key: "sam", logs: [logs(-9, [[1, 2, 6], [1, 5, 5], [2, 1, 4], [2, 3, 3], [3, 2, 5], [3, 4, 6]])] },
            ],
        },
        {
            // Done alone, so its card gets the solo mark instead of a place
            title: "Spanish Lessons",
            category: "Learning",
            startDate: day(sunday(-6)),
            weeks: 4,
            metrics: [
                {
                    name: "Lessons",
                    unit: null,
                    targets: [5, 5, 5, 5],
                    logs: logs(-6, [
                        [1, 1, 2], [1, 3, 2], [1, 5, 1], [2, 1, 2], [2, 2, 2], [2, 4, 2],
                        [3, 1, 2], [3, 3, 2], [3, 6, 1, "Finally ordered coffee in Spanish"], [4, 2, 2], [4, 4, 1],
                    ]),
                },
            ],
        },
    ]
}

const WEEKDAYS = [1, 2, 3, 4, 5]

/**
 * The demo's calendar, relative to its today: a repeating core that began eight weeks ago, a monthly review, a course
 * that ends, one-off events and a few changed days, so every week a visitor clicks to looks a little different
 */
function demoSchedule(day: (offset: number) => Date, weekday: number) {
    // Days from today to the Sunday that starts a week: 0 is this week, -1 last week, 1 next week
    const sunday = (week: number) => -weekday + week * 7
    const began = day(sunday(-8))
    const repeating = (label: string, category: string, startTime: string, endTime: string, repeat: Repeat, repeatDays: number[] = []) =>
        ({ label, category, startTime, endTime, startDate: began, repeat, repeatDays })
    const once = (label: string, category: string, startTime: string, endTime: string, offset: number) =>
        ({ label, category, startTime, endTime, startDate: day(offset), repeat: "none" as const, repeatDays: [] })
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
const HABITS: SeedHabit[] = [
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

    // The rivals, reset along with the demo: same password, friendships rebuilt from scratch
    const rivals = Object.fromEntries(
        await Promise.all(
            RIVALS.map(async r => {
                const rival = await prisma.user.upsert({
                    where: { email: r.email },
                    update: { name: r.name, password },
                    create: { email: r.email, name: r.name, password },
                })
                return [r.key, rival.id] as const
            }),
        ),
    ) as Record<(typeof RIVALS)[number]["key"], string>
    const everyone = [userId, ...Object.values(rivals)]
    // The rivals' own competitions go too; the demo's are cleared below with the rest of its data
    await prisma.competition.deleteMany({ where: { ownerId: { in: Object.values(rivals) } } })
    await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: { in: everyone } }, { addresseeId: { in: everyone } }] } })
    await prisma.friendship.createMany({
        data: [
            { requesterId: userId, addresseeId: rivals.alex, status: "accepted" },
            { requesterId: rivals.sam, addresseeId: userId, status: "accepted" },
            { requesterId: rivals.jordan, addresseeId: userId, status: "pending" },
        ],
    })

    // Goal, habit and competition children cascade from their parents
    await prisma.$transaction([
        prisma.task.deleteMany({ where: { userId } }),
        prisma.goal.deleteMany({ where: { userId } }),
        prisma.habit.deleteMany({ where: { userId } }),
        prisma.competition.deleteMany({ where: { ownerId: userId } }),
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

    // Sam's push-up challenge started this Sunday, and Sam has invited the demo: an invite waiting for an answer
    await prisma.competition.create({
        data: {
            ownerId: rivals.sam,
            title: "Push-up Challenge",
            category: "Fitness",
            startDate: day(-today.getUTCDay()),
            weeks: 6,
            joinCode: newJoinCode(),
            participants: { create: { userId: rivals.sam, role: "owner" } },
            metrics: {
                create: [{
                    name: "Push-ups",
                    unit: null,
                    sortOrder: 0,
                    targets: { create: [100, 120, 140, 160, 180, 200].map((target, i) => ({ week: i + 1, target })) },
                }],
            },
            invites: { create: { inviterId: rivals.sam, inviteeId: userId } },
        },
    })

    // Tasks outside any goal: today's plan, an unfinished task from yesterday, urgent ones, and history
    await prisma.task.createMany({
        data: ([
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
        ] satisfies Omit<Prisma.TaskCreateManyInput, "userId">[]).map(task => ({ ...task, userId })),
    })

    // Competitions: one in its fourth week, one just started, one finished with a missed week
    for (const competition of demoCompetitions(day, today.getUTCDay())) {
        const rivalsIn = competition.rivals ?? []
        const created = await prisma.competition.create({
            data: {
                ownerId: userId,
                title: competition.title,
                category: competition.category,
                startDate: competition.startDate,
                weeks: competition.weeks,
                joinCode: newJoinCode(),
                participants: {
                    create: [
                        { userId, role: "owner" },
                        ...rivalsIn.map(r => ({ userId: rivals[r.key], role: "member" as const, ...(r.joinedAt && { joinedAt: r.joinedAt }) })),
                    ],
                },
                metrics: {
                    create: competition.metrics.map((metric, i) => ({
                        name: metric.name,
                        unit: metric.unit,
                        sortOrder: i,
                        targets: { create: metric.targets.map((target, w) => ({ week: w + 1, target })) },
                    })),
                },
            },
            include: { participants: true, metrics: true },
        })
        const participantOf = (id: string) => created.participants.find(p => p.userId === id)!.id
        const metricAt = (i: number) => created.metrics.find(m => m.sortOrder === i)!.id
        const rows = (participantId: string, logs: SeedLog[], i: number) =>
            logs.map(log => ({ participantId, metricId: metricAt(i), week: log.week, amount: log.amount, note: log.note ?? null, createdAt: log.at }))
        await prisma.progressLog.createMany({
            data: [
                ...competition.metrics.flatMap((metric, i) => rows(participantOf(userId), metric.logs, i)),
                ...rivalsIn.flatMap(r => r.logs.flatMap((logs, i) => rows(participantOf(rivals[r.key]), logs, i))),
            ],
        })
    }
}