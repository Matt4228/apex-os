import bcrypt from "bcryptjs"
import { z } from "zod"
import { emailSchema } from "@/lib/email"
import { clearFailures, isLimited, limitKeys, LoginLimited, recordFailure } from "@/lib/loginLimit"
import { prisma } from "@/lib/prisma"

const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(8),
})

/**
 * The user for an email and password, or null when they don't match. Throws LoginLimited after too many
 * failures (see loginLimit.ts). The email lookup ignores case, so accounts saved before emails were lowercased
 * still sign in
 */
export async function verifyCredentials(credentials: unknown, request?: Request) {
    const parsed = loginSchema.safeParse(credentials)
    if (!parsed.success) return null

    const keys = limitKeys(parsed.data.email, request)
    if (await isLimited(keys)) throw new LoginLimited()

    const user = await prisma.user.findFirst({
        where: { email: { equals: parsed.data.email, mode: "insensitive" } },
    })
    const passwordMatch = user?.password ? await bcrypt.compare(parsed.data.password, user.password) : false
    if (!user || !passwordMatch) {
        await recordFailure(keys)
        return null
    }

    await clearFailures(keys)
    return { id: user.id, email: user.email, name: user.name }
}
