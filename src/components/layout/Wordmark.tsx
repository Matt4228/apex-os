/** The Apex OS mark and name. The mark is a placeholder the styling pass may replace */
export function Wordmark({ className = "" }: { className?: string }) {
    return (
        <span className={`inline-flex items-center gap-2 font-semibold text-ink ${className}`}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="flex-shrink-0">
                <rect width="24" height="24" rx="6" fill="#2E294E" />
                <path
                    d="M6.5 17 12 6.5 17.5 17M8.8 13.2h6.4"
                    fill="none"
                    stroke="#22b8a8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            Apex OS
        </span>
    )
}
