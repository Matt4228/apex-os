import { catProps } from "@/lib/categoryColor"

const SIZES = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-14 w-14 text-lg" }

/**
 * Someone's initials on a color picked from their name, the way categories pick theirs: the same person always gets
 * the same color. Decorative next to a visible name, so it's hidden from screen readers unless `label` is given
 */
export function Avatar({
    name,
    initials,
    size = "md",
    label,
    className = "",
}: {
    name: string
    initials: string
    size?: keyof typeof SIZES
    /** Set when no name is shown beside it */
    label?: string
    className?: string
}) {
    return (
        <span
            {...catProps(name)}
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            className={`inline-flex flex-shrink-0 select-none items-center justify-center rounded-full bg-cat-solid font-bold text-cat-on-solid ${SIZES[size]} ${className}`}
        >
            {initials}
        </span>
    )
}
