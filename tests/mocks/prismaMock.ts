import type { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { DeepMockProxy } from "vitest-mock-extended"

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>