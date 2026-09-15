import { describe, it, expect } from "vitest"
import { timeToMinutes, minutesToTime, snapToGrid, layoutOverlaps, minutesToPixels, pixelsToMinutes } from "@/lib/schedule-time"

describe("timeToMinutes", () => {
    it("converts a HH:MM string to minutes since midnight", () => {
        expect(timeToMinutes("9:30")).toBe(570)
    })
})

describe("minutesToTime", () => {
    it("converts minutes since midnight back to a zero-padded HH:MM string", () => {
        expect(minutesToTime(570)).toBe("09:30")
    })

    it("zero-pads single-digit hours and minutes", () => {
        expect(minutesToTime(65)).toBe("01:05")
    })
})

describe("snapToGrid", () => {
    it("rounds down to the nearest incremenet when closer to it", () => {
        expect(snapToGrid(572, 5)).toBe(570)
    })

    it("rounds up to the nearest increment when closer to it", () => {
        expect(snapToGrid(573, 5)).toBe(575)
    })

    it("leaves an already-aligned value unchanged", () => {
        expect(snapToGrid(0, 5)).toBe(0)
    })
})

describe("layoutOverlaps", () => {
    it("gives non-overlapping blocks a single column", () => {
        const result = layoutOverlaps([
            { id: "a", startMinutes: 540, endMinutes: 600 },
            { id: "b", startMinutes: 600, endMinutes: 660 },
        ])
        expect(result.find(b => b.id === "a")).toMatchObject({ column: 0, columnCount: 1})
        expect(result.find(b => b.id === "b")).toMatchObject({ column: 0, columnCount: 1})
    })

    it("splits two fully overlapping blocks into two columns", () => {
        const result = layoutOverlaps([
            { id: "a", startMinutes: 540, endMinutes: 600 },
            { id: "b", startMinutes: 540, endMinutes: 600 },
        ])
        expect(result.find(b => b.id === "a")).toMatchObject({ column: 0, columnCount: 2})
        expect(result.find(b => b.id === "b")).toMatchObject({ column: 1, columnCount: 2})
    })

    it("assigns a third column to a block overlapping both prior blocks", () => {
        const result = layoutOverlaps([
            { id: "a", startMinutes: 540, endMinutes: 660 },
            { id: "b", startMinutes: 570, endMinutes: 630 },
            { id: "c", startMinutes: 600, endMinutes: 660 },
        ])
        expect(result.find(b => b.id === "a")).toMatchObject({ column: 0, columnCount: 3})
        expect(result.find(b => b.id === "b")).toMatchObject({ column: 1, columnCount: 3})
        expect(result.find(b => b.id === "c")).toMatchObject({ column: 2, columnCount: 3})
    })    
})

describe("minutesToPixels", () => {
    it("scales minutes by the given px-per-minute rate", () => {
        expect(minutesToPixels(60, 2)).toBe(120)
    })

    it("handles fractional rates", () => {
        expect(minutesToPixels(90, 1.5)).toBe(135)
    })
})

describe("pixelsTominutes", () => {
    it("is the inverse of minutesToPixels", () => {
        expect(pixelsToMinutes(120, 2)).toBe(60)
        expect(pixelsToMinutes(135, 1.5)).toBe(90)
    })
})