export default function Loading() {
    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <div className="h-8 w-56 bg-sunken-strong rounded animate-pulse mb-2" />
                <div className="h-4 w-32 bg-sunken rounded animate-pulse" />
            </div>
            <div className="grid gap-x-12 gap-y-10 md:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="space-y-3">
                    <div className="h-4 w-28 bg-sunken-strong rounded animate-pulse mb-4" />
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-sunken rounded-md animate-pulse" />
                    ))}
                </div>
                <div className="space-y-3">
                    <div className="h-4 w-20 bg-sunken-strong rounded animate-pulse mb-4" />
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-6 bg-sunken rounded-md animate-pulse" />
                    ))}
                </div>
            </div>
        </main>
    )
}