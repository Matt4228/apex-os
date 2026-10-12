import { NextRequest, NextResponse } from "next/server"
import { deleteTask } from "@/app/actions/tasks"
import { deleteGoal } from "@/app/actions/goals"
import { deleteHabit } from "@/app/actions/habits"
import { deleteScheduleBlock } from "@/app/actions/schedule"
import { deleteCompetition } from "@/app/actions/competitions"
import { isDeletableKind, type DeletableKind } from "@/lib/deletable"

// The same delete actions the lists call, so the session and ownership checks live in one place
const deleters: Record<DeletableKind, (id: string) => Promise<{ error: string } | undefined>> = {
    "task": deleteTask,
    "goal": deleteGoal,
    "habit": deleteHabit,
    "schedule-block": deleteScheduleBlock,
    "competition": deleteCompetition,
}

/**
 * A pending undo delete, sent by the browser while the page closes (refresh, closing the tab).
 * Server actions can't outlive the page, but a fetch with keepalive can. DELETE is not a "simple"
 * request, so another site can't send one with the user's cookie without a CORS preflight we never allow
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
    const { kind, id } = await params
    if (!isDeletableKind(kind)) return NextResponse.json({ error: "Not found" }, { status: 404 })

    try {
        const result = await deleters[kind](id)
        if (result?.error) return NextResponse.json(result, { status: 401 })
        return new NextResponse(null, { status: 204 })
    } catch {
        // Prisma throws when no row matches { id, userId }: already gone, or someone else's
        return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
}
