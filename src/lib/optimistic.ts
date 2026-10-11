// Helpers for optimistic updates: change the screen first, then undo it if the server says no.

/** True when a server action finished without throwing and without returning { error }. */
export async function succeeded(action: Promise<unknown>): Promise<boolean> {
    try {
        const result = await action
        return !(typeof result === "object" && result !== null && "error" in result)
    } catch {
        return false
    }
}

/** Put an item back at its old position after a failed delete. Does nothing if it's already there. */
export function restoreAt<T extends { id: string }>(list: T[], item: T, index: number): T[] {
    if (list.some(x => x.id === item.id)) return list
    const copy = [...list]
    copy.splice(Math.min(index, copy.length), 0, item)
    return copy
}