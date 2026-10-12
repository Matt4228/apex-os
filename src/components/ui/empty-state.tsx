import type { LucideIcon } from "lucide-react"
import { Button } from "./button"

/** What an empty page says: what it is for, and the button that starts it */
export type EmptyCopy = { icon: LucideIcon; title: string; description: string; action: string }

/** Shown in place of a list with nothing in it yet */
export function EmptyState({ icon: Icon, title, description, action, onAction }: EmptyCopy & { onAction: () => void }) {
    return (
        <div className="rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
            <Icon size={28} aria-hidden="true" className="mx-auto mb-3 text-ink-muted" />
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
            <Button size="sm" className="mt-4" onClick={onAction}>
                {action}
            </Button>
        </div>
    )
}
