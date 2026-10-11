import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center">
            <div className="bg-surface border border-line rounded-xl p-8 max-w-md w-full text-center">
                <h2 className="text-lg font-semibold text-ink mb-2">Page not found</h2>
                <p className="text-sm text-ink-muted mb-6">
                    The page you&apos;re looking for doesn&apos;t exist.
                </p>
                <Button asChild>
                    <Link href="/dashboard">Go to dashboard</Link>
                </Button>
            </div>
        </div>
    )
}