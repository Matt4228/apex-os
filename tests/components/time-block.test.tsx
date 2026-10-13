// tests/components/time-block.test.tsx
// @vitest-environment jsdom
import TimeBlock from "@/components/schedule/TimeBlock"
import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

const block = (category: string | null) => ({
    id: "b1|2026-10-12",
    blockId: "b1",
    date: "2026-10-12",
    originalDate: "2026-10-12",
    label: "Deep work",
    startTime: "09:00",
    endTime: "12:00",
    category,
    repeats: true,
    changed: false,
})

function renderBlock(b: ReturnType<typeof block>) {
    render(
        <DndContext>
            <TimeBlock block={b} top={0} height={180} column={0} columnCount={1} pxPerMinute={1} onDelete={() => {}} onEdit={() => {}} onResize={() => {}} />
        </DndContext>
    )
    return screen.getByText("Deep work").closest("[data-cat], [style]") as HTMLElement
}

describe("TimeBlock", () => {
    it("takes its color from its category", () => {
        const el = renderBlock(block("Work"))

        expect(el).toHaveAttribute("data-cat", "4")
        expect(el.style.backgroundColor).toBe("")
    })

    it("is neutral without a category", () => {
        const el = renderBlock(block(null))

        expect(el).not.toHaveAttribute("data-cat")
        expect(el.style.backgroundColor).toBe("")
    })
})
