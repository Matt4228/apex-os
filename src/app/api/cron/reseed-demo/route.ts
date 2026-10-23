import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { seedDemo } from "@/lib/demo/seedDemo"
import { sendHeartbeat } from "@/lib/pulse"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // The heartbeats are awaited before responding: Vercel can freeze the function once the response is sent
  const started = Date.now()
  try {
    await seedDemo(prisma)
    await sendHeartbeat("apex-reseed", "ok", { ms: Date.now() - started })
    return NextResponse.json({ success: true, message: "Demo reseeded successfully" })
  } catch (error) {
    console.error("Reseed error:", error)
    const message = error instanceof Error ? error.message : String(error)
    await sendHeartbeat("apex-reseed", "fail", { ms: Date.now() - started, error: message.slice(0, 200) })
    return NextResponse.json({ error: "Reseed failed" }, { status: 500 })
  }
}
