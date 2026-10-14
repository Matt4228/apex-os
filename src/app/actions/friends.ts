"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { REQUEST_SENT } from "@/lib/people"

const emailSchema = z.string().trim().toLowerCase().email("Enter an email address")

/**
 * Asks someone to be friends, by their exact email. If they already asked you, this accepts their request instead of
 * making a second one. Asking yourself, an existing friend, or someone you've already asked changes nothing. Every
 * case answers with REQUEST_SENT
 */
export async function sendFriendRequest(email: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const me = session.user.id

    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const other = await prisma.user.findUnique({ where: { email: parsed.data }, select: { id: true } })
    if (other && other.id !== me) {
        const existing = await prisma.friendship.findFirst({
            where: { OR: [{ requesterId: me, addresseeId: other.id }, { requesterId: other.id, addresseeId: me }] },
        })
        if (!existing) {
            await prisma.friendship.create({ data: { requesterId: me, addresseeId: other.id } })
        } else if (existing.status === "pending" && existing.addresseeId === me) {
            // They asked first: asking back is saying yes
            await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } })
        }
    }

    revalidatePath("/dashboard/friends")
    return { message: REQUEST_SENT }
}

/** Accepts or declines a request sent to you. Declining removes it, so they can ask again later */
export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const request = await prisma.friendship.findFirst({ where: { id: friendshipId, addresseeId: session.user.id, status: "pending" } })
    if (!request) return { error: "Not found" }

    if (accept) await prisma.friendship.update({ where: { id: friendshipId }, data: { status: "accepted" } })
    else await prisma.friendship.delete({ where: { id: friendshipId } })
    revalidatePath("/dashboard", "layout")
}

/** Withdraws a request you sent that hasn't been answered */
export async function cancelFriendRequest(friendshipId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const request = await prisma.friendship.findFirst({ where: { id: friendshipId, requesterId: session.user.id, status: "pending" } })
    if (!request) return { error: "Not found" }

    await prisma.friendship.delete({ where: { id: friendshipId } })
    revalidatePath("/dashboard/friends")
}

/** Ends a friendship, from either side. Competitions you share are not affected */
export async function removeFriend(friendshipId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const me = session.user.id

    const friendship = await prisma.friendship.findFirst({
        where: { id: friendshipId, status: "accepted", OR: [{ requesterId: me }, { addresseeId: me }] },
    })
    if (!friendship) return { error: "Not found" }

    await prisma.friendship.delete({ where: { id: friendshipId } })
    revalidatePath("/dashboard/friends")
}
