import { auth } from "@/lib/auth"
import type { Session } from "next-auth"
import type { Mock } from "vitest"
import { vi } from "vitest"

export const mockedAuth = vi.mocked(auth) as unknown as Mock<() => Promise<Session | null>>