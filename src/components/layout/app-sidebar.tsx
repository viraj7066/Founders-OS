'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {
    LayoutDashboard,
    Target,
    KanbanSquare,
    CircleDollarSign,
    Users2,
    PackageCheck,
    CalendarDays,
    FolderOpen,
    Settings,
    MessageSquareShare,
    Users,
    Zap,
    FileText,
    Briefcase,
    LogOut,
    Lightbulb
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const navGroups = [
    {
        label: 'Core',
        items: [
            { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
            { title: "Daily Tracker", url: "/dashboard/tracker", icon: Target },
        ]
    },
    {
        label: 'Growth',
        items: [
            { title: "CRM Pipeline", url: "/dashboard/pipeline", icon: KanbanSquare },
            { title: "Clients", url: "/dashboard/clients", icon: Users2 },
            { title: "Financials", url: "/dashboard/financials", icon: CircleDollarSign },
            { title: "Invoices", url: "/dashboard/invoices", icon: FileText },
            { title: "Contracts", url: "/dashboard/contracts", icon: Briefcase },
            { title: "Outreach", url: "/dashboard/outreach", icon: MessageSquareShare },
        ]
    },
    {
        label: 'Operations',
        items: [
            { title: "Deliverables", url: "/dashboard/deliverables", icon: PackageCheck },
            { title: "Team", url: "/dashboard/team", icon: Users },
        ]
    },
    {
        label: 'Assets',
        items: [
            { title: "Content Calendar", url: "/dashboard/content", icon: CalendarDays },
            { title: "Asset Vault", url: "/dashboard/vault", icon: FolderOpen },
            { title: "Inspiration Board", url: "/dashboard/inspiration", icon: Lightbulb },
        ]
    },
]

export function AppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error("Logout failed: " + error.message)
        } else {
            router.push("/login")
            router.refresh()
        }
    }

    return (
        <Sidebar className="border-r border-sidebar-border bg-sidebar w-[240px] flex flex-col">
            {/* ── Logo / Brand ── */}
            <SidebarHeader className="px-5 py-5 border-b border-sidebar-border/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                        <Zap className="w-4 h-4 text-black" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-sidebar-foreground tracking-tight">Venture Deck</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Command Center</p>
                    </div>
                </div>
            </SidebarHeader>

            {/* ── Navigation ── */}
            <SidebarContent className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
                {navGroups.map(group => (
                    <div key={group.label}>
                        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] px-3 mb-2">
                            {group.label}
                        </p>
                        <SidebarMenu className="space-y-0.5">
                            {group.items.map(item => {
                                const isActive = pathname === item.url || (item.url !== '/dashboard' && pathname.startsWith(item.url + '/'))
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            className={`
                                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all duration-200
                                                ${isActive
                                                    ? 'bg-primary text-primary-foreground font-semibold'
                                                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}
                                            `}
                                        >
                                            <Link href={item.url} className="flex items-center gap-3 w-full">
                                                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </div>
                ))}
            </SidebarContent>

            {/* ── Footer ── */}
            <SidebarFooter className="px-3 pb-5 border-t border-sidebar-border/50 pt-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all">
                            <Link href="/dashboard/settings" className="flex items-center gap-3">
                                <Settings className="h-4 w-4 text-muted-foreground" />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* User profile card */}
                <div className="mt-3 flex items-center gap-3 px-3 py-3 bg-sidebar-accent/60 rounded-2xl border border-sidebar-border/40">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-xs font-bold text-black shadow-sm shrink-0">
                        VF
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-sidebar-foreground truncate">Viraj</p>
                        <p className="text-[10px] text-muted-foreground truncate">Founder · Venture Deck</p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" />
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
