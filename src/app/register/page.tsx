"use client"

import { useState } from "react"
import { registerUser } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function RegisterPage() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)
        const result = await  registerUser(formData)
        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-primary py-10">
            <div className="w-full max-w-md bg-surface rounded-xl border border-line p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
                <p className="text-ink-muted text-sm mt-1">Start tracking your goals and building better habits</p>
            </div>

            <form action={handleSubmit} className="space-y-4">
                <div>
                <label htmlFor="name" className="text-sm font-medium text-ink-soft block mb-1.5">Name</label>
                <Input id="name" name="name" autoComplete="name" placeholder="Matthew" required />
                </div>
                <div>
                <label htmlFor="email" className="text-sm font-medium text-ink-soft block mb-1.5">Email</label>
                <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
                </div>
                <div>
                <label htmlFor="password" className="text-sm font-medium text-ink-soft block mb-1.5">Password</label>
                <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Min. 8 characters" required />
                </div>

                {error && (
                <p role="alert" className="text-sm text-danger-ink">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
                </Button>
            </form>

            <p className="text-sm text-ink-muted text-center mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-accent-ink font-medium hover:underline">
                Sign in
                </Link>
            </p>
            </div>
        </div>
    )
}
