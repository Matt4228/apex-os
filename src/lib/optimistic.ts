// Helpers for optimistic updates: change the screen first, then undo it if the server says no.

/** Server action errors worded for the screen. Anything not listed is shown as the server wrote it */
function explain(error: string): string {
    if (error === "Unauthorized") return "Your session has ended. Sign in again."
    return /[.!?]$/.test(error) ? error : `${error}.`
}

/**
 * Null when a server action worked. Otherwise the sentence to show, "Couldn't {what}. {why}", where why is:
 * the server's own { error } message, a server crash, or a request that never reached the server.
 */
export async function failureMessage(action: Promise<unknown>, what: string): Promise<string | null> {
    try {
        const result = await action
        if (typeof result === "object" && result !== null && "error" in result) {
            return `Couldn't ${what}. ${explain(String(result.error))}`
        }
        return null
    } catch (error) {
        // Next.js tags errors thrown on the server with a digest; a request that failed in the browser has none
        const crashedOnServer = typeof error === "object" && error !== null && "digest" in error
        return crashedOnServer
            ? `Couldn't ${what}. Something went wrong on our side. Try again in a moment.`
            : `Couldn't ${what}. Check your connection and try again.`
    }
}
