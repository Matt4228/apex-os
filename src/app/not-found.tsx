import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="bg-white border border-slate-200 rounded-x1 p-8 max-w-md w-full text-center">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Page not found</h2>
                <p className="text-sm text-slate-500 mb-6">
                    The page you're looking for doesn't exist.
                </p>
                <Button asChild>
                    <Link href="/dashboard">Go to dashboard</Link>
                </Button>
            </div>
        </div>
    )
}