import bcrypt from "bcryptjs"
import { z } from "zod"
import { emailSchema } from "@/lib/email"
import { prisma } from "@/lib/prisma"

const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(8),
})

/**
 * The user for an email and password, or null when they don't match.
 * The email lookup ignores case, so accounts saved before emails were lowercased still sign in
 */
export async function verifyCredentials(credentials: unknown) {
    const parsed = loginSchema.safeParse(credentials)
    if (!parsed.success) return null

    const user = await prisma.user.findFirst({
        where: { email: { equals: parsed.data.email, mode: "insensitive" } },
    })
    if (!user?.password) return null

    const passwordMatch = await bcrypt.compare(parsed.data.password, user.password)
    if (!passwordMatch) return null

    return { id: user.id, email: user.email, name: user.name }
}