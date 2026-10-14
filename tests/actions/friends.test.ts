// tests/actions/friends.test.ts
import { cancelFriendRequest, removeFriend, respondToFriendRequest, sendFriendRequest } from "@/app/actions/friends"
import { REQUEST_SENT } from "@/lib/people"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const friendship = (o: object = {}) => ({ id: "f1", requesterId: "me", addresseeId: "them", status: "pending", createdAt: new Date(), ...o })

beforeEach(() => {
    mockedAuth.mockReset()
    mockedAuth.mockResolvedValue({ user: { id: "me" } } as never)
})

describe("sendFriendRequest", () => {
    it("returns Unauthorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)
        expect(await sendFriendRequest("a@b.com")).toEqual({ error: "Unauthorized" })
    })

    it("asks for an email address", async () => {
        expect(await sendFriendRequest("not an email")).toEqual({ error: "Enter an email address" })
        expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
    })

    it("sends a request to the account with that exact email, ignoring case and spaces", async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: "them" } as never)
        prismaMock.friendship.findFirst.mockResolvedValue(null)

        expect(await sendFriendRequest("  Alex@Example.com ")).toEqual({ message: REQUEST_SENT })
        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: "alex@example.com" }, select: { id: true } })
        expect(prismaMock.friendship.create).toHaveBeenCalledWith({ data: { requesterId: "me", addresseeId: "them" } })
    })

    it("answers the same for an email with no account, so the form can't tell who uses the app", async () => {
        prismaMock.user.findUnique.mockResolvedValue(null)

        expect(await sendFriendRequest("nobody@example.com")).toEqual({ message: REQUEST_SENT })
        expect(prismaMock.friendship.create).not.toHaveBeenCalled()
    })

    it("does nothing for your own email", async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: "me" } as never)

        expect(await sendFriendRequest("me@example.com")).toEqual({ message: REQUEST_SENT })
        expect(prismaMock.friendship.findFirst).not.toHaveBeenCalled()
        expect(prismaMock.friendship.create).not.toHaveBeenCalled()
    })

    it("accepts their request when they asked first, instead of making a second one", async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: "them" } as never)
        prismaMock.friendship.findFirst.mockResolvedValue(friendship({ requesterId: "them", addresseeId: "me" }) as never)

        await sendFriendRequest("them@example.com")

        expect(prismaMock.friendship.update).toHaveBeenCalledWith({ where: { id: "f1" }, data: { status: "accepted" } })
        expect(prismaMock.friendship.create).not.toHaveBeenCalled()
    })

    it("changes nothing when already asked or already friends", async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: "them" } as never)
        for (const existing of [friendship(), friendship({ status: "accepted", requesterId: "them", addresseeId: "me" })]) {
            prismaMock.friendship.findFirst.mockResolvedValue(existing as never)
            expect(await sendFriendRequest("them@example.com")).toEqual({ message: REQUEST_SENT })
        }
        expect(prismaMock.friendship.create).not.toHaveBeenCalled()
        expect(prismaMock.friendship.update).not.toHaveBeenCalled()
    })
})

describe("respondToFriendRequest", () => {
    it("lets only the person asked answer, while it's pending", async () => {
        prismaMock.friendship.findFirst.mockResolvedValue(null)

        expect(await respondToFriendRequest("f1", true)).toEqual({ error: "Not found" })
        expect(prismaMock.friendship.findFirst).toHaveBeenCalledWith({ where: { id: "f1", addresseeId: "me", status: "pending" } })
        expect(prismaMock.friendship.update).not.toHaveBeenCalled()
    })

    it("accepts, or declines by removing the request", async () => {
        prismaMock.friendship.findFirst.mockResolvedValue(friendship({ requesterId: "them", addresseeId: "me" }) as never)

        await respondToFriendRequest("f1", true)
        expect(prismaMock.friendship.update).toHaveBeenCalledWith({ where: { id: "f1" }, data: { status: "accepted" } })

        await respondToFriendRequest("f1", false)
        expect(prismaMock.friendship.delete).toHaveBeenCalledWith({ where: { id: "f1" } })
    })
})

describe("cancelFriendRequest", () => {
    it("withdraws only your own unanswered request", async () => {
        prismaMock.friendship.findFirst.mockResolvedValue(null)
        expect(await cancelFriendRequest("f1")).toEqual({ error: "Not found" })
        expect(prismaMock.friendship.findFirst).toHaveBeenCalledWith({ where: { id: "f1", requesterId: "me", status: "pending" } })

        prismaMock.friendship.findFirst.mockResolvedValue(friendship() as never)
        await cancelFriendRequest("f1")
        expect(prismaMock.friendship.delete).toHaveBeenCalledWith({ where: { id: "f1" } })
    })
})

describe("removeFriend", () => {
    it("ends a friendship from either side, and nobody else's", async () => {
        prismaMock.friendship.findFirst.mockResolvedValue(null)
        expect(await removeFriend("f1")).toEqual({ error: "Not found" })
        expect(prismaMock.friendship.findFirst).toHaveBeenCalledWith({
            where: { id: "f1", status: "accepted", OR: [{ requesterId: "me" }, { addresseeId: "me" }] },
        })

        prismaMock.friendship.findFirst.mockResolvedValue(friendship({ status: "accepted" }) as never)
        await removeFriend("f1")
        expect(prismaMock.friendship.delete).toHaveBeenCalledWith({ where: { id: "f1" } })
    })
})
