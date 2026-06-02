import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { addDays, subDays, subMonths, eachDayOfInterval } from "date-fns"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.user.deleteMany({ where: { email: "demo@apex-os.app" } })

    const hashedPassword = await bcrypt.hash("superP@ssword", 12)
    const now = new Date()
    const fourMonthsAgo = subMonths(now, 4)

    const user = await prisma.user.create({
      data: {
        email: "demo@apex-os.app",
        name: "Matt O'Donnell",
        password: hashedPassword,
      },
    })

    // Schedule blocks
    const scheduleData = [
      ...["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].flatMap((day, di) => [
        { dayOfWeek: day, startTime: "06:00", endTime: "07:00", label: "Morning run", category: "Fitness", color: "#1B998B", sortOrder: 0 },
        { dayOfWeek: day, startTime: "07:00", endTime: "08:00", label: "Shower & breakfast", category: "Personal", color: "#2E294E", sortOrder: 1 },
        { dayOfWeek: day, startTime: "09:00", endTime: "12:00", label: "Deep work — product engineering", category: "Work", color: "#2E294E", sortOrder: 2 },
        { dayOfWeek: day, startTime: "12:00", endTime: "13:00", label: "Lunch & walk", category: "Personal", color: "#1B998B", sortOrder: 3 },
        { dayOfWeek: day, startTime: "13:00", endTime: "17:00", label: "Meetings & collaborative work", category: "Work", color: "#2E294E", sortOrder: 4 },
        { dayOfWeek: day, startTime: "17:00", endTime: "18:00", label: "Wind down & review", category: "Work", color: "#2E294E", sortOrder: 5 },
        ...(di % 2 === 0 ? [{ dayOfWeek: day, startTime: "19:00", endTime: "21:00", label: "Technical study block", category: "Career", color: "#F46036", sortOrder: 6 }] : []),
      ]),
      { dayOfWeek: "Saturday", startTime: "08:00", endTime: "10:00", label: "Long run or hike", category: "Fitness", color: "#1B998B", sortOrder: 0 },
      { dayOfWeek: "Saturday", startTime: "10:00", endTime: "12:00", label: "LeetCode practice", category: "Career", color: "#F46036", sortOrder: 1 },
      { dayOfWeek: "Saturday", startTime: "13:00", endTime: "16:00", label: "Side project work", category: "Career", color: "#F46036", sortOrder: 2 },
      { dayOfWeek: "Saturday", startTime: "16:00", endTime: "18:00", label: "Free time", category: "Personal", color: "#2E294E", sortOrder: 3 },
      { dayOfWeek: "Sunday", startTime: "09:00", endTime: "10:00", label: "Weekly review & planning", category: "Personal", color: "#2E294E", sortOrder: 0 },
      { dayOfWeek: "Sunday", startTime: "10:00", endTime: "12:00", label: "System design study", category: "Career", color: "#F46036", sortOrder: 1 },
      { dayOfWeek: "Sunday", startTime: "13:00", endTime: "15:00", label: "Side project work", category: "Career", color: "#F46036", sortOrder: 2 },
      { dayOfWeek: "Sunday", startTime: "15:00", endTime: "17:00", label: "Meal prep", category: "Personal", color: "#1B998B", sortOrder: 3 },
    ]

    await prisma.scheduleBlock.createMany({
      data: scheduleData.map(b => ({ ...b, userId: user.id }))
    })

    // Goals
    const goals = await Promise.all([
      prisma.goal.create({ data: { userId: user.id, title: "Complete 200 LeetCode problems", description: "Focus on medium difficulty — arrays, trees, dynamic programming", category: "Career", status: "active", targetValue: 200, unit: "problems", targetDate: addDays(now, 90) } }),
      prisma.goal.create({ data: { userId: user.id, title: "Run a half marathon", description: "Training for the NYC Half in March", category: "Fitness", status: "active", targetValue: 21.1, unit: "km longest run", targetDate: addDays(now, 60) } }),
      prisma.goal.create({ data: { userId: user.id, title: "Ship open source contributions", description: "Meaningful PRs merged to projects with 1k+ stars", category: "Career", status: "active", targetValue: 3, unit: "PRs merged", targetDate: addDays(now, 120) } }),
      prisma.goal.create({ data: { userId: user.id, title: "Read 12 technical books this year", description: "Mix of system design, architecture, and engineering culture", category: "Learning", status: "active", targetValue: 12, unit: "books", targetDate: new Date(now.getFullYear(), 11, 31) } }),
      prisma.goal.create({ data: { userId: user.id, title: "Complete AWS Solutions Architect certification", description: "Associate level — study 1hr/day for 3 months", category: "Career", status: "complete", targetValue: 1, unit: "cert", targetDate: subMonths(now, 1) } }),
    ])

    // Goal entries
    const leetcodeEntries = Array.from({ length: 16 }, (_, i) => ({
      goalId: goals[0].id,
      value: (i + 1) * 8 + Math.floor(Math.random() * 6) - 2,
      note: i % 4 === 0 ? "Focused on dynamic programming this week" : i % 4 === 1 ? "Tree traversal practice" : i % 4 === 2 ? "Graph problems — harder than expected" : null,
      loggedOn: subDays(now, (15 - i) * 7),
    }))

    const runEntries = Array.from({ length: 16 }, (_, i) => ({
      goalId: goals[1].id,
      value: parseFloat((8 + i * 0.8 + (i === 7 ? -2 : 0) + (Math.random() * 0.5)).toFixed(1)),
      note: i === 7 ? "Pulled back — felt some knee soreness" : i === 8 ? "Back on track, felt great" : i === 15 ? "Longest run yet, feeling ready" : null,
      loggedOn: subDays(now, (15 - i) * 7),
    }))

    const osEntries = [
      { goalId: goals[2].id, value: 1, note: "Fixed a docs typo and added missing test coverage", loggedOn: subMonths(now, 3) },
      { goalId: goals[2].id, value: 2, note: "Added pagination support to REST client library", loggedOn: subMonths(now, 1) },
    ]

    const bookEntries = Array.from({ length: 7 }, (_, i) => ({
      goalId: goals[3].id,
      value: i + 1,
      note: ["Finished Designing Data-Intensive Applications", "Finished The Pragmatic Programmer", "Finished Clean Architecture", "Finished A Philosophy of Software Design", "Finished Staff Engineer by Will Larson", "Finished System Design Interview vol 1", "Finished The Manager's Path"][i],
      loggedOn: subDays(now, (6 - i) * 18),
    }))

    const awsEntries = [
      { goalId: goals[4].id, value: 1, note: "Passed the exam — scored 847/1000", loggedOn: subMonths(now, 1) }
    ]

    await prisma.goalEntry.createMany({
      data: [...leetcodeEntries, ...runEntries, ...osEntries, ...bookEntries, ...awsEntries]
    })

    // Habits
    const habits = await Promise.all([
      prisma.habit.create({ data: { userId: user.id, title: "Run or workout", category: "Fitness", frequency: "daily", targetPerWeek: 5, isActive: true } }),
      prisma.habit.create({ data: { userId: user.id, title: "LeetCode problems", category: "Career", frequency: "daily", targetPerWeek: 6, isActive: true } }),
      prisma.habit.create({ data: { userId: user.id, title: "Read technical content", category: "Learning", frequency: "daily", targetPerWeek: 7, isActive: true } }),
      prisma.habit.create({ data: { userId: user.id, title: "Side project work", category: "Career", frequency: "weekly", targetPerWeek: 3, isActive: true } }),
      prisma.habit.create({ data: { userId: user.id, title: "No phone first hour of day", category: "Wellness", frequency: "daily", targetPerWeek: 7, isActive: true } }),
      prisma.habit.create({ data: { userId: user.id, title: "Weekly system design study", category: "Career", frequency: "weekly", targetPerWeek: 2, isActive: true } }),
    ])

    // Habit logs
    const allDays = eachDayOfInterval({ start: fourMonthsAgo, end: now })
    const habitLogs: { habitId: string; completedOn: Date }[] = []

    for (const day of allDays) {
      const dayOfWeek = day.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const weekNumber = Math.floor(allDays.indexOf(day) / 7)
      const isEarlyMonth = weekNumber < 4

      if (!isWeekend && Math.random() > 0.15) habitLogs.push({ habitId: habits[0].id, completedOn: day })
      if (isWeekend && Math.random() > 0.3) habitLogs.push({ habitId: habits[0].id, completedOn: day })
      if (Math.random() > (isEarlyMonth ? 0.25 : 0.12)) habitLogs.push({ habitId: habits[1].id, completedOn: day })
      if (Math.random() > 0.1) habitLogs.push({ habitId: habits[2].id, completedOn: day })
      if (isWeekend && Math.random() > 0.25) habitLogs.push({ habitId: habits[3].id, completedOn: day })
      if (!isWeekend && dayOfWeek === 3 && Math.random() > 0.3) habitLogs.push({ habitId: habits[3].id, completedOn: day })
      if (Math.random() > (isEarlyMonth ? 0.45 : 0.2)) habitLogs.push({ habitId: habits[4].id, completedOn: day })
      if (isWeekend && Math.random() > 0.35) habitLogs.push({ habitId: habits[5].id, completedOn: day })
    }

    await prisma.habitLog.createMany({ data: habitLogs })

    // Tasks
    await prisma.task.createMany({
      data: [
        { userId: user.id, title: "Write up Stripe payments integration design doc", status: "todo", priority: "high", dueDate: addDays(now, 3) },
        { userId: user.id, title: "Review PR: add rate limiting to auth service", status: "todo", priority: "high", dueDate: addDays(now, 1) },
        { userId: user.id, title: "Solve 3 LeetCode graph problems", status: "todo", priority: "medium", dueDate: addDays(now, 2) },
        { userId: user.id, title: "Update resume with AWS cert", status: "todo", priority: "medium", dueDate: addDays(now, 7) },
        { userId: user.id, title: "Schedule coffee chat with Sarah at Shopify", status: "todo", priority: "medium", dueDate: addDays(now, 5) },
        { userId: user.id, title: "Read chapter 8 of Designing Data-Intensive Applications", status: "todo", priority: "low" },
        { userId: user.id, title: "Set up personal monitoring dashboard for side project", status: "todo", priority: "low" },
        { userId: user.id, title: "Submit expense report for AWS certification exam", status: "done", priority: "medium", completedAt: subDays(now, 2) },
        { userId: user.id, title: "Complete mock system design interview with Pramp", status: "done", priority: "high", completedAt: subDays(now, 4) },
        { userId: user.id, title: "Refactor auth module to use repository pattern", status: "done", priority: "high", completedAt: subDays(now, 6) },
        { userId: user.id, title: "Open source PR: fix pagination bug in REST client", status: "done", priority: "medium", completedAt: subDays(now, 14) },
        { userId: user.id, title: "Set up weekly 1:1 with new team member", status: "done", priority: "low", completedAt: subDays(now, 10) },
      ]
    })

    // Competition
    const competition = await prisma.competition.create({
      data: {
        userId: user.id,
        title: "2026 Technical Growth Challenge",
        rulesJson: JSON.stringify({
          criteria: ["Complete 6+ LeetCode problems", "Log 1+ system design session", "Work on side project 2+ hours", "Read technical content 5+ days"],
          scoring: "25 points per criterion met per week",
          reward: "Winner picks restaurant for team lunch"
        }),
        startDate: subMonths(now, 4),
        endDate: addDays(now, 60),
        status: "active",
      }
    })

    const competitionEntries = Array.from({ length: 16 }, (_, i) => ({
      competitionId: competition.id,
      weekNumber: i + 1,
      value: i < 3 ? 50 + Math.floor(Math.random() * 50) : 75 + Math.floor(Math.random() * 26),
      metric: "weekly score",
      weekComplete: i >= 3 && Math.random() > 0.2,
    }))

    await prisma.competitionEntry.createMany({ data: competitionEntries })

    return NextResponse.json({ success: true, message: "Demo reseeded successfully" })
  } catch (error) {
    console.error("Reseed error:", error)
    return NextResponse.json({ error: "Reseed failed" }, { status: 500 })
  }
}