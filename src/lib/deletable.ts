// The kinds of item a list can delete with undo, shared by the hook (browser) and the delete route (server)

export const DELETABLE_KINDS = ["task", "goal", "habit", "schedule-block", "competition"] as const

export type DeletableKind = (typeof DELETABLE_KINDS)[number]

export function isDeletableKind(value: string): value is DeletableKind {
    return (DELETABLE_KINDS as readonly string[]).includes(value)
}

/** Where the browser sends a delete while the page is closing */
export function deleteUrl(kind: DeletableKind, id: string): string {
    return `/api/items/${kind}/${encodeURIComponent(id)}`
}
