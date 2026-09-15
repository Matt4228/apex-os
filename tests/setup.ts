import "@testing-library/jest-dom/vitest"
import { prisma } from "@/lib/prisma"
import { beforeEach, vi } from "vitest"
import { mockReset } from "vitest-mock-extended"

vi.mock("@/lib/prisma")
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

beforeEach(() => {
    mockReset(prisma)
})