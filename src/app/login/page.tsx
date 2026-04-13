"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)

        const result = await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirect: false,
        })

        if (result?.error) {
            setError("Invalid email or password.")
            setLoading(false)
            return
        }

        router.push("dashboard")
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-md bg-white rounded-x1 border border-slate-200 p-8">
                <div className="mb-8">
                    <h1 className="text-2x1 font-semibold text-slate-900">Welcome back</h1>
                    <p className="text-slate-500 text-sm mt-1">Sign in to your Apex OS account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">Email</label>
                        <Input name="email" type="email" placeholder="you@example.com" required />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">Password</label>
                        <Input name="password" type="password" placeholder="Your passowrd" required />
                    </div>

                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Signing in..." : "Sign in"}
                    </Button>
                </form>

                <p className="test-sm text-slate-500 text-center mt-6">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-slate-900 font-medium hover:underline">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    )
}