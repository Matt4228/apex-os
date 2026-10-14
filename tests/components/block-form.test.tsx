// tests/components/block-form.test.tsx
// @vitest-environment jsdom
import BlockForm from "@/components/schedule/BlockForm"
import { createScheduleBlock, updateScheduleBlock } from "@/app/actions/schedule"
import { parseDateOnly } from "@/lib/dates"
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

const repeatSelect = () => screen.getByRole("combobox", { name: "Repeat" })

async function addBlock(user: User) {
    await user.type(screen.getByRole("textbox", { name: "Label" }), "Deep work")
    await user.click(screen.getByRole("button", { name: "Add block" }))
    await waitFor(() => expect(createScheduleBlock).toHaveBeenCalled())
    return vi.mocked(createScheduleBlock).mock.calls[0][0] as FormData
}

const series = {
    id: "b1",
    label: "Deep work",
    category: "Work",
    startTime: "09:00",
    endTime: "12:00",
    startDate: parseDateOnly("2026-09-01"),
    repeat: "weekly",
    repeatDays: [1, 3],
    endsOn: null,
    endsAfter: 12,
}

describe("BlockForm", () => {
    beforeEach(() => {
        vi.mocked(createScheduleBlock).mockReset().mockResolvedValue({ block: series, exceptions: [] } as never)
        vi.mocked(updateScheduleBlock).mockReset().mockResolvedValue({ block: series, exceptions: [] } as never)
    })

    it("starts a new block on the day it was opened from, not repeating", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="2026-10-14" onCancel={() => {}} />)

        expect(screen.getByLabelText("Date")).toHaveValue("2026-10-14")
        expect(repeatSelect()).toHaveValue("none")
        expect(screen.queryByRole("group", { name: "Ends" })).not.toBeInTheDocument()

        const sent = await addBlock(user)
        expect(sent.get("startDate")).toBe("2026-10-14")
        expect(sent.get("repeat")).toBe("none")
        expect(sent.has("color")).toBe(false)
    })

    it("offers monthly on the date's day, and calls the date 'Starts' once it repeats", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="2026-10-14" onCancel={() => {}} />)

        expect(screen.getByRole("option", { name: "Monthly on day 14" })).toBeInTheDocument()
        await user.selectOptions(repeatSelect(), "daily")

        expect(screen.getByLabelText("Starts")).toHaveValue("2026-10-14")
        expect(screen.getByRole("group", { name: "Ends" })).toBeInTheDocument()
    })

    it("picks the date's weekday first for a weekly block, and saves the chosen days", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="2026-10-14" onCancel={() => {}} />)

        await user.selectOptions(repeatSelect(), "weekly")
        expect(screen.getByRole("button", { name: "Wednesday" })).toHaveAttribute("aria-pressed", "true")

        await user.click(screen.getByRole("button", { name: "Monday" }))
        const sent = await addBlock(user)

        expect(sent.get("repeat")).toBe("weekly")
        expect(sent.get("repeatDays")).toBe("1,3")
    })

    it("ends after a number of times", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="2026-10-14" onCancel={() => {}} />)

        await user.selectOptions(repeatSelect(), "daily")
        const times = screen.getByRole("spinbutton", { name: "Number of times" })
        await user.clear(times)
        await user.type(times, "6")
        const sent = await addBlock(user)

        expect(sent.get("ends")).toBe("after")
        expect(sent.get("endsAfter")).toBe("6")
    })

    it("saves the category picked", async () => {
        const user = userEvent.setup()
        render(<BlockForm day="2026-10-14" onCancel={() => {}} />)

        await pickCategory(user, "Career")
        const sent = await addBlock(user)

        expect(sent.get("category")).toBe("Career")
    })

    it("opens a saved block with its rule", async () => {
        const user = userEvent.setup()
        const onUpdated = vi.fn()
        render(<BlockForm day="2026-10-14" block={series} onUpdated={onUpdated} onCancel={() => {}} />)

        expect(screen.getByLabelText("Date")).toHaveValue("2026-09-01")
        expect(repeatSelect()).toHaveValue("weekly")
        expect(screen.getByRole("radio", { name: /After/ })).toBeChecked()

        await user.click(screen.getByRole("button", { name: "Update" }))

        await waitFor(() => expect(onUpdated).toHaveBeenCalledWith({ block: series, exceptions: [] }))
        expect(vi.mocked(updateScheduleBlock).mock.calls[0][0]).toBe("b1")
    })

    it("shows the server's reason and stays open when saving fails", async () => {
        const user = userEvent.setup()
        vi.mocked(createScheduleBlock).mockResolvedValue({ error: "Pick at least one day for it to repeat on" })
        const onCreated = vi.fn()
        render(<BlockForm day="2026-10-14" onCreated={onCreated} onCancel={() => {}} />)

        await user.type(screen.getByRole("textbox", { name: "Label" }), "Deep work")
        await user.click(screen.getByRole("button", { name: "Add block" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Pick at least one day for it to repeat on")
        expect(onCreated).not.toHaveBeenCalled()
    })
})
