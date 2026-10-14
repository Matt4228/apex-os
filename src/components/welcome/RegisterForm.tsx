"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { registerUser } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** Creates the account, then signs in with what was typed */
export default function RegisterForm({ onSwitchToSignIn, next = "/dashboard" }: { onSwitchToSignIn: () => void; next?: string }) {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [signInFailed, setSignInFailed] = useState(false)
    const router = useRouter()

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)
        setSignInFailed(false)

        const result = await registerUser(formData)
        if (result?.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        // The account exists now. Sign in with what was just typed, so nothing secret comes back from the server
        const signedIn = await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirect: false,
        })
        if (signedIn?.error) {
            setSignInFailed(true)
            setLoading(false)
            return
        }

        router.push(next)
    }

    return (
        <form action={handleSubmit} className="flex flex-1 flex-col gap-4">
            <div className="flex flex-1 flex-col justify-center gap-4">
                <div>
                    <label htmlFor="register-name" className="text-sm font-medium text-ink-soft block mb-1.5">Name</label>
                    <Input id="register-name" name="name" autoComplete="name" placeholder="Your name" required />
                </div>
                <div>
                    <label htmlFor="register-email" className="text-sm font-medium text-ink-soft block mb-1.5">Email</label>
                    <Input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
                </div>
                <div>
                    <label htmlFor="register-password" className="text-sm font-medium text-ink-soft block mb-1.5">Password</label>
                    <Input
                        id="register-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        required
                    />
                </div>
                {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}
                {signInFailed && (
                    <p role="alert" className="text-sm text-ink-soft">
                        Your account was created, but we couldn&apos;t sign you in.{" "}
                        <button type="button" onClick={onSwitchToSignIn} className="text-accent-ink font-medium hover:underline">
                            Sign in here
                        </button>
                    </p>
                )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
            </Button>
        </form>
    )
}
