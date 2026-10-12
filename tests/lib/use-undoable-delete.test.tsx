// tests/lib/use-undoable-delete.test.tsx
// @vitest-environment jsdom
import { UNDO_WINDOW_MS, useUndoableDelete } from "@/lib/use-undoable-delete"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("useUndoableDelete when the page closes", () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))

    beforeEach(() => {
        vi.useFakeTimers()
        fetchMock.mockClear()
        vi.stubGlobal("fetch", fetchMock)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    function setup() {
        const remove = vi.fn(async () => undefined)
        const view = renderHook(() => useUndoableDelete("task", remove, vi.fn()))
        return { remove, ...view }
    }

    it("sends a pending delete with keepalive, so a refresh doesn't bring the item back", () => {
        const { result, remove } = setup()
        act(() => result.current.requestDelete("task-1", "Write report"))

        window.dispatchEvent(new Event("pagehide"))

        expect(fetchMock).toHaveBeenCalledOnce()
        expect(fetchMock).toHaveBeenCalledWith("/api/items/task/task-1", { method: "DELETE", keepalive: true })
        // The undo timer was cancelled, so the delete isn't sent a second time
        act(() => vi.advanceTimersByTime(UNDO_WINDOW_MS))
        expect(remove).not.toHaveBeenCalled()
    })

    it("sends nothing when no delete is pending", () => {
        setup()
        window.dispatchEvent(new Event("pagehide"))
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("sends nothing after Undo", () => {
        const { result } = setup()
        act(() => result.current.requestDelete("task-1", "Write report"))
        act(() => result.current.undo())

        window.dispatchEvent(new Event("pagehide"))

        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("stops listening once the list is gone", () => {
        const { result, unmount, remove } = setup()
        act(() => result.current.requestDelete("task-1", "Write report"))
        unmount()
        // Unmounting sent the delete the usual way
        expect(remove).toHaveBeenCalledWith("task-1")

        window.dispatchEvent(new Event("pagehide"))

        expect(fetchMock).not.toHaveBeenCalled()
    })
})
