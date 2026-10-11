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