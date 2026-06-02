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
            <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
                <p className="text-slate-500 text-sm mt-1">Start tracking your goals and building better habits</p>
            </div>

            <form action={handleSubmit} className="space-y-4">
                <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Name</label>
                <Input name="name" placeholder="Matthew" required />
                </div>
                <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Email</label>
                <Input name="email" type="email" placeholder="you@example.com" required />
                </div>
                <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Password</label>
                <Input name="password" type="password" placeholder="Min. 8 characters" required />
                </div>

                {error && (
                <p className="text-sm text-red-500">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
                </Button>
            </form>

            <p className="text-sm text-slate-500 text-center mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-slate-900 font-medium hover:underline">
                Sign in
                </Link>
            </p>
            </div>
        </div>
    )
}
