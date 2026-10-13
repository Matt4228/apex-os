import type { Metadata } from "next"
import WelcomeScreen from "@/components/welcome/WelcomeScreen"

export const metadata: Metadata = { title: "Create account" }

export default function RegisterPage() {
    return <WelcomeScreen initialMode="register" homePath="/login" />
}
