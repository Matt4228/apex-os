import type { Metadata } from "next"
import WelcomeScreen from "@/components/welcome/WelcomeScreen"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
    return <WelcomeScreen initialMode="login" homePath="/login" />
}
