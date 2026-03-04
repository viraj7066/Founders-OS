import * as React from "react"
import { AppSidebar } from "./app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Bell, Search } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { ConnectionStatus } from "@/components/ui/connection-status"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background text-foreground font-sans" suppressHydrationWarning>
                <ConnectionStatus />
                <AppSidebar />
                <div className="flex flex-col flex-1 overflow-hidden relative">
                    {/* ── Premium Topbar ── */}
                    <header className="h-[60px] border-b border-border/60 bg-background/80 backdrop-blur-2xl flex items-center justify-between px-6 shrink-0 z-20 sticky top-0">
                        {/* Subtle gradient line at top */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="md:hidden text-muted-foreground hover:text-foreground" />
                            <div className="hidden md:flex items-center gap-2 text-sm font-medium">
                                <span className="text-muted-foreground/60">Venture Deck</span>
                                <span className="text-border">/</span>
                                <span className="text-foreground">Command Center</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                                <input
                                    type="text"
                                    placeholder="Search anything..."
                                    className="w-56 bg-secondary/40 border border-border/60 rounded-xl pl-9 pr-10 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all text-foreground placeholder:text-muted-foreground/50 placeholder:text-xs"
                                />
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-secondary/80 border border-border/40 rounded-md px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                                    ⌘K
                                </div>
                            </div>

                            <ThemeToggle />

                            {/* Notification bell */}
                            <button className="relative p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                                <Bell className="h-4 w-4" />
                                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                            </button>

                            {/* User avatar */}
                            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/80 to-emerald-500/80 flex items-center justify-center text-xs font-bold text-black cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all">
                                VF
                            </div>
                        </div>
                    </header>

                    {/* ── Main content ── */}
                    <main className="flex-1 overflow-y-auto p-5 md:p-8 w-full max-w-[1600px] mx-auto">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}
