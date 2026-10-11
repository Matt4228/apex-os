import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { seedDemo } from "@/lib/demo/seedDemo"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await seedDemo(prisma)
    return NextResponse.json({ success: true, message: "Demo reseeded successfully" })
  } catch (error) {
    console.error("Reseed error:", error)
    return NextResponse.json({ error: "Reseed failed" }, { status: 500 })
  }
}