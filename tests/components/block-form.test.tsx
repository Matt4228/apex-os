// tests/components/block-form.test.tsx
// @vitest-environment jsdom
import BlockForm from "@/components/schedule/BlockForm"
import { createScheduleBlock, updateScheduleBlock } from "@/app/actions/schedule"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/schedule", () => ({ createScheduleBlock: vi.fn(), updateScheduleBlock: vi.fn() }))

type User = ReturnType<typeof userEvent.setup>

const categoryPicker = () => screen.getByRole("combobox", { name: "Category" })

// The picker is a Radix select: open it, then choose from the menu it draws
async function pickCategory(user: User, name: string | RegExp) {
    await user.click(categoryPicker())
    await user.click(await screen.findByRole("option", { name }))
}

async function addBlock(user: User) {
    await user.type(screen.getByPlaceholderText("Block label"), "Deep work")
    await user.click(screen.getByRole("button", { name: "Add block" }))
    await waitFor(() => expect(createScheduleBlock).toHaveBeenCalled())
    return vi.mocked(createScheduleBlock).mock.calls[0][0] as FormData
}

const block = (category: string | null) => ({
    id: "b1",
    label: "Deep work",
    startTime: "09:00",
    endTime: "12:00",
    category,
    color: null,
    dayOfWeek: "Monday",
    sortOrder: 0,
})

describe("BlockForm category picker", () => {
    beforeEach(() => {
        vi.mocked(createScheduleBlock).mockReset().mockResolvedValue({ block: undefined } as never)
        vi.mocked(updateScheduleBlock).mockReset().mockResolvedValue({ block: undefined } as never)
    })

    it("lists no category, the standard ones with their colors, yours, then a new one", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="Monday" categories={["Side projects", "work"]} onCancel={() => {}} />)

        await user.click(categoryPicker())

        const names = screen.getAllByRole("option").map(o => o.textContent)
        expect(names).toEqual([
            "No category",
            "Career", "Finance", "Fitness", "Health", "Learning", "Personal", "Wellness", "Work",
            "Side projects",
            "New category...",
        ])
        // "work" is the standard Work, so it isn't listed twice; each name carries its color
        expect(screen.getByRole("option", { name: "Work" }).querySelector("[data-cat]")).toHaveAttribute("data-cat", "4")
        expect(within(screen.getByRole("group", { name: "Yours" })).getByRole("option")).toHaveTextContent("Side projects")
    })

    it("starts on no category, and saves none", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="Monday" onCancel={() => {}} />)

        expect(categoryPicker()).toHaveTextContent("No category")
        const sent = await addBlock(user)
        expect(sent.get("category")).toBe("")
    })

    it("saves a picked category, and no color", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="Monday" onCancel={() => {}} />)

        await pickCategory(user, "Career")
        expect(categoryPicker()).toHaveTextContent("Career")

        const sent = await addBlock(user)
        expect(sent.get("category")).toBe("Career")
        expect(sent.has("color")).toBe(false)
    })

    it("names a new category in a box that shows its color", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="Monday" onCancel={() => {}} />)

        expect(screen.queryByRole("textbox", { name: "New category name" })).not.toBeInTheDocument()
        await pickCategory(user, "New category...")
        await user.type(screen.getByRole("textbox", { name: "New category name" }), "Side projects")
        expect(screen.getByTestId("new-category-dot")).toHaveAttribute("data-cat")

        const sent = await addBlock(user)
        expect(sent.get("category")).toBe("Side projects")
    })

    it("hides the new name box again when a listed category is picked", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="Monday" onCancel={() => {}} />)

        await pickCategory(user, "New category...")
        await pickCategory(user, "Fitness")

        expect(screen.queryByRole("textbox", { name: "New category name" })).not.toBeInTheDocument()
        const sent = await addBlock(user)
        expect(sent.get("category")).toBe("Fitness")
    })

    it("shows a block's saved category, whatever its case", () => {
        render(<BlockForm day="Monday" block={block("career")} onCancel={() => {}} />)

        expect(categoryPicker()).toHaveTextContent("Career")
    })

    it("lists a block's own custom category under yours when editing it", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="Monday" block={block("Band practice")} onCancel={() => {}} />)

        expect(categoryPicker()).toHaveTextContent("Band practice")
        await user.click(categoryPicker())
        expect(within(screen.getByRole("group", { name: "Yours" })).getByRole("option")).toHaveTextContent("Band practice")
    })
})
