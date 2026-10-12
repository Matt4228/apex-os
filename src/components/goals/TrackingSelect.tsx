import { TRACKING, type Tracking } from "@/lib/goalProgress"
import { TRACKING_WORDS } from "./tracking"

/** Picks how a goal's logged numbers add up. A native select so it posts with the form */
export default function TrackingSelect({ defaultValue = "latest" }: { defaultValue?: string }) {
    return (
        <select
            name="tracking"
            aria-label="How logged numbers add up"
            defaultValue={defaultValue}
            className="flex h-10 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        >
            {TRACKING.map((kind: Tracking) => (
                <option key={kind} value={kind}>{TRACKING_WORDS[kind].option}</option>
            ))}
        </select>
    )
}
