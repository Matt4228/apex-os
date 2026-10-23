"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TOO_MANY_ATTEMPTS } from "@/lib/signInCodes"

/** Email and password sign-in. The fields center in the space above the button */
export default function SignInForm({ next = "/dashboard" }: { next?: string }) {
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
            setError(
                result.code === TOO_MANY_ATTEMPTS
                    ? "Too many attempts. Wait 15 minutes, then try again."
                    : "Invalid email or password.",
            )
            setLoading(false)
            return
        }

        router.push(next)
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
            <div className="flex flex-1 flex-col justify-center gap-4">
                <div>
                    <label htmlFor="signin-email" className="text-sm font-medium text-ink-soft block mb-1.5">Email</label>
                    <Input id="signin-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
                </div>
                <div>
                    <label htmlFor="signin-password" className="text-sm font-medium text-ink-soft block mb-1.5">Password</label>
                    <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Your password"
                        required
                    />
                </div>
                {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
            </Button>
        </form>
    )
}
