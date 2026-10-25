import Image from "next/image"
import { Wordmark } from "@/components/layout/Wordmark"
import AccountCard, { type AccountMode } from "./AccountCard"
// Imported rather than served from public/, so it comes from /_next/static, which the proxy never redirects
import todayScreenshot from "./today.png"

const FEATURES = ["Goals", "Habits", "Weekly schedule", "Today's plan", "Competitions"]

/** The page a logged-out visitor sees at /, /login and /register: what Apex OS is, and the way in */
export default function WelcomeScreen({
    initialMode,
    homePath,
    next,
}: {
    initialMode: AccountMode
    homePath: "/" | "/login"
    /** Where to go once signed in, already checked with afterSignIn */
    next?: string
}) {
    return (
        <main className="flex flex-1 flex-col bg-canvas">
            <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-14">
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
                        <AccountCard initialMode={initialMode} homePath={homePath} next={next} />
                    </div>
                </div>
            </div>

            {/* The app in a browser window on a purple band that fills the rest of the screen, fading out as it goes */}
            <div className="relative min-h-80 flex-1 overflow-hidden bg-[linear-gradient(160deg,oklch(0.36_0.1_295),var(--color-hero)_45%,oklch(0.18_0.05_280))]">
                <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-90 w-90 rounded-full border-[48px] border-hero-ink/5" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-30 h-80 w-80 rounded-full border-[40px] border-hero-ink/5" />
                {/* Out of the flow, so the screenshot adds no height: the page stays one screen tall and the band cuts it off */}
                <div className="absolute inset-x-4 top-10 sm:inset-x-6 md:top-14">
                    <div
                        data-testid="browser-frame"
                        className="relative mx-auto max-w-[1104px] overflow-hidden rounded-t-xl bg-surface shadow-[0_24px_60px_rgb(10_6_30/0.5)] [mask-image:linear-gradient(to_bottom,black_45%,transparent_92%)]"
                    >
                        <div aria-hidden="true" className="flex h-9 items-center gap-2 border-b border-line bg-sunken px-3.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                            {/* Pulled left by the dots' width so the address sits in the true middle */}
                            <span className="mx-auto -translate-x-[27px] rounded-md bg-surface px-4 py-0.5 text-xs text-ink-muted">apex-os-sand.vercel.app</span>
                        </div>
                        <Image
                            src={todayScreenshot}
                            alt="The Today page: the day's plan grouped under its schedule blocks, with the schedule and habits beside it"
                            sizes="(min-width: 1152px) 1104px, 100vw"
                            placeholder="blur"
                            className="block h-auto w-full"
                        />
                    </div>
                </div>
            </div>
        </main>
    )
}
