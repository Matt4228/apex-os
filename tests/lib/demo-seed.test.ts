// tests/lib/demo-seed.test.ts
import { seedDemo } from "@/lib/demo/seedDemo"
import { parseDateOnly } from "@/lib/dates"
import { occurrences, weekDates, type Exception, type SeriesBlock } from "@/lib/occurrences"
import { rank, season, weekOf, weekProgress } from "@/lib/competition"
import type { PrismaClient } from "@prisma/client"
import { beforeEach, describe, expect, it } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

// Noon in New York on Sunday, October 11, 2026
const NOON_NY = new Date("2026-10-11T16:00:00Z")

type SeedTask = { title: string; status: string; dueDate?: Date | null; plannedFor?: Date | null; scheduleBlockId?: string | null }

const run = (now = NOON_NY) => seedDemo(prismaMock as unknown as PrismaClient, now)

function seededTasks(): SeedTask[] {
    const steps = prismaMock.goal.create.mock.calls.flatMap(
        ([args]) => ((args.data.tasks as unknown as { create?: SeedTask[] } | undefined)?.create ?? [])
    )
    const standalone = prismaMock.task.createMany.mock.calls.flatMap(([args]) => (args?.data ?? []) as unknown as SeedTask[])
    return [...steps, ...standalone]
}

const sameDay = (a: Date | null | undefined, day: string) => a?.getTime() === parseDateOnly(day).getTime()


// The mock hands back each block with a predictable id, the way the database returns created rows
function returnBlocksWithIds() {
    prismaMock.scheduleBlock.createManyAndReturn.mockImplementation((async (args: { data: object[] }) =>
        args.data.map((block, i) => ({ ...block, id: `block-${i}` }))) as never)
}

function seededBlocks(): SeriesBlock[] {
    const [args] = prismaMock.scheduleBlock.createManyAndReturn.mock.calls[0]
    // The seed leaves endsOn and endsAfter out unless it sets them; the database fills in null
    return (args?.data as unknown as Partial<SeriesBlock>[]).map((block, i) => ({
        ...block,
        endsOn: block.endsOn ?? null,
        endsAfter: block.endsAfter ?? null,
        id: `block-${i}`,
    }) as SeriesBlock)
}

function seededChanges(): Exception[] {
    const [args] = prismaMock.blockException.createMany.mock.calls[0]
    return (args?.data as unknown as Partial<Exception>[]).map(change => ({
        cancelled: false, newDate: null, startTime: null, endTime: null, label: null, category: null, ...change,
    })) as Exception[]
}

/** What the calendar shows on these days, as "date label start-end" lines */
const calendar = (from: string, to: string) =>
    occurrences(seededBlocks(), seededChanges(), from, to).map(o => `${o.date.slice(5)} ${o.label} ${o.startTime}-${o.endTime}`)

type SeedParticipant = { userId: string; role: string; joinedAt?: Date }
type SeedCompetition = {
    title: string
    startDate: Date
    weeks: number
    participants: { create: SeedParticipant | SeedParticipant[] }
    metrics: { create: { name: string; unit: string | null; targets: { create: { week: number; target: number }[] } }[] }
}
type SeedLogRow = { participantId: string; metricId: string; week: number; amount: number; note: string | null }

const participantsOf = (c: SeedCompetition) => [c.participants.create].flat()

// Like the database: a created competition comes back with its participant and metric ids ("Run Club-alex")
function returnCompetitionsWithIds() {
    prismaMock.competition.create.mockImplementation((async (args: { data: SeedCompetition }) => ({
        id: args.data.title,
        participants: participantsOf(args.data).map(p => ({ id: `${args.data.title}-${p.userId}`, userId: p.userId })),
        metrics: args.data.metrics.create.map((_, i) => ({ id: `${args.data.title}-m${i}`, sortOrder: i })),
    })) as never)
}

const seededLogs = () => prismaMock.progressLog.createMany.mock.calls.flatMap(([args]) => (args?.data ?? []) as unknown as SeedLogRow[])

/** Each seeded competition with its targets and logs, scored as the competition page would on that day */
/** The demo's own competitions, in the order they were made (Sam's push-up challenge is left out) */
function seededCompetitions(today: string, who = "demo") {
    const logs = seededLogs()
    const demos = prismaMock.competition.create.mock.calls.filter(([args]) => (args.data as { ownerId: string }).ownerId === "demo")
    return demos.map(([args]) => {
        const c = args.data as unknown as SeedCompetition
        const metrics = c.metrics.create.map((m, i) => ({ id: `${c.title}-m${i}`, name: m.name, unit: m.unit }))
        const targets = c.metrics.create.flatMap((m, i) => m.targets.create.map(t => ({ metricId: `${c.title}-m${i}`, ...t })))
        const mine = logs.filter(l => l.participantId === `${c.title}-${who}`)
        const position = weekOf(c, today)
        return { title: c.title, position, season: season(metrics, targets, mine, c, position) }
    })
}

