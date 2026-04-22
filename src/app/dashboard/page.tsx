import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { signOut } from "@/lib/auth"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
    const session = await auth()

    if (!session) redirect("/login")

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h1 className="text-lg font-semibold text-slate-900">Apex OS</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">
                        {session.user?.name ?? session.user?.email}
                    </span>
                    <form
                        action={async () => {
                            "use server"
                            await signOut({ redirectTo: "/login"})
                        }}
                    >
                        <Button variant="outline" size="sm" type="submit">
                            Sign out
                        </Button>
                    </form>
                </div>
            </nav>

            <main className="max-w-5x1 mx-auto px-6 py-12">
                <h2 className="tet-2x1 font-semibold text-slate-900 mb-2">
                    Welcome back, {session.user?.name?.split(" ")[0] ?? "there"}
                </h2>
                <p className="text-slate-500">
                    Your dashboard is being built. Check back soon.
                </p>
            </main>
        </div>
    )
}