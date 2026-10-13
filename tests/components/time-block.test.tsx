// tests/components/time-block.test.tsx
// @vitest-environment jsdom
import TimeBlock from "@/components/schedule/TimeBlock"
import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

const block = (category: string | null, color: string | null = "#D7263D") => ({
    id: "b1",
    label: "Deep work",
    startTime: "09:00",
    endTime: "12:00",
    category,
    color,
    dayOfWeek: "Monday",
    sortOrder: 0,
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
    it("takes its color from its category, not the old color field", () => {
        const el = renderBlock(block("Work"))

        expect(el).toHaveAttribute("data-cat", "4")
        expect(el.style.backgroundColor).toBe("")
    })

    it("is neutral without a category, even with an old color saved", () => {
        const el = renderBlock(block(null))

        expect(el).not.toHaveAttribute("data-cat")
        expect(el.style.backgroundColor).toBe("")
    })
})
