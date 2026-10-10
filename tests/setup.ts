import "@testing-library/jest-dom/vitest"
import { prisma } from "@/lib/prisma"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, vi } from "vitest"
import { mockReset } from "vitest-mock-extended"

vi.mock("@/lib/prisma")
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

beforeEach(() => {
    mockReset(prisma)
})

// Unmount anything rendered by a component test, so tests don't see each other's DOM.
// Testing Library only does this automatically when Vitest globals are enabled
afterEach(() => {
    cleanup()
})