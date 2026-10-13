// tests/components/block-form.test.tsx
// @vitest-environment jsdom
import BlockForm from "@/components/schedule/BlockForm"
import { createScheduleBlock } from "@/app/actions/schedule"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/schedule", () => ({ createScheduleBlock: vi.fn(), updateScheduleBlock: vi.fn() }))

type User = ReturnType<typeof userEvent.setup>

// The picker is a Radix select: open it, then choose from the menu it draws
async function pickCategory(user: User, name: string) {
    await user.click(screen.getByRole("combobox", { name: "Category" }))
    await user.click(await screen.findByRole("option", { name }))
}

async function addBlock(user: User) {
    await user.type(screen.getByPlaceholderText("Block label"), "Deep work")
    await user.click(screen.getByRole("button", { name: "Add block" }))
    await waitFor(() => expect(createScheduleBlock).toHaveBeenCalled())
    return vi.mocked(createScheduleBlock).mock.calls[0][0] as FormData
}

describe("BlockForm", () => {
    beforeEach(() => {
        vi.mocked(createScheduleBlock).mockReset().mockResolvedValue({ block: undefined } as never)
    })

    it("has no color picker: the category sets the color", () => {
        render(<BlockForm day="Monday" onCancel={() => {}} />)

        expect(screen.queryByRole("button", { name: /^Color/ })).not.toBeInTheDocument()
    })

    it("saves the category picked, and no color", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="Monday" onCancel={() => {}} />)

        await pickCategory(user, "Career")
        const sent = await addBlock(user)

        expect(sent.get("category")).toBe("Career")
        expect(sent.has("color")).toBe(false)
    })

    it("saves a new category's name", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="Monday" onCancel={() => {}} />)

        await pickCategory(user, "New category...")
        await user.type(screen.getByRole("textbox", { name: "New category name" }), "Side projects")
        const sent = await addBlock(user)

        expect(sent.get("category")).toBe("Side projects")
    })
})
