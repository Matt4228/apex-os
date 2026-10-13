import Image from "next/image"
import { Wordmark } from "@/components/layout/Wordmark"
import AccountCard, { type AccountMode } from "./AccountCard"
// Imported rather than served from public/, so it comes from /_next/static, which the proxy never redirects
import todayScreenshot from "./today.png"

const FEATURES = ["Goals", "Habits", "Weekly schedule", "Today's plan", "Competitions"]

/** The page a logged-out visitor sees at /, /login and /register: what Apex OS is, and the way in */
export default function WelcomeScreen({ initialMode, homePath }: { initialMode: AccountMode; homePath: "/" | "/login" }) {
    return (
        <main className="flex-1 bg-canvas">
            <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 md:gap-14 md:py-16">
                <div className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr] md:gap-14">
                    <section className="flex flex-col gap-5">
                        <Wordmark />
                        <h1 className="text-3xl font-semibold tracking-tight text-balance text-ink md:text-4xl">
                            Know what to do today, and why
                        </h1>
                        <p className="max-w-[46ch] text-ink-soft">
                            Every task in Apex OS can trace back to a goal, a habit or a block in your week. The home page
                            pulls them together into one plan for today.
                        </p>
                        <ul aria-label="Features" className="flex flex-wrap gap-2">
                            {FEATURES.map(feature => (
                                <li key={feature} className="rounded-full bg-sunken px-3 py-1 text-sm text-ink-soft">
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <p className="text-sm text-ink-muted">
                            Built with Next.js, Prisma, and PostgreSQL.{" "}
                            <a href="https://github.com/Matt4228/apex-os" className="font-medium text-accent-ink hover:underline">
                                Source on GitHub
                            </a>
                            .
                        </p>
                    </section>

                    {/* On a phone the card comes first: a returning visitor came to sign in */}
                    <div className="order-first flex justify-center md:order-none md:justify-end">
                        <AccountCard initialMode={initialMode} homePath={homePath} />
                    </div>
                </div>

                {/* Fades out at the bottom so the first screen stays short */}
                <div className="max-h-80 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
                    <Image
                        src={todayScreenshot}
                        alt="The Today page: tasks grouped under Deep work and Job search, with the day's schedule beside them"
                        sizes="(min-width: 1152px) 1104px, 100vw"
                        placeholder="blur"
                        className="h-auto w-full rounded-xl border border-line shadow-lg"
                    />
                </div>
            </div>
        </main>
    )
}