describe("seedDemo", () => {
    beforeEach(() => {
        // Each account gets its own id, from its email: demo@apex-os.app becomes "demo"
        prismaMock.user.upsert.mockImplementation((async (args: { where: { email: string } }) => ({ id: args.where.email.split("@")[0] })) as never)
        returnBlocksWithIds()
        returnCompetitionsWithIds()
    })

    it("breaks at least two goals into steps", async () => {
        await run()

        const goalsWithSteps = prismaMock.goal.create.mock.calls.filter(
            ([args]) => ((args.data.tasks as unknown as { create?: unknown[] } | undefined)?.create ?? []).length >= 3
        )
        expect(goalsWithSteps.length).toBeGreaterThanOrEqual(2)
    })

    it("plans five tasks for today, two of them already done", async () => {
        await run()

        const planned = seededTasks().filter(t => sameDay(t.plannedFor, "2026-10-11"))
        expect(planned).toHaveLength(5)
        expect(planned.filter(t => t.status === "done")).toHaveLength(2)
    })

    it("uses New York's date late in the evening, when UTC is already tomorrow", async () => {
        await run(new Date("2026-10-12T02:00:00Z"))

        const planned = seededTasks().filter(t => sameDay(t.plannedFor, "2026-10-11"))
        expect(planned).toHaveLength(5)
    })

    it("leaves a task unfinished from yesterday's plan and one overdue", async () => {
        await run()
        const tasks = seededTasks()

        expect(tasks.some(t => t.status === "todo" && sameDay(t.plannedFor, "2026-10-10"))).toBe(true)
        expect(tasks.some(t => t.status === "todo" && !t.plannedFor && t.dueDate && t.dueDate <
            parseDateOnly("2026-10-11"))).toBe(true)
    })

    it("checks some habits off today but not all", async () => {
        await run()

        const doneToday = prismaMock.habit.create.mock.calls.filter(([args]) =>
            ((args.data.logs as unknown as { create: { completedOn: Date }[] }).create).some(l =>
                sameDay(l.completedOn, "2026-10-11"))
        )
        expect(doneToday.length).toBeGreaterThan(0)
        expect(doneToday.length).toBeLessThan(prismaMock.habit.create.mock.calls.length)
    })

    it("creates the same story every run", async () => {
        await run()
        const first = JSON.stringify([prismaMock.goal.create.mock.calls, prismaMock.habit.create.mock.calls,
        prismaMock.task.createMany.mock.calls])
        prismaMock.goal.create.mockClear()
        prismaMock.habit.create.mockClear()
        prismaMock.task.createMany.mockClear()

        await run()
        const second = JSON.stringify([prismaMock.goal.create.mock.calls, prismaMock.habit.create.mock.calls,
        prismaMock.task.createMany.mock.calls])

        expect(second).toBe(first)
    })

    it("has no em dashes in any demo text", async () => {
        await run()

        const text = JSON.stringify([
            prismaMock.scheduleBlock.createManyAndReturn.mock.calls,
            prismaMock.goal.create.mock.calls,
            prismaMock.habit.create.mock.calls,
            prismaMock.task.createMany.mock.calls,
            prismaMock.competition.create.mock.calls,
        ])
        expect(text).not.toContain(String.fromCharCode(0x2014))
    })

    // Monday, October 12 to Sunday, October 18, 2026, each at noon in New York
    const WEEK = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]

    it.each(WEEK)("puts some of the plan for %s into that day's blocks", async date => {
        await run(new Date(`${date}T16:00:00Z`))
        const blocks = seededBlocks()
        const inBlocks = seededTasks().filter(t => t.scheduleBlockId)

        expect(inBlocks.length).toBeGreaterThan(0)
        const onToday = occurrences(blocks, seededChanges(), date, date).map(o => o.blockId)
        for (const task of inBlocks) {
            expect(sameDay(task.plannedFor, date)).toBe(true)
            expect(onToday).toContain(task.scheduleBlockId)
        }
    })

    it("shows a different calendar each week, with something that happens only once", async () => {
        await run()
        const [last, current, next] = ["2026-10-04", "2026-10-11", "2026-10-18"].map(sunday => {
            const days = weekDates(sunday)
            // The same blocks repeat every week; compare the lines without their dates
            return calendar(days[0], days[6]).map(line => line.slice(6)).sort().join("\n")
        })

        expect(new Set([last, current, next]).size).toBe(3)
        expect(calendar("2026-10-11", "2026-10-17")).toContain("10-15 Dentist 14:00-15:00")
        expect(calendar("2026-10-18", "2026-10-24")).toContain("10-21 Onsite interview 10:00-15:00")
    })

    it("changes days that the series really has", async () => {
        await run()

        // Wednesday's lunch moves, last Friday's meetings are cancelled, next Monday's deep work ends early
        expect(calendar("2026-10-14", "2026-10-14")).toContain("10-14 Lunch and walk 12:30-13:30")
        expect(calendar("2026-10-09", "2026-10-09").some(line => line.includes("Meetings"))).toBe(false)
        expect(calendar("2026-10-19", "2026-10-19")).toContain("10-19 Deep work: product engineering 09:00-11:00")
    })

    it("ends the course after six classes", async () => {
        await run()

        const classes = calendar("2026-09-01", "2026-12-31").filter(line => line.includes("Postgres course"))
        expect(classes).toHaveLength(6)
    })

    it("leaves some of today's plan for anytime", async () => {
        await run()

        const anytime = seededTasks().filter(t => sameDay(t.plannedFor, "2026-10-11") && !t.scheduleBlockId)
        expect(anytime.length).toBeGreaterThan(0)
    })

    it("seeds a competition in its fourth week, one just started, a year-long one, and one finished with a missed week", async () => {
        // Tuesday, October 13: the run club's fourth week has started but isn't done
        await run(new Date("2026-10-13T16:00:00Z"))
        const [club, sprint, year, reading] = seededCompetitions("2026-10-13")

        expect(club).toMatchObject({ title: "October Run Club", position: { state: "active", week: 4 } })
        expect(club.season.weeks).toEqual(["complete", "complete", "complete", "current", "ahead", "ahead", "ahead", "ahead"])
        expect(sprint).toMatchObject({ title: "LeetCode Sprint", position: { state: "active", week: 2 } })
        expect(sprint.season.weeks.slice(0, 2)).toEqual(["complete", "current"])
        expect(year).toMatchObject({ title: "Year of Running", position: { state: "active", week: 20 } })
        expect(year.season.weeks).toHaveLength(52)
        expect(year.season.completedWeeks).toBe(15) // 19 finished weeks, 4 of them missed
        expect(reading).toMatchObject({ title: "Summer Reading", position: { state: "finished" } })
        expect(reading.season.completedWeeks).toBe(5)
        expect(reading.season.weeks).toContain("missed")
    })

    it("only logs this week's days up to today", async () => {
        // A Sunday: the run club's week 4 has no runs yet (they're on Monday, Wednesday and Friday)
        await run()
        const club = seededCompetitions("2026-10-11")[0]
        const logs = prismaMock.progressLog.createMany.mock.calls[0][0]!.data as unknown as { week: number }[]

        expect(club.position).toEqual({ state: "active", week: 4 })
        expect(logs.filter(l => l.week === 4)).toHaveLength(0)
    })

    it("resets the rivals with the demo password, and their friendships with the demo", async () => {
        await run()

        const emails = prismaMock.user.upsert.mock.calls.map(([args]) => args.where.email)
        expect(emails).toEqual(["demo@apex-os.app", "alex@apex-os.app", "sam@apex-os.app", "jordan@apex-os.app"])
        const passwords = new Set(prismaMock.user.upsert.mock.calls.map(([args]) => (args.update as { password: string }).password))
        expect(passwords.size).toBe(1)

        expect(prismaMock.friendship.deleteMany).toHaveBeenCalledWith({
            where: { OR: [{ requesterId: { in: ["demo", "alex", "sam", "jordan"] } }, { addresseeId: { in: ["demo", "alex", "sam", "jordan"] } }] },
        })
        expect(prismaMock.friendship.createMany).toHaveBeenCalledWith({
            data: [
                { requesterId: "demo", addresseeId: "alex", status: "accepted" },
                { requesterId: "sam", addresseeId: "demo", status: "accepted" },
                { requesterId: "jordan", addresseeId: "demo", status: "pending" },
            ],
        })
    })

    it("puts Alex and Sam in the shared competitions", async () => {
        await run(new Date("2026-10-14T16:00:00Z"))
        const made = prismaMock.competition.create.mock.calls.map(([args]) => args.data as unknown as SeedCompetition)
        const people = (title: string) => participantsOf(made.find(c => c.title === title)!)

        expect(people("October Run Club").map(p => `${p.userId} ${p.role}`)).toEqual(["demo owner", "alex member", "sam member"])
        expect(people("LeetCode Sprint").map(p => p.userId)).toEqual(["demo", "alex"])
        const year = made.find(c => c.title === "Year of Running")!
        const sam = people("Year of Running").find(p => p.userId === "sam")!
        expect(people("Year of Running").map(p => p.userId)).toEqual(["demo", "sam"])
        // Sam joined in week 3: that week's Sunday, and nothing logged before it
        expect(sam.joinedAt?.getTime()).toBe(year.startDate.getTime() + 14 * 24 * 60 * 60 * 1000)
        expect(seededLogs().filter(l => l.participantId === "Year of Running-sam" && l.week < 3)).toEqual([])
    })

    it("gives Run Club its standings: Sam 1st, the demo 2nd, Alex 3rd and leading this week", async () => {
        // Wednesday, October 14: week 4 of the run club
        await run(new Date("2026-10-14T16:00:00Z"))
        const [demo, alex, sam] = ["demo", "alex", "sam"].map(who => ({ who, ...seededCompetitions("2026-10-14", who)[0] }))
        const places = rank([demo, alex, sam].map(c => ({ who: c.who, ...c.season })))

        expect(places.map(p => `${p.place} ${p.who}`)).toEqual(["1 sam", "2 demo", "3 alex"])
        expect(sam.season.completedWeeks).toBe(3)
        expect(demo.season.completedWeeks).toBe(3)
        expect(alex.season.weeks[1]).toBe("missed")

        // This week's race, each goal counting at most 100%
        const made = prismaMock.competition.create.mock.calls.map(([args]) => args.data as unknown as SeedCompetition)
        const club = made.find(c => c.title === "October Run Club")!
        const metrics = club.metrics.create.map((m, i) => ({ id: `${club.title}-m${i}`, name: m.name, unit: m.unit }))
        const targets = club.metrics.create.flatMap((m, i) => m.targets.create.map(t => ({ metricId: `${club.title}-m${i}`, ...t })))
        const race = (who: string) => {
            const week = weekProgress(metrics, targets, seededLogs().filter(l => l.participantId === `${club.title}-${who}`), 4)
            return week.metrics.reduce((sum, m) => sum + Math.min(m.percent, 100), 0) / week.metrics.length
        }
        expect(race("alex")).toBeGreaterThan(race("demo"))
        expect(race("alex")).toBeGreaterThan(race("sam"))
    })

    it("finishes past competitions in 1st, 2nd and 3rd, and one done alone, so the list shows every medal", async () => {
        await run(new Date("2026-10-13T16:00:00Z"))
        const made = prismaMock.competition.create.mock.calls.map(([args]) => args.data as unknown as SeedCompetition)
        // Everyone in a competition, scored on its finished season, ranked as the list page ranks them
        const finish = (title: string) => {
            const people = participantsOf(made.find(c => c.title === title)!).map(p => p.userId)
            const scored = people.map(who => ({ who, ...seededCompetitions("2026-10-13", who).find(c => c.title === title)! }))
            expect(scored.every(c => c.position.state === "finished")).toBe(true)
            return { people, demoPlace: rank(scored.map(c => ({ who: c.who, ...c.season }))).find(r => r.who === "demo")!.place }
        }

        expect(finish("Summer Reading")).toEqual({ people: ["demo", "alex", "sam"], demoPlace: 1 })
        expect(finish("Couch to 10K")).toEqual({ people: ["demo", "alex", "sam"], demoPlace: 2 })
        expect(finish("Deep Work Hours")).toEqual({ people: ["demo", "alex", "sam"], demoPlace: 3 })
        expect(finish("Spanish Lessons").people).toEqual(["demo"])
    })

    it("gives some rival logs notes", async () => {
        await run(new Date("2026-10-14T16:00:00Z"))

        const rivalNotes = seededLogs().filter(l => /-(alex|sam)$/.test(l.participantId) && l.note)
        expect(rivalNotes.length).toBeGreaterThanOrEqual(3)
    })

    it("gives Sam a push-up challenge from this Sunday, with the demo invited, and every competition a join code", async () => {
        await run(new Date("2026-10-14T16:00:00Z"))
        const made = prismaMock.competition.create.mock.calls.map(([args]) => args.data as { ownerId: string; title: string; startDate: Date; joinCode: string; invites?: unknown })

        const pushUps = made.find(c => c.title === "Push-up Challenge")!
        expect(pushUps).toMatchObject({ ownerId: "sam", invites: { create: { inviterId: "sam", inviteeId: "demo" } } })
        expect(pushUps.startDate.toISOString().slice(0, 10)).toBe("2026-10-11")
        expect(new Set(made.map(c => c.joinCode)).size).toBe(made.length)
        expect(prismaMock.competition.deleteMany).toHaveBeenCalledWith({ where: { ownerId: { in: ["alex", "sam", "jordan"] } } })
    })
})
