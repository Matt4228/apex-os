// tests/components/scope-dialog.test.tsx
// @vitest-environment jsdom
import { removeBlockDays, updateScheduleBlock } from "@/app/actions/schedule"
import BlockForm from "@/components/schedule/BlockForm"
import ScheduleGrid from "@/components/schedule/ScheduleGrid"
import ScopeDialog from "@/components/schedule/ScopeDialog"
import { parseDateOnly } from "@/lib/dates"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/app/actions/schedule", () => ({
    createScheduleBlock: vi.fn(),
    deleteScheduleBlock: vi.fn(),
    removeBlockDays: vi.fn(),
    updateScheduleBlock: vi.fn(),
}))

const DAYS = ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"]

const lunch = {
    id: "lunch",
    label: "Lunch",
    category: "Personal",
    startTime: "12:00",
    endTime: "13:00",
    startDate: parseDateOnly("2026-09-28"),
    repeat: "weekday",
    repeatDays: [],
    endsOn: null,
    endsAfter: null,
}

const wednesday = {
    id: "lunch|2026-10-14",
    blockId: "lunch",
    date: "2026-10-14",
    originalDate: "2026-10-14",
    startTime: "12:00",
    endTime: "13:00",
    label: "Lunch",
    category: "Personal",
    repeats: true,
    changed: false,
}

beforeEach(() => {
    vi.mocked(updateScheduleBlock).mockReset()
    vi.mocked(removeBlockDays).mockReset()
})

describe("ScopeDialog", () => {
    it("offers the three choices for the day, starting on this block", async () => {
        const user = userEvent.setup()
        const onChoose = vi.fn()
        render(<ScopeDialog action="change" date="2026-10-14" onChoose={onChoose} onCancel={() => {}} />)

        expect(screen.getByRole("dialog", { name: "Change repeating block" })).toBeInTheDocument()
        expect(screen.getByRole("radio", { name: /This block.*Wednesday, Oct 14/ })).toBeChecked()
        expect(screen.getByRole("radio", { name: /This and following blocks.*From Oct 14 on/ })).toBeInTheDocument()

        await user.click(screen.getByRole("radio", { name: /All blocks/ }))
        await user.click(screen.getByRole("button", { name: "Save" }))

        expect(onChoose).toHaveBeenCalledWith("all")
    })

    it("can offer fewer choices", () => {
        render(<ScopeDialog action="change" date="2026-10-14" scopes={["this"]} onChoose={() => {}} onCancel={() => {}} />)

        expect(screen.getAllByRole("radio")).toHaveLength(1)
    })

    it("cancels with Escape", async () => {
        const user = userEvent.setup()
        const onCancel = vi.fn()
        render(<ScopeDialog action="delete" date="2026-10-14" onChoose={() => {}} onCancel={onCancel} />)

        await user.keyboard("{Escape}")

        expect(onCancel).toHaveBeenCalled()
    })
})

describe("BlockForm on a day of a repeating block", () => {
    it("opens with that day's date and asks which days before saving", async () => {
        const user = userEvent.setup()
        vi.mocked(updateScheduleBlock).mockResolvedValue({ block: lunch, exceptions: [] } as never)
        const onUpdated = vi.fn()
        render(<BlockForm day="2026-10-14" block={lunch} shown={wednesday} onUpdated={onUpdated} onCancel={() => {}} />)

        expect(screen.getByLabelText("Date")).toHaveValue("2026-10-14")
        await user.click(screen.getByRole("button", { name: "Update" }))
        expect(updateScheduleBlock).not.toHaveBeenCalled()

        await user.click(screen.getByRole("button", { name: "Save" }))

        await waitFor(() => expect(onUpdated).toHaveBeenCalled())
        expect(vi.mocked(updateScheduleBlock).mock.calls[0][2]).toEqual({ date: "2026-10-14", scope: "this" })
    })

    it("doesn't ask for a one-off block", async () => {
        const user = userEvent.setup()
        vi.mocked(updateScheduleBlock).mockResolvedValue({ block: lunch, exceptions: [] } as never)
        const once = { ...lunch, repeat: "none", startDate: parseDateOnly("2026-10-14") }
        render(<BlockForm day="2026-10-14" block={once} onUpdated={() => {}} onCancel={() => {}} />)

        await user.click(screen.getByRole("button", { name: "Update" }))

        await waitFor(() => expect(updateScheduleBlock).toHaveBeenCalled())
        expect(vi.mocked(updateScheduleBlock).mock.calls[0][2]).toBeUndefined()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
})

describe("deleting from the grid", () => {
    it("asks which days for a repeating block, and removes just that day", async () => {
        const user = userEvent.setup()
        const cancelled = { blockId: "lunch", date: parseDateOnly("2026-10-14"), cancelled: true, newDate: null, startTime: null, endTime: null, label: null, category: null }
        vi.mocked(removeBlockDays).mockResolvedValue({ block: lunch, exceptions: [cancelled] } as never)
        render(<ScheduleGrid initialBlocks={[lunch]} days={DAYS} today="2026-10-11" pxPerMinute={1} />)
        expect(screen.getAllByText("Lunch")).toHaveLength(5)

        // The desktop column's Wednesday block (index 3: Mon, Tue, Wed)
        await user.click(screen.getAllByRole("button", { name: "Delete Lunch" })[2])
        await user.click(screen.getByRole("button", { name: "Delete" }))

        expect(removeBlockDays).toHaveBeenCalledWith("lunch", "2026-10-14", "this")
        // dnd-kit has a status region of its own, so the message is found by its words
        expect(await screen.findByText('Removed "Lunch" on Wednesday, Oct 14.')).toHaveAttribute("role", "status")
        expect(screen.getAllByText("Lunch")).toHaveLength(4)
    })

    it("explains when removing days fails", async () => {
        const user = userEvent.setup()
        vi.mocked(removeBlockDays).mockResolvedValue({ error: "That day isn't part of this block" })
        render(<ScheduleGrid initialBlocks={[lunch]} days={DAYS} today="2026-10-11" pxPerMinute={1} />)

        await user.click(screen.getAllByRole("button", { name: "Delete Lunch" })[0])
        await user.click(screen.getByRole("button", { name: "Delete" }))

        expect(await screen.findByRole("alert")).toHaveTextContent(`Couldn't delete "Lunch". That day isn't part of this block.`)
    })
})
