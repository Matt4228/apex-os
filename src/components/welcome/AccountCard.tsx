"use client"

import { useState } from "react"
import * as Tabs from "@radix-ui/react-tabs"
import SignInForm from "./SignInForm"
import RegisterForm from "./RegisterForm"
import DemoButton from "./DemoButton"

export type AccountMode = "login" | "register"

// Both panels stay mounted in one grid cell, so the card is always as tall as the longer form and
// nothing below the switch moves. The inactive one is invisible and inert: no focus, not read out
const PANEL =
    "col-start-1 row-start-1 flex flex-col data-[state=inactive]:invisible " +
    "data-[state=active]:animate-[fade-up_200ms_ease-out] motion-reduce:animate-none"

const TRIGGER =
    "relative z-10 h-9 rounded-full text-sm font-medium text-ink-muted transition-colors " +
    "hover:text-ink-soft data-[state=active]:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"

export default function AccountCard({
    initialMode,
    homePath,
    next = "/dashboard",
}: {
    initialMode: AccountMode
    /** Where Sign in lives in the address bar: "/" for a visitor who arrived there, else "/login" */
    homePath: "/" | "/login"
    /** Where to go once signed in: an invite link the visitor came from, or the dashboard */
    next?: string
}) {
    const [mode, setMode] = useState<AccountMode>(initialMode)
    // Bumping a form's key remounts it, so an old error is gone when you come back to it
    const [resets, setResets] = useState({ login: 0, register: 0 })

    function switchTo(tab: AccountMode) {
        if (tab === mode) return
        setResets(r => ({ ...r, [mode]: r[mode] + 1 }))
        setMode(tab)
        // Updates the address without a reload or a history entry, so a refresh keeps the tab
        const query = next === "/dashboard" ? "" : `?next=${encodeURIComponent(next)}`
        window.history.replaceState(null, "", `${tab === "register" ? "/register" : homePath}${query}`)
    }

    return (
        <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_16px_40px_rgb(0_0_0/0.08)]">
            <Tabs.Root value={mode} onValueChange={value => switchTo(value as AccountMode)} className="flex flex-col gap-5">
                <Tabs.List aria-label="Account" className="relative grid grid-cols-2 rounded-full bg-sunken p-1">
                    <span
                        aria-hidden="true"
                        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-surface shadow-sm ring-1 ring-line transition-transform duration-300 ease-out motion-reduce:transition-none ${
                            mode === "register" ? "translate-x-full" : ""
                        }`}
                    />
                    <Tabs.Trigger value="login" className={TRIGGER}>Sign in</Tabs.Trigger>
                    <Tabs.Trigger value="register" className={TRIGGER}>Create account</Tabs.Trigger>
                </Tabs.List>

                <div className="grid">
                    <Tabs.Content value="login" forceMount inert={mode !== "login"} className={PANEL}>
                        <SignInForm key={`login-${resets.login}`} next={next} />
                    </Tabs.Content>
                    <Tabs.Content value="register" forceMount inert={mode !== "register"} className={PANEL}>
                        <RegisterForm key={`register-${resets.register}`} next={next} onSwitchToSignIn={() => switchTo("login")} />
                    </Tabs.Content>
                </div>

                <div className="flex items-center gap-3 text-xs text-ink-muted">
                    <span className="h-px flex-1 bg-line" />
                    or
                    <span className="h-px flex-1 bg-line" />
                </div>
                <DemoButton />
            </Tabs.Root>
        </div>
    )
}
