export default function Loading() {
    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <div className="h-8 w-48 bg-sunken-strong rounded animate-pulse mb-2" />
                <div className="h-4 w-32 bg-sunken rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-surface border border-line rounded-lg p-4">
                        <div className="h-3 w-24 bg-sunken rounded animate-pulse mb-3" />
                        <div className="h-8 w-12 bg-sunken-strong rounded animate-pulse" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-surface border border-line rounded-lg p-5">
                        <div className="h-4 w-32 bg-sunken-strong rounded animate-pulse mb-4" />
                        <div className="space-y-3">
                            {[...Array(3)].map((_, j) => (
                                <div key={j} className="h-3 bg-sunken rounded animate-pulse" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    )
}