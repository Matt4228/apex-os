"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

/** One click into the shared demo account */
export default function DemoButton() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleDemo() {
        setLoading(true)
        setError(null)
        const result = await signIn("credentials", {
            email: "demo@apex-os.app",
            password: "superP@ssword",
            redirect: false,
        })

        if (result?.error) {
            setError("Demo account unavailable. Please try again later.")
            setLoading(false)
            return
        }

        router.push("/dashboard")
    }

    return (
        <div className="flex flex-col gap-3">
            <Button type="button" variant="outline" className="w-full" onClick={handleDemo} disabled={loading}>
                {loading ? "Loading demo..." : "Try the demo"}
            </Button>
            {error && <p role="alert" className="text-sm text-danger-ink text-center">{error}</p>}
            <p className="text-xs text-ink-muted text-center">
                Demo account resets nightly. Data may be modified by other visitors.
            </p>
        </div>
    )
}
