import type { LucideIcon } from "lucide-react"
import { Button } from "./button"

/** What an empty page says: what it is for, and the button that starts it */
export type EmptyCopy = { icon: LucideIcon; title: string; description: string; action: string }

/** Shown in place of a list with nothing in it yet */
export function EmptyState({ icon: Icon, title, description, action, onAction }: EmptyCopy & { onAction: () => void }) {
    return (
        <div className="rounded-xl border border-line bg-surface px-6 py-10 text-center">
            {/* Brand purple, not a category: an empty page belongs to none */}
            <span
                data-testid="empty-icon"
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-tint text-primary-ink"
            >
                <Icon size={28} aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
            <Button size="sm" className="mt-4" onClick={onAction}>
                {action}
            </Button>
        </div>
    )
}
