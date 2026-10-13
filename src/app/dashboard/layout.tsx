import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/layout/Sidebar"
import TimezoneCookie from "@/components/layout/TimezoneCookie"
import { CategoriesProvider } from "@/components/ui/category-select"
import { getUserCategories } from "@/lib/userCategories"
import { cookies } from "next/headers"
import { THEME_COOKIE, parseTheme } from "@/lib/theme"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")
    
    const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)
    // Every category picker in the dashboard offers these after the standard ones
    const categories = await getUserCategories(session.user.id)

    return (
        <div className="min-h-screen bg-canvas md:flex">
            <TimezoneCookie />
            <Sidebar userName={session.user?.name ?? session.user?.email} theme={theme} />
            <div className="flex-1 min-w-0">
                <CategoriesProvider categories={categories}>{children}</CategoriesProvider>
            </div>
        </div>
    )
}