// tests/components/people-panel.test.tsx
// @vitest-environment jsdom
import { inviteFriends, leaveCompetition, removeParticipant, resetJoinCode, respondToInvite } from "@/app/actions/competitions"
import InviteCards from "@/components/competitions/InviteCards"
import PeoplePanel from "@/components/competitions/PeoplePanel"
import type { InviteView, Member } from "@/lib/competitionData"
import type { Person } from "@/lib/friends"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const push = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))
vi.mock("@/app/actions/competitions", () => ({
    inviteFriends: vi.fn(),
    leaveCompetition: vi.fn(),
    removeParticipant: vi.fn(),
    resetJoinCode: vi.fn(),
    respondToInvite: vi.fn(),
}))

const member = (id: string, name: string, role: string, isYou = false): Member => ({
    participantId: id, userId: `u-${id}`, name, initials: name.split(" ").map(w => w[0]).join(""), role, isYou,
})
const friend = (userId: string, name: string): Person => ({
    friendshipId: `f-${userId}`, userId, name, email: `${userId}@x.com`, initials: name.slice(0, 2).toUpperCase(), sharedCompetitions: 0,
})
const people = [member("p1", "Demo User", "owner", true), member("p2", "Alex Rivera", "member")]

function panel(o: Partial<React.ComponentProps<typeof PeoplePanel>> = {}) {
    return render(
        <PeoplePanel
            competitionId="run"
            title="Run Club"
            people={people}
            invited={[]}
            joinCode="ABCDEFGHJK"
            isOwner
            friends={[friend("u-p2", "Alex Rivera"), friend("sam", "Sam Chen"), friend("jo", "Jo Park")]}
            finished={false}
            origin="https://apex.test"
            {...o}
        />,
    )
}

beforeEach(() => {
    push.mockReset()
    refresh.mockReset()
    vi.mocked(inviteFriends).mockReset().mockResolvedValue(undefined)
    vi.mocked(removeParticipant).mockReset().mockResolvedValue(undefined)
    vi.mocked(leaveCompetition).mockReset().mockResolvedValue(undefined)
    vi.mocked(resetJoinCode).mockReset()
    vi.mocked(respondToInvite).mockReset()
})

describe("PeoplePanel, for the owner", () => {
    it("invites the friends picked, offering only those not already in", async () => {
        const user = userEvent.setup()
        panel()

        expect(screen.queryByRole("checkbox", { name: /Alex Rivera/ })).not.toBeInTheDocument()
        await user.click(screen.getByRole("checkbox", { name: /Sam Chen/ }))
        await user.click(screen.getByRole("checkbox", { name: /Jo Park/ }))
        await user.click(screen.getByRole("button", { name: "Send 2 invites" }))

        expect(inviteFriends).toHaveBeenCalledWith("run", ["sam", "jo"])
        expect(await screen.findByRole("status")).toHaveTextContent("Invited Sam Chen and Jo Park.")
        expect(screen.getAllByText("Invited")).toHaveLength(2)
    })

    it("shows the invite link, and a new one after a reset", async () => {
        const user = userEvent.setup()
        vi.mocked(resetJoinCode).mockResolvedValue({ joinCode: "ZZZZZZZZZZ" })
        panel()

        expect(screen.getByLabelText("Invite link for Run Club")).toHaveValue("https://apex.test/join/ABCDEFGHJK")
        await user.click(screen.getByRole("button", { name: "Make a new link" }))

        expect(screen.getByLabelText("Invite link for Run Club")).toHaveValue("https://apex.test/join/ZZZZZZZZZZ")
        expect(screen.getByRole("status")).toHaveTextContent("The old one no longer works")
    })

    it("asks before removing a member, then removes them", async () => {
        const user = userEvent.setup()
        panel()

        await user.click(screen.getByRole("button", { name: "Remove Alex Rivera" }))
        expect(removeParticipant).not.toHaveBeenCalled()
        expect(screen.getByText("Their progress goes too.")).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Remove" }))

        expect(removeParticipant).toHaveBeenCalledWith("run", "p2")
        // Out of the list, and back among the friends who can be invited
        expect(screen.queryByRole("button", { name: "Remove Alex Rivera" })).not.toBeInTheDocument()
        expect(screen.getByRole("checkbox", { name: /Alex Rivera/ })).toBeInTheDocument()
    })

    it("offers no inviting once the competition has finished", () => {
        panel({ finished: true })
        expect(screen.queryByRole("group", { name: "Invite friends" })).not.toBeInTheDocument()
        expect(screen.queryByLabelText("Invite link for Run Club")).not.toBeInTheDocument()
    })
})

describe("PeoplePanel, for a member", () => {
    it("shows no invite tools, and asks before leaving", async () => {
        const user = userEvent.setup()
        panel({ isOwner: false, joinCode: null, friends: [], people: [member("p1", "Sam Chen", "owner"), member("p2", "Demo User", "member", true)] })

        expect(screen.getByText("Demo User (you)")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Leave competition" }))
        await user.click(screen.getByRole("button", { name: "Leave" }))

        expect(leaveCompetition).toHaveBeenCalledWith("run")
        expect(push).toHaveBeenCalledWith("/dashboard/competitions")
    })
})

describe("InviteCards", () => {
    const invite: InviteView = {
        inviteId: "i1", competitionId: "push", title: "Push-up Challenge", category: "Fitness", weeks: 6,
        inviter: { name: "Sam Chen", initials: "SC" }, weeksPassed: 1, weeksLeft: 5, upcoming: false,
    }

    it("says who invited you and what joining now means, then opens the competition on accept", async () => {
        const user = userEvent.setup()
        vi.mocked(respondToInvite).mockResolvedValue({ competitionId: "push" })
        render(<InviteCards invites={[invite]} />)

        expect(screen.getByText(/invited you to/)).toHaveTextContent("Sam Chen invited you to Push-up Challenge")
        expect(screen.getByText("Week 1 has passed, so it counts as missed. 5 weeks left.")).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Accept Push-up Challenge" }))

        expect(respondToInvite).toHaveBeenCalledWith("i1", true)
        expect(push).toHaveBeenCalledWith("/dashboard/competitions/push")
    })

    it("keeps the card and explains when answering fails", async () => {
        const user = userEvent.setup()
        vi.mocked(respondToInvite).mockResolvedValue({ error: "This competition has finished" })
        render(<InviteCards invites={[invite]} />)

        await user.click(screen.getByRole("button", { name: "Decline Push-up Challenge" }))

        expect(screen.getByRole("alert")).toHaveTextContent("Couldn't answer that invite. This competition has finished.")
        expect(screen.getByText(/invited you to/)).toBeInTheDocument()
    })

    it("shows nothing when there are no invites", () => {
        const { container } = render(<InviteCards invites={[]} />)
        expect(container).toBeEmptyDOMElement()
    })
})
