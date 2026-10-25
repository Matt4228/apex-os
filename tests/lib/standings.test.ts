// tests/lib/standings.test.ts
import { weekProgress, type Log, type Position } from "@/lib/competition"
import { raceGaps, raceOrder, raceProgress, standings, type Standing } from "@/lib/standings"
import { describe, expect, it } from "vitest"

// A 4-week club in week 2 with two goals: 10 km and 2 workouts a week
const metrics = [{ id: "km", name: "km run", unit: "km" }, { id: "wo", name: "Workouts", unit: null }]
const targets = [1, 2, 3, 4].flatMap(week => [{ metricId: "km", week, target: 10 }, { metricId: "wo", week, target: 2 }])
const competition = { weeks: 4 }
const active: Position = { state: "active", week: 2 }
const logsOf = (...rows: [string, number, number][]): Log[] => rows.map(([metricId, week, amount]) => ({ metricId, week, amount }))
const person = (participantId: string, name: string, totals: Log[], isYou = false) =>
    ({ participantId, userId: participantId, name, initials: name.slice(0, 2).toUpperCase(), isYou, totals })

describe("raceProgress", () => {
    const week = (km: number, wo: number) => weekProgress(metrics, targets, logsOf(["km", 1, km], ["wo", 1, wo]), 1)

    it("counts each goal at most 100% before averaging", () => {
        expect(raceProgress(week(30, 0))).toBe(50)
        expect(raceProgress(week(10, 2))).toBe(100)
        expect(raceProgress(week(5, 2))).toBe(75)
    })
})

describe("standings", () => {
    const competitors = [
        person("me", "Me Too", logsOf(["km", 1, 10], ["wo", 1, 2], ["km", 2, 5]), true),
        person("sam", "Sam Chen", logsOf(["km", 1, 12], ["wo", 1, 2], ["km", 2, 4])),
        person("alex", "Alex Rivera", logsOf(["km", 1, 4], ["km", 2, 10], ["wo", 2, 2])),
    ]

    it("scores everyone and puts them in season order", () => {
        const rows = standings({ metrics, targets, competitors, myLogs: competitors[0].totals, competition, position: active })

        expect(rows.map(r => `${r.place} ${r.name}`)).toEqual(["1 Sam Chen", "2 Me Too", "3 Alex Rivera"])
        expect(rows.find(r => r.name === "Alex Rivera")!.race).toBe(100)
    })

    it("uses your own logs, so a new log counts at once", () => {
        const myLogs = logsOf(["km", 1, 10], ["wo", 1, 2], ["km", 2, 5], ["wo", 2, 2])
        const you = standings({ metrics, targets, competitors, myLogs, competition, position: active }).find(r => r.isYou)!

        expect(you.race).toBe(75)
        expect(you.week?.metrics.find(m => m.metricId === "wo")?.total).toBe(2)
    })

    it("scores someone with no logs as zero and their past weeks as missed", () => {
        const rows = standings({ metrics, targets, competitors: [...competitors, person("new", "New Person", [])], myLogs: competitors[0].totals, competition, position: active })
        const newcomer = rows.find(r => r.name === "New Person")!

        expect(newcomer.race).toBe(0)
        expect(newcomer.season.completedWeeks).toBe(0)
        expect(newcomer.season.weeks[0]).toBe("missed")
    })

    it("has no week before the competition starts", () => {
        const rows = standings({ metrics, targets, competitors, myLogs: [], competition, position: { state: "upcoming" } })

        expect(rows.every(r => r.week === null && r.race === 0)).toBe(true)
    })
})

describe("raceOrder and raceGaps", () => {
    const row = (name: string, race: number, place: number, isYou = false): Standing => ({
        participantId: name, userId: name, name, initials: name.slice(0, 2), isYou, race, place,
        week: null, season: { completedWeeks: 0, totalProgress: 0, weeks: [] },
    })

    it("orders the race by progress, then season place", () => {
        const order = raceOrder([row("You", 58, 1, true), row("Sam Chen", 31, 2), row("Alex Rivera", 95, 3), row("Jo Park", 31, 1)])

        expect(order.map(r => r.name)).toEqual(["Alex Rivera", "You", "Jo Park", "Sam Chen"])
    })

    it("gives the gap to the person just ahead and just behind you", () => {
        expect(raceGaps(raceOrder([row("You", 58, 2, true), row("Alex Rivera", 95, 3), row("Sam Chen", 31, 1)]))).toEqual({
            ahead: { name: "Alex", points: 37 },
            behind: { name: "Sam", points: 27 },
        })
        expect(raceGaps([row("You", 80, 1, true), row("Sam Chen", 70, 2)])).toEqual({ ahead: null, behind: { name: "Sam", points: 10 } })
        expect(raceGaps([row("Sam Chen", 50, 1), row("You", 50, 2, true)]).ahead).toEqual({ name: "Sam", points: 0 })
    })
})
