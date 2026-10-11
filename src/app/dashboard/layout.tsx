import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Navbar from "@/components/layout/Navbar"
import TimezoneCookie from "@/components/layout/TimezoneCookie"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")
    
    return (
        <div className="min-h-screen bg-canvas">
            <TimezoneCookie />
            <Navbar userName={session.user?.name ?? session.user?.email} />
            {children}
        </div>
    )
}