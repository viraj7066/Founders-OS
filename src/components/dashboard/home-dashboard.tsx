'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Users2, KanbanSquare, PackageCheck, MessageSquareShare,
    CalendarDays, FolderOpen, Users, TrendingUp, AlertTriangle,
    ArrowRight, Sparkles, Activity, CheckCircle2, Clock,
    Plus, Trash2, Target, CircleDollarSign, Eye, Star,
    Zap, BarChart3, Bell, ArrowUpRight, Rocket
} from 'lucide-react'
import { LifeGoals } from './life-goals'
import { TodaysTasksWidget } from './todays-tasks-widget'
import { format, parseISO, isBefore, isAfter, addDays } from 'date-fns'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'

interface HomeDashboardProps {
    stats: {
        clients: any[]
        leads: any[]
        deliverables: any[]
        scripts: any[]
        posts: any[]
        members: any[]
        prompts: any[]
    }
}

export function HomeDashboard({ stats }: HomeDashboardProps) {
    const { clients, leads, deliverables, scripts, posts, members, prompts } = stats
    const supabase = createClient()

    const [mounted, setMounted] = useState(false)
    const [greeting, setGreeting] = useState('Welcome')
    const [userId, setUserId] = useState<string | null>(null)
    const [totalEarnings, setTotalEarnings] = useState<number>(0)
    const [focusList, setFocusList] = useState<{ id: string; text: string; completed: boolean }[]>([])
    const [newTask, setNewTask] = useState('')

    useEffect(() => {
        setMounted(true)
        const now = new Date()
        const hour = now.getHours()
        setGreeting(hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening')

        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUserId(user?.id || '00000000-0000-0000-0000-000000000000')
        }
        loadUser()

        // Fetch all-time total earnings from paid invoices
        const fetchEarnings = async () => {
            const { data: invoices } = await supabase
                .from('invoices')
                .select('amount, status, advance_received, advance_amount')

            if (invoices && invoices.length > 0) {
                const paid = invoices.reduce((s: number, inv: any) => {
                    let amountToAdd = 0
                    if (inv.status === 'Paid') {
                        amountToAdd = inv.amount || 0
                    } else if (inv.advance_received) {
                        amountToAdd = inv.advance_amount || 0
                    }
                    return s + amountToAdd
                }, 0)
                setTotalEarnings(paid)
            } else {
                setTotalEarnings(totalMRR)
            }
        }
        fetchEarnings()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const activeClients = clients.filter(c => c.status === 'active').length
    const totalMRR = clients.reduce((s, c) => s + (c.mrr || 0), 0)
    const now = new Date()
    const sevenDaysFromNow = addDays(now, 7)

    // Remaining KPIs (activeClients and totalMRR computed above)
    const atRiskClients = clients.filter(c => c.status === 'at-risk' || c.status === 'at_risk').length
    const hotLeads = leads.filter(l => l.status === 'proposal' || l.status === 'negotiation').length
    const overdueDeliverables = deliverables.filter(d => {
        if (!d.due_date || d.status === 'completed') return false
        try { return isBefore(parseISO(d.due_date), now) } catch { return false }
    }).length
    const pendingDeliverables = deliverables.filter(d => d.status === 'pending' || d.status === 'in-progress').length
    const upcomingPosts = posts.filter(p => {
        if (!p.scheduled_date || p.status === 'Published') return false
        try { return isAfter(parseISO(p.scheduled_date), now) && isBefore(parseISO(p.scheduled_date), sevenDaysFromNow) } catch { return false }
    }).length
    const completedTasks = focusList.filter(t => t.completed).length

    // Alerts
    const alerts: { msg: string; type: 'error' | 'warn'; href: string }[] = []
    if (atRiskClients > 0) alerts.push({ msg: `${atRiskClients} client${atRiskClients > 1 ? 's' : ''} at risk — act now`, type: 'error', href: '/dashboard/clients' })
    if (overdueDeliverables > 0) alerts.push({ msg: `${overdueDeliverables} overdue deliverable${overdueDeliverables > 1 ? 's' : ''}`, type: 'error', href: '/dashboard/deliverables' })
    if (hotLeads > 0) alerts.push({ msg: `${hotLeads} hot lead${hotLeads > 1 ? 's' : ''} need follow-up`, type: 'warn', href: '/dashboard/pipeline' })

    const sparklineData1 = [{ value: 400 }, { value: 450 }, { value: 420 }, { value: 500 }, { value: 580 }, { value: 650 }, { value: 720 }]
    const sparklineData2 = [{ value: 10 }, { value: 12 }, { value: 15 }, { value: 14 }, { value: 18 }, { value: 22 }, { value: 25 }]
    const sparklineData3 = [{ value: 5 }, { value: 8 }, { value: 6 }, { value: 10 }, { value: 15 }, { value: 12 }, { value: 18 }]

    const earningsDisplay = totalEarnings >= 100000
        ? `₹${(totalEarnings / 100000).toFixed(2)}L`
        : `₹${totalEarnings.toLocaleString()}`

    const kpis = [
        {
            label: 'Total Earnings', value: earningsDisplay,
            sub: `${activeClients} active client${activeClients !== 1 ? 's' : ''}`, change: 'This month',
            icon: <CircleDollarSign className="w-5 h-5" />, glow: '',
            border: 'border-primary/20', iconBg: 'bg-primary/10', iconColor: 'text-primary',
            valueColor: 'text-primary', href: '/dashboard/financials'
        },
        {
            label: 'Pipeline Leads', value: leads.length.toString(),
            sub: `${hotLeads} hot, ready to close`, change: `+${hotLeads}`,
            icon: <KanbanSquare className="w-5 h-5" />, glow: '',
            border: 'border-blue-500/20', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400',
            valueColor: 'text-blue-400', href: '/dashboard/pipeline'
        },
        {
            label: 'Deliverables', value: `${pendingDeliverables}`,
            sub: overdueDeliverables > 0 ? `⚠ ${overdueDeliverables} overdue` : 'All on track',
            change: overdueDeliverables > 0 ? 'Overdue' : 'On track',
            icon: <PackageCheck className="w-5 h-5" />, glow: '',
            border: overdueDeliverables > 0 ? 'border-red-500/20' : 'border-emerald-500/20',
            iconBg: overdueDeliverables > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
            iconColor: overdueDeliverables > 0 ? 'text-red-400' : 'text-emerald-400',
            valueColor: overdueDeliverables > 0 ? 'text-red-400' : 'text-emerald-400', href: '/dashboard/deliverables'
        },
        {
            label: 'Content This Week', value: upcomingPosts.toString(),
            sub: `${posts.filter(p => p.status === 'Published').length} published total`,
            change: `${upcomingPosts} scheduled`,
            icon: <CalendarDays className="w-5 h-5" />, glow: '',
            border: 'border-pink-500/20', iconBg: 'bg-pink-500/10', iconColor: 'text-pink-400',
            valueColor: 'text-pink-400', href: '/dashboard/content'
        },
        {
            label: 'Asset Vault', value: prompts.length.toString(),
            sub: `${prompts.filter(p => p.is_proven_winner).length} proven winners`,
            change: 'Growing',
            icon: <Sparkles className="w-5 h-5" />, glow: '',
            border: 'border-orange-500/20', iconBg: 'bg-orange-500/10', iconColor: 'text-orange-400',
            valueColor: 'text-orange-400', href: '/dashboard/vault'
        },
        {
            label: 'Team Members', value: members.filter(m => m.status === 'Active').length.toString(),
            sub: `${members.length} total, ${members.filter(m => m.status === 'On_Leave').length} on leave`,
            change: 'Active',
            icon: <Users className="w-5 h-5" />, glow: '',
            border: 'border-purple-500/20', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400',
            valueColor: 'text-purple-400', href: '/dashboard/team'
        },
    ]

    const modules = [
        { icon: <Users2 className="w-4 h-4" />, label: 'Clients', color: 'text-primary', href: '/dashboard/clients', count: clients.length, sub: `${activeClients} active` },
        { icon: <KanbanSquare className="w-4 h-4" />, label: 'CRM Pipeline', color: 'text-blue-400', href: '/dashboard/pipeline', count: leads.length, sub: `${hotLeads} hot` },
        { icon: <PackageCheck className="w-4 h-4" />, label: 'Deliverables', color: 'text-emerald-400', href: '/dashboard/deliverables', count: deliverables.length, sub: `${pendingDeliverables} pending` },
        { icon: <MessageSquareShare className="w-4 h-4" />, label: 'Outreach', color: 'text-indigo-400', href: '/dashboard/outreach', count: scripts.length, sub: 'scripts' },
        { icon: <CalendarDays className="w-4 h-4" />, label: 'Content', color: 'text-pink-400', href: '/dashboard/content', count: posts.length, sub: `${upcomingPosts} this week` },
        { icon: <FolderOpen className="w-4 h-4" />, label: 'Asset Vault', color: 'text-orange-400', href: '/dashboard/vault', count: prompts.length, sub: 'prompts' },
        { icon: <Users className="w-4 h-4" />, label: 'Team', color: 'text-purple-400', href: '/dashboard/team', count: members.length, sub: 'members' },
        { icon: <Target className="w-4 h-4" />, label: 'Daily Tracker', color: 'text-yellow-400', href: '/dashboard/tracker', count: focusList.length, sub: `${completedTasks} done` },
    ]

    return (
        <div className="space-y-6 pb-8" suppressHydrationWarning>
            {/* ─── Alert Banners ─── */}
            {alerts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {alerts.map((a, i) => (
                        <Link key={i} href={a.href}>
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all hover:opacity-90 ${a.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500'}`}>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{a.msg}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* ─── BENTO GRID ROW 1: Hero + Primary KPIs ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Main Hero Card (Spans 2 cols) */}
                <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-white/8 bg-card p-6 sm:p-8 flex flex-col justify-between group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full group-hover:bg-primary/30 transition-all duration-700" />

                    <div className="relative">
                        <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-4">
                            <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                            <span>Live · {mounted ? format(new Date(), 'MMM d, yyyy') : '...'}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground mb-2 h-auto md:h-10">
                            {mounted ? `${greeting}, Viraj.` : 'Loading...'}
                        </h1>
                        <p className="text-sm text-muted-foreground max-w-[85%] leading-relaxed">
                            {totalMRR > 0
                                ? `You're steering the ship at ₹${totalMRR.toLocaleString()} MRR across ${activeClients} active accounts. Keep the momentum high.`
                                : "Your agency command center is armed. Let's start building revenue today."}
                        </p>
                    </div>

                    <div className="relative flex flex-wrap gap-2 mt-8">
                        <div className="flex items-center justify-center gap-1.5 text-xs bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full font-semibold backdrop-blur-md">
                            <CircleDollarSign className="w-3.5 h-3.5" /> ₹{totalMRR.toLocaleString()} MRR
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-xs bg-secondary/60 border border-white/5 text-foreground px-3 py-1.5 rounded-full backdrop-blur-md">
                            <Zap className="w-3.5 h-3.5 text-blue-400" /> {leads.length} Active Leads
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-xs bg-secondary/60 border border-white/5 text-foreground px-3 py-1.5 rounded-full backdrop-blur-md">
                            <PackageCheck className="w-3.5 h-3.5 text-emerald-400" /> {pendingDeliverables} Deliverables
                        </div>
                    </div>
                </div>

                {/* Primary KPI 1: Total Earnings (Bento Square) */}
                {(() => {
                    const GOAL = 1000000 // ₹10L
                    const goalPct = Math.min(100, Math.round((totalEarnings / GOAL) * 100))
                    const remaining = Math.max(0, GOAL - totalEarnings)
                    const remainingLabel = remaining >= 100000 ? `₹${(remaining / 100000).toFixed(1)}L` : `₹${remaining.toLocaleString()}`
                    const earningsLabel = totalEarnings >= 100000 ? `₹${(totalEarnings / 100000).toFixed(2)}L` : `₹${totalEarnings.toLocaleString()}`
                    return (
                        <Link href="/dashboard/financials" className="block relative overflow-hidden rounded-3xl border border-white/8 bg-card p-6 flex flex-col justify-between hover:border-primary/30 transition-colors group">
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/10 blur-[50px] rounded-full group-hover:bg-primary/20 transition-colors" />
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                        <CircleDollarSign className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">
                                        {goalPct}% of Goal
                                    </span>
                                </div>
                                <p className="text-3xl font-bold tracking-tight text-foreground mt-4">{earningsLabel}</p>
                                <p className="text-xs font-semibold text-muted-foreground mt-1">Total Earnings (All-time)</p>
                            </div>
                            <div className="mt-4 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span>Goal ₹10L</span>
                                    <span className="text-primary font-semibold">{remainingLabel} remaining</span>
                                </div>
                                <div className="w-full bg-secondary/50 rounded-full h-1.5">
                                    <div
                                        className="h-1.5 rounded-full bg-primary transition-all duration-500"
                                        style={{ width: `${goalPct}%` }}
                                    />
                                </div>
                            </div>
                        </Link>
                    )
                })()}

                {/* Primary KPI 2: Lead Pipeline (Bento Square) */}
                <Link href="/dashboard/pipeline" className="block relative overflow-hidden rounded-3xl border border-white/8 bg-card p-6 flex flex-col justify-between hover:border-blue-500/30 transition-colors group">
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full group-hover:bg-blue-500/20 transition-colors" />
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                <KanbanSquare className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                                {hotLeads} Hot
                            </span>
                        </div>
                        <p className="text-3xl font-bold tracking-tight text-foreground mt-4">{leads.length}</p>
                        <p className="text-xs font-semibold text-muted-foreground mt-1">Total Pipeline Leads</p>
                    </div>
                    <div className="h-10 mt-4 -mx-2 -mb-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparklineData2}>
                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Link>

                {/* Month Progress Visualizer */}
                {(() => {
                    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
                    const dayOfMonth = now.getDate()
                    const daysLeft = daysInMonth - dayOfMonth
                    const daysPassed = dayOfMonth - 1
                    const pct = Math.round((dayOfMonth / daysInMonth) * 100)
                    const motivationalLines = [
                        `${daysPassed} days already spent — ${daysLeft} still yours to dominate.`,
                        `${pct}% of this month is ash. Make the remaining ${100 - pct}% count.`,
                        `${daysLeft} days of untapped potential. Every one = a deal you could close.`,
                        `${daysPassed} days archived. The next ${daysLeft} are where legends are written.`,
                        `Final stretch. ${daysLeft} days left — go earn something worth remembering.`,
                    ]
                    const line = motivationalLines[Math.min(Math.floor((dayOfMonth / daysInMonth) * motivationalLines.length), motivationalLines.length - 1)]

                    return (
                        <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-card flex flex-col justify-between group h-full lg:col-span-1">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 blur-[60px] rounded-full group-hover:bg-orange-500/10 transition-colors" />
                            <div className="p-5 border-b border-white/5 bg-secondary/20 relative z-10 shadow-inner">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                                    <h3 className="text-xs font-bold text-foreground">Progress</h3>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">{daysLeft} Days Left</p>
                            </div>

                            <div className="flex-1 p-5 flex flex-col justify-center relative z-10 bg-card">
                                <p className="text-3xl font-black tracking-tighter text-foreground text-center mb-0.5">{pct}%</p>
                                <p className="text-[9px] text-orange-500/80 font-bold tracking-widest uppercase text-center mb-4">Elapsed</p>

                                <div className="relative h-1.5 w-full bg-secondary rounded-full overflow-hidden mb-4">
                                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-700 via-orange-500 to-amber-300 rounded-full" style={{ width: `${pct}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                </div>

                                <p className="text-[10px] text-muted-foreground/80 font-medium italic text-center leading-tight">
                                    "{line}"
                                </p>
                            </div>
                        </div>
                    )
                })()}
            </div>

            {/* ─── MODULES DOCK ROW ─── */}
            <div className="rounded-3xl border border-white/8 bg-card/50 backdrop-blur-xl p-3 flex items-center gap-2 overflow-x-auto custom-scrollbar shadow-inner">
                {modules.map((mod, i) => (
                    <Link key={i} href={mod.href} className="flex-shrink-0 relative group">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-secondary/80 transition-all border border-transparent hover:border-white/5">
                            <div className={`w-8 h-8 rounded-lg ${mod.color.replace('text-', 'bg-').replace('-400', '-500/10').replace('-500', '-500/10')} flex items-center justify-center ${mod.color} border border-white/5`}>
                                {mod.icon}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">{mod.label}</h3>
                                <p className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">{mod.count}</p>
                            </div>
                        </div>
                        {i !== modules.length - 1 && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-6 bg-border/50 group-hover:opacity-0 transition-opacity" />}
                    </Link>
                ))}
            </div>

            {/* ─── Bottom 2-col Layout ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2">
                    <TodaysTasksWidget userId={userId || ''} />
                </div>

                {/* Life Goals Section */}
                <div className="lg:col-span-3">
                    <LifeGoals userId={userId || ''} />
                </div>
            </div>

            {/* ─── BENTO ROW 4: Recent Activity Strip ─── */}
            <div className="rounded-3xl border border-white/8 bg-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-secondary/20 shadow-inner">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                            <Bell className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Recent Activity Radar</h3>
                    </div>
                </div>
                <div className="bg-card px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Leads */}
                    <Link href="/dashboard/pipeline" className="group rounded-2xl p-5 border border-white/5 bg-secondary/10 hover:bg-secondary/30 transition-all">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center"><KanbanSquare className="w-3 h-3 text-blue-400" /></div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Latest Leads</p>
                            </div>
                            <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="space-y-4">
                            {leads.slice(0, 3).map((l, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-foreground truncate">{l.name || 'Unnamed'}</span>
                                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2.5 flex items-center justify-center rounded-full ml-2 shrink-0 h-5 border border-blue-500/20">{l.status}</span>
                                </div>
                            ))}
                            {leads.length === 0 && <p className="text-xs text-muted-foreground italic mt-2">No active leads</p>}
                        </div>
                    </Link>
                    {/* Active Deliverables */}
                    <Link href="/dashboard/deliverables" className="group rounded-2xl p-5 border border-white/5 bg-secondary/10 hover:bg-secondary/30 transition-all">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center"><PackageCheck className="w-3 h-3 text-emerald-400" /></div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Tasks</p>
                            </div>
                            <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="space-y-4">
                            {deliverables.filter(d => d.status !== 'completed').slice(0, 3).map((d, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-foreground truncate">{d.title || d.project_name || 'Task'}</span>
                                    <span className={`text-[10px] font-bold px-2.5 flex items-center justify-center rounded-full ml-2 shrink-0 h-5 border ${d.status === 'in-progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-secondary/80 border-white/5 text-muted-foreground'}`}>{d.status}</span>
                                </div>
                            ))}
                            {deliverables.filter(d => d.status !== 'completed').length === 0 && <p className="text-xs text-muted-foreground italic mt-2">All tasks complete</p>}
                        </div>
                    </Link>
                    {/* Upcoming Posts */}
                    <Link href="/dashboard/content" className="group rounded-2xl p-5 border border-white/5 bg-secondary/10 hover:bg-secondary/30 transition-all">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-pink-500/10 flex items-center justify-center"><CalendarDays className="w-3 h-3 text-pink-400" /></div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Upcoming Posts</p>
                            </div>
                            <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="space-y-4">
                            {posts.filter(p => p.status !== 'Published').slice(0, 3).map((p, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-foreground truncate">{p.title || 'Draft Post'}</span>
                                    <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-2.5 flex items-center justify-center rounded-full ml-2 shrink-0 h-5 border border-pink-500/20">{p.platform}</span>
                                </div>
                            ))}
                            {posts.filter(p => p.status !== 'Published').length === 0 && <p className="text-xs text-muted-foreground italic mt-2">No planned posts</p>}
                        </div>
                    </Link>
                </div>
            </div>
        </div >
    )
}
