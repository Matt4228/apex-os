// tests/components/block-form.test.tsx
// @vitest-environment jsdom
import BlockForm from "@/components/schedule/BlockForm"
import { createScheduleBlock } from "@/app/actions/schedule"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/schedule", () => ({ createScheduleBlock: vi.fn(), updateScheduleBlock: vi.fn() }))

describe("BlockForm", () => {
    beforeEach(() => {
        vi.mocked(createScheduleBlock).mockReset()
    })

    it("has no color picker: the category sets the color", () => {
        render(<BlockForm day="Monday" onCancel={() => {}} />)

        expect(screen.queryByRole("button", { name: /^Color/ })).not.toBeInTheDocument()
    })

    it("suggests the categories already in use", () => {
        render(<BlockForm day="Monday" categories={["Career", "Fitness"]} onCancel={() => {}} />)

        const input = screen.getByRole("combobox", { name: "Category" })
        const options = document.getElementById(input.getAttribute("list")!)!.querySelectorAll("option")
        expect([...options].map(o => o.value)).toEqual(["Career", "Fitness"])
    })

    it("previews the category's color as it is typed", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="Monday" onCancel={() => {}} />)

        expect(screen.getByTestId("category-dot")).not.toHaveAttribute("data-cat")
        await user.type(screen.getByRole("combobox", { name: "Category" }), "Career")
        expect(screen.getByTestId("category-dot")).toHaveAttribute("data-cat", "5")
    })

    it("saves the category and no color", async () => {
        const user = userEvent.setup()
        vi.mocked(createScheduleBlock).mockResolvedValue({ block: undefined } as never)
        render(<BlockForm day="Monday" onCancel={() => {}} />)

        await user.type(screen.getByPlaceholderText("Block label"), "Deep work")
        await user.type(screen.getByRole("combobox", { name: "Category" }), "Work")
        await user.click(screen.getByRole("button", { name: "Add block" }))

        await waitFor(() => expect(createScheduleBlock).toHaveBeenCalled())
        const sent = vi.mocked(createScheduleBlock).mock.calls[0][0] as FormData
        expect(sent.get("category")).toBe("Work")
        expect(sent.has("color")).toBe(false)
    })
})
