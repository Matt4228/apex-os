import { ordinal } from "./format"

// Gold, silver and bronze for the top three
const METAL: Record<number, string> = {
    1: "bg-medal-gold border-medal-gold-rim text-medal-gold-ink",
    2: "bg-medal-silver border-medal-silver-rim text-medal-silver-ink",
    3: "bg-medal-bronze border-medal-bronze-rim text-medal-bronze-ink",
}

// A soft highlight and a lower edge, so the disc reads as struck metal rather than a flat dot
const STRUCK =
    "bg-[radial-gradient(circle_at_32%_28%,rgb(255_255_255/0.6),transparent_60%)] shadow-[inset_0_-3px_0_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.12)]"

const disc = "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-extrabold tracking-tight"

/** A finished competition's result on its card: a medal for the top three, a dashed ring below that, and a solo mark */
export default function PlaceMedal({ place }: { place: number | "solo" }) {
    if (place === "solo") {
        return (
            <span role="img" aria-label="Solo" className={`${disc} border-2 border-primary-ink bg-primary-tint text-[11px] text-primary-ink ${STRUCK}`}>
                Solo
            </span>
        )
    }
    const label = ordinal(place)
    if (!METAL[place]) {
        return (
            <span role="img" aria-label={`${label} place`} className={`${disc} border-[1.5px] border-dashed border-line-strong text-[13px] font-bold text-ink-muted`}>
                {label}
            </span>
        )
    }
    return (
        <span role="img" aria-label={`${label} place`} className={`${disc} border-2 text-sm ${METAL[place]} ${STRUCK}`}>
            {label}
        </span>
    )
}
