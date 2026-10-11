// tests/lib/demo-seed.test.ts
  import { seedDemo } from "@/lib/demo/seedDemo"
  import { parseDateOnly } from "@/lib/dates"
  import type { PrismaClient } from "@prisma/client"
  import { beforeEach, describe, expect, it } from "vitest"
  import { prismaMock } from "../mocks/prismaMock"

  // Noon in New York on Sunday, October 11, 2026
  const NOON_NY = new Date("2026-10-11T16:00:00Z")

  type SeedTask = { title: string; status: string; dueDate?: Date | null; plannedFor?: Date | null }

  const run = (now = NOON_NY) => seedDemo(prismaMock as unknown as PrismaClient, now)

  function seededTasks(): SeedTask[] {
      const steps = prismaMock.goal.create.mock.calls.flatMap(
          ([args]) => ((args.data.tasks as unknown as { create?: SeedTask[] } | undefined)?.create ?? [])
      )
      const standalone = prismaMock.task.createMany.mock.calls.flatMap(([args]) => (args?.data ?? []) as unknown as SeedTask[])
      return [...steps, ...standalone]
  }

  const sameDay = (a: Date | null | undefined, day: string) => a?.getTime() === parseDateOnly(day).getTime()

  describe("seedDemo", () => {
      beforeEach(() => {
          prismaMock.user.upsert.mockResolvedValue({ id: "demo-1" } as never)
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
              prismaMock.scheduleBlock.createMany.mock.calls,
              prismaMock.goal.create.mock.calls,
              prismaMock.habit.create.mock.calls,
              prismaMock.task.createMany.mock.calls,
              prismaMock.competition.create.mock.calls,
          ])
          expect(text).not.toContain(String.fromCharCode(0x2014))
      })
  })