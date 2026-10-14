import type { Metadata } from "next"
import WelcomeScreen from "@/components/welcome/WelcomeScreen"
import { afterSignIn } from "@/lib/routes"

export const metadata: Metadata = { title: "Create account" }

// ?next=/join/CODE brings someone back to the invite link they started from
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
    return <WelcomeScreen initialMode="register" homePath="/login" next={afterSignIn((await searchParams).next)} />
}
