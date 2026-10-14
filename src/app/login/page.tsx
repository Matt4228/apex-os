import type { Metadata } from "next"
import WelcomeScreen from "@/components/welcome/WelcomeScreen"
import { afterSignIn } from "@/lib/routes"

export const metadata: Metadata = { title: "Sign in" }

// ?next=/join/CODE brings someone back to the invite link they started from
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
    return <WelcomeScreen initialMode="login" homePath="/login" next={afterSignIn((await searchParams).next)} />
}
