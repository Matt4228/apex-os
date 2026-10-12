"use server"

import { prisma } from "@/lib/prisma"
import { emailSchema } from "@/lib/email"
import { z } from "zod"
import bcrypt from "bcryptjs"

const registerSchema = z.object({
    name: z.string().trim().min(1),
    email: emailSchema,
    password: z.string().min(8)
})

// Returns success instead of redirecting: the register page signs in with the password it already has,
// so the password never travels back from the server
export async function registerUser(formData: FormData) {
    const parsed = registerSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
    })

    if (!parsed.success) {
        return { error: "Invalid input. Password must be at least 8 characters." }
    }

    // Ignores case, so an older account saved as "Matt@Example.com" still counts as taken
    const existing = await prisma.user.findFirst({
        where: { email: { equals: parsed.data.email, mode: "insensitive" } },
        select: { id: true },
    })

    if (existing) {
        return { error: "An account with that email already exists." }
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

    await prisma.user.create({
        data: {
            name: parsed.data.name,
            email: parsed.data.email,
            password: hashedPassword,
        },
    })

    return { success: true }
}