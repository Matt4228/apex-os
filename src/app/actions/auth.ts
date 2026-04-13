"use server"

import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

const registerSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8)
})

export async function registerUser(formData: FormData) {
    const parsed = registerSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
    })

    if (!parsed.success) {
        return { error: "Invalid input. Password must be at least 8 characters." }
    }

    const existing = await prisma.user.findUnique({
        where: { email: parsed.data.email },
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

    redirect("/login")
}