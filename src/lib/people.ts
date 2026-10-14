/** "AR" for Alex Rivera, "S" for Sam, "MA" for matt@example.com: up to two letters to stand for someone */
export function initialsOf(name: string | null | undefined, email: string): string {
    const words = (name ?? "").trim().split(/\s+/).filter(Boolean)
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
    if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
    return email.slice(0, 2).toUpperCase()
}

/** How someone is shown: their name, or the part of their email before the @ */
export const displayName = (name: string | null | undefined, email: string) => name?.trim() || email.split("@")[0]

/**
 * What adding a friend always answers, whether or not the email has an account, so the form can't be used to find
 * out who does. It lives here because a "use server" file may only export async functions
 */
export const REQUEST_SENT = "If there's an account with that email, they'll see your request."
