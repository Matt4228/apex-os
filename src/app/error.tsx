"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h2>
                <p className="text-sm text-slate-500 mb-6">
                    An unexpected error occurred. Try again or refresh page.
                </p>
            </div>
            <Button onClick={reset}>Try again</Button>
        </div>
    )
}