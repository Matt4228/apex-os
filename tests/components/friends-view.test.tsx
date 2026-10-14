// tests/components/friends-view.test.tsx
// @vitest-environment jsdom
import { removeFriend, respondToFriendRequest, sendFriendRequest } from "@/app/actions/friends"
import FriendsView from "@/components/friends/FriendsView"
import type { Person } from "@/lib/friends"
import { REQUEST_SENT } from "@/lib/people"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/friends", () => ({
    cancelFriendRequest: vi.fn(),
    removeFriend: vi.fn(),
    respondToFriendRequest: vi.fn(),
    sendFriendRequest: vi.fn(),
}))

const person = (id: string, name: string, initials: string, shared = 0): Person => ({
    friendshipId: id, userId: `u-${id}`, name, email: `${id}@x.com`, initials, sharedCompetitions: shared,
})
const view = () => ({
    friends: [person("f1", "Alex Rivera", "AR", 2)],
    received: [person("f2", "Jordan Park", "JP")],
    sent: [person("f3", "Kim Lee", "KL")],
})

beforeEach(() => {
    vi.mocked(respondToFriendRequest).mockReset().mockResolvedValue(undefined)
    vi.mocked(removeFriend).mockReset().mockResolvedValue(undefined)
    vi.mocked(sendFriendRequest).mockReset()
})

describe("FriendsView", () => {
    it("lists friends with competitions shared, requests to answer, and requests sent", () => {
        render(<FriendsView initial={view()} />)

        expect(within(screen.getByRole("region", { name: /Friends/ })).getByText("2 competitions together")).toBeInTheDocument()
        expect(within(screen.getByRole("region", { name: /Requests/ })).getByText("Jordan Park")).toBeInTheDocument()
        expect(within(screen.getByRole("region", { name: "Sent" })).getByText("Kim Lee")).toBeInTheDocument()
    })

    it("moves an accepted request into friends", async () => {
        const user = userEvent.setup()
        render(<FriendsView initial={view()} />)

        await user.click(screen.getByRole("button", { name: "Accept" }))

        expect(respondToFriendRequest).toHaveBeenCalledWith("f2", true)
        expect(within(screen.getByRole("region", { name: /Friends/ })).getByText("Jordan Park")).toBeInTheDocument()
        expect(screen.queryByRole("region", { name: /Requests/ })).not.toBeInTheDocument()
    })

    it("puts a friend back and explains when removing fails", async () => {
        const user = userEvent.setup()
        vi.mocked(removeFriend).mockResolvedValue({ error: "Not found" })
        render(<FriendsView initial={view()} />)

        await user.click(screen.getByRole("button", { name: "Remove Alex Rivera" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't remove that friend")
        expect(screen.getByText("Alex Rivera")).toBeInTheDocument()
    })

    it("answers adding a friend the same way whether or not they have an account", async () => {
        const user = userEvent.setup()
        vi.mocked(sendFriendRequest).mockResolvedValue({ message: REQUEST_SENT })
        render(<FriendsView initial={view()} />)

        await user.type(screen.getByLabelText("Their email"), "sam@x.com")
        await user.click(screen.getByRole("button", { name: "Send request" }))

        expect(sendFriendRequest).toHaveBeenCalledWith("sam@x.com")
        expect(await screen.findByRole("status")).toHaveTextContent(REQUEST_SENT)
        expect(screen.getByLabelText("Their email")).toHaveValue("")
    })

    it("explains how to start when there are no friends", () => {
        render(<FriendsView initial={{ friends: [], received: [], sent: [] }} />)

        expect(screen.getByText(/No friends yet/)).toBeInTheDocument()
        expect(screen.queryByRole("region", { name: /Requests/ })).not.toBeInTheDocument()
    })
})
