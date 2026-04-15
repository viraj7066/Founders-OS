'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    TrendingUp, TrendingDown,
    Plus, Trash2, PackageMinus, CircleDollarSign, Target, Wallet, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'

interface Client { id: string; name: string; mrr: number; status: string; service_type?: string; service?: string }
interface Expense { id: string; user_id: string; label: string; amount: number; category: string; date: string; recurring: boolean }

interface Props {
    clients: Client[]
    expenses: Expense[]
    invoices: {
        id: string
        amount: number
        status: string
        date: string
        advance_collected?: boolean
        advance_amount?: number
        payment_details_json?: any
    }[]
    userId: string
}

const MRR_GOAL = 1000000

const EXPENSE_CATEGORIES = ['Tools & Software', 'Team & Payroll', 'Ads & Marketing', 'Office & Operations', 'Freelancers', 'Miscellaneous']

const CATEGORY_PILL: Record<string, string> = {
    'Tools & Software': 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/50',
    'Team & Payroll': 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/50',
    'Ads & Marketing': 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50',
    'Office & Operations': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50',
    'Freelancers': 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/50',
    'Miscellaneous': 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700',
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#64748b']
const INVOICE_COLORS = { Paid: '#10b981', Pending: '#f59e0b', Overdue: '#ef4444' }

export function FinancialDashboard({ clients: initialClients, expenses: initialExpenses, invoices, userId }: Props) {
    const supabase = createClient()
    // initialClients is already fetched client-side by the page, so use directly
    const [clients] = useState<Client[]>(initialClients)
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [newExpense, setNewExpense] = useState({
        label: '', amount: '', category: 'Tools & Software',
        date: new Date().toISOString().split('T')[0], recurring: false,
    })

    // ── Calculations ──────────────────────────────────────────────────────────
    // Active = any status that is NOT churned / cancelled / inactive / lost
    // Handles: 'active', 'Active', 'ACTIVE', 'Retainer', 'retainer', etc.
    const INACTIVE_STATUSES = ['churned', 'cancelled', 'inactive', 'lost', 'at-risk', 'at_risk']
    const activeClients = clients.filter(c => {
        const s = (c.status || '').toLowerCase().trim()
        return s !== '' && !INACTIVE_STATUSES.includes(s)
    })

    // MRR — use activeClients; if that's empty, fall back to ALL clients with MRR > 0
    const mrrClients = activeClients.length > 0
        ? activeClients
        : clients.filter(c => (c.mrr || 0) > 0)

    const totalMRR = mrrClients.reduce((s, c) => s + (Number(c.mrr) || 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const recurringExpenses = expenses.filter(e => e.recurring).reduce((s, e) => s + (e.amount || 0), 0)
    // realized revenue = fully Paid invoices + advance-only collected on Sent invoices
    const realizedRevenue = invoices?.reduce((s, i) => {
        if (i.status === 'Paid') return s + (i.amount || 0)
        if (i.advance_collected) {
            const adv = i.advance_amount || i.payment_details_json?.advance || 0
            return s + adv
        }
        return s
    }, 0) || 0
    const effectiveRevenue = realizedRevenue > 0 ? realizedRevenue : totalMRR
    const netProfit = effectiveRevenue - totalExpenses
    const profitMargin = effectiveRevenue > 0 ? Math.round((netProfit / effectiveRevenue) * 100) : 0
    const arr = totalMRR * 12
    const mrrProgress = Math.min((effectiveRevenue / MRR_GOAL) * 100, 100)
    const mrrToGoal = Math.max(MRR_GOAL - effectiveRevenue, 0)

    // MRR by Service — from all clients with MRR, grouped by service label
    const serviceBreakdown = mrrClients
        .filter(c => (Number(c.mrr) || 0) > 0)
        .reduce<Record<string, number>>((acc, c) => {
            const key = (c.service || c.service_type || c.status || 'Other').trim()
            acc[key] = (acc[key] || 0) + (Number(c.mrr) || 0)
            return acc
        }, {})


    const fmtShort = (v: number) => v >= 100000
        ? `₹${(v / 100000).toFixed(2)}L`
        : `₹${Math.abs(v).toLocaleString()}`

    const handleAddExpense = async () => {
        if (!newExpense.label.trim() || !newExpense.amount) { toast.error('Label and amount are required'); return }
        setIsSaving(true)
        const payload = {
            user_id: userId,
            label: newExpense.label.trim(),
            amount: parseFloat(newExpense.amount),
            category: newExpense.category,
            date: newExpense.date,
            recurring: newExpense.recurring,
        }
        const { data, error } = await supabase.from('expenses').insert(payload).select().single()
        if (!error && data) {
            setExpenses(prev => [data as Expense, ...prev])
            setIsAddExpenseOpen(false)
            setNewExpense({ label: '', amount: '', category: 'Tools & Software', date: new Date().toISOString().split('T')[0], recurring: false })
            toast.success('Expense added!')
        } else {
            toast.error(error?.message || 'Failed to add expense')
        }
        setIsSaving(false)
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        const { error } = await supabase.from('expenses').delete().eq('id', deleteTarget.id)
        if (!error) {
            setExpenses(prev => prev.filter(e => e.id !== deleteTarget.id))
            toast.success('Expense removed')
        } else {
            toast.error('Failed to delete expense')
        }
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const invoicePieData = (() => {
        let paidValue = 0, pendingValue = 0, overdueValue = 0
        invoices.forEach(i => {
            const adv = i.advance_collected ? (i.advance_amount || i.payment_details_json?.advance || 0) : 0
            if (i.status === 'Paid') {
                paidValue += i.amount
            } else if (i.status === 'Overdue') {
                paidValue += adv                    // advance portion counts as paid
                overdueValue += (i.amount - adv)    // remaining is overdue
            } else {
                paidValue += adv                    // advance portion counts as paid
                pendingValue += (i.amount - adv)    // remaining is still pending
            }
        })
        return [
            { name: 'Collected', value: paidValue, color: INVOICE_COLORS.Paid },
            { name: 'Pending', value: pendingValue, color: INVOICE_COLORS.Pending },
            { name: 'Overdue', value: overdueValue, color: INVOICE_COLORS.Overdue },
        ].filter(d => d.value > 0)
    })()


    // ── Monthly Revenue Logic ──
    const last6Months = eachMonthOfInterval({
        start: subMonths(startOfMonth(new Date()), 5),
        end: startOfMonth(new Date())
    })

    const monthlyData = last6Months.map(month => {
        const monthStr = format(month, 'yyyy-MM')
        const monthLabel = format(month, 'MMM yy')
        const revenue = invoices
            .filter(i => i.status === 'Paid' && i.date && i.date.startsWith(monthStr))
            .reduce((sum, i) => sum + (i.amount || 0), 0)
        return { name: monthLabel, revenue }
    })

    const tooltipStyle = {
        backgroundColor: 'var(--popover)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        color: 'var(--popover-foreground)',
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    }

    return (
        <div className="space-y-6 pb-12">

            {/* ── 1. GOAL TRACKER (top) ── */}
            <div className="bg-card border border-border rounded-2xl px-8 py-6">
                {/* Title row */}
                <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-foreground">Path to ₹10L Revenue</span>
                </div>

                {/* Big number + badges row */}
                <div className="flex items-start justify-between gap-6 mb-2">
                    <div>
                        {/* Large current / goal display */}
                        <div className="flex items-baseline gap-3">
                            <span className="text-5xl font-extrabold tracking-tight text-foreground leading-none">
                                {effectiveRevenue >= 100000
                                    ? `₹${(effectiveRevenue / 100000).toFixed(2)}L`
                                    : `₹${effectiveRevenue.toLocaleString()}`}
                            </span>
                            <span className="text-xl font-semibold text-muted-foreground">/ ₹10L</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            ₹{mrrToGoal.toLocaleString()} remaining to hit your goal
                        </p>
                    </div>

                    {/* Stat badges */}
                    <div className="flex gap-3 shrink-0 flex-wrap justify-end">
                        <div className="text-center px-5 py-3 rounded-xl border border-border bg-muted/40 min-w-[90px]">
                            <p className="text-xl font-bold text-primary leading-tight">{mrrProgress.toFixed(1)}%</p>
                            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">Complete</p>
                        </div>
                        <div className="text-center px-5 py-3 rounded-xl border border-border bg-muted/40 min-w-[90px]">
                            <p className="text-xl font-bold text-foreground leading-tight">
                                {arr >= 100000 ? `₹${(arr / 100000).toFixed(1)}L` : `₹${arr.toLocaleString()}`}
                            </p>
                            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">ARR</p>
                        </div>
                        {mrrToGoal > 0 && (
                            <div className="text-center px-5 py-3 rounded-xl border border-border bg-muted/40 min-w-[90px]">
                                <p className="text-xl font-bold text-foreground leading-tight">
                                    {mrrToGoal >= 100000 ? `₹${(mrrToGoal / 100000).toFixed(2)}L` : `₹${mrrToGoal.toLocaleString()}`}
                                </p>
                                <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">Remaining</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress bar + milestones */}
                <div className="mt-5">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.max(mrrProgress, mrrProgress > 0 ? 0.5 : 0)}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] font-medium text-muted-foreground">
                        <span>₹0</span>
                        <span className={mrrProgress >= 25 ? 'text-primary font-semibold' : ''}>₹2.5L</span>
                        <span className={mrrProgress >= 50 ? 'text-primary font-semibold' : ''}>₹5L</span>
                        <span className={mrrProgress >= 75 ? 'text-primary font-semibold' : ''}>₹7.5L</span>
                        <span className={mrrProgress >= 100 ? 'text-primary font-semibold' : ''}>₹10L</span>
                    </div>
                </div>
            </div>

            {/* ── 2. HERO STATS (below goal tracker) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
                <div className="bg-card px-8 py-7 flex flex-col gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                        Monthly Revenue
                    </p>
                    <p className="text-4xl font-bold tracking-tight text-foreground">{fmtShort(totalMRR)}</p>
                    <p className="text-xs text-muted-foreground">{activeClients.length} active client{activeClients.length !== 1 ? 's' : ''}</p>
                </div>

                <div className="bg-card px-8 py-7 flex flex-col gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                        {netProfit >= 0
                            ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                            : <TrendingDown className="w-3 h-3 text-red-500" />}
                        Net Profit
                    </p>
                    <p className={`text-4xl font-bold tracking-tight ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {netProfit < 0 ? '-' : ''}{fmtShort(netProfit)}
                    </p>
                    <span className="text-xs text-muted-foreground bg-muted inline-flex w-fit px-2 py-0.5 rounded-full">
                        {profitMargin}% margin
                    </span>
                </div>

                <div className="bg-card px-8 py-7 flex flex-col gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                        <PackageMinus className="w-3 h-3 text-amber-500" />
                        Monthly Burn
                    </p>
                    <p className="text-4xl font-bold tracking-tight text-foreground">{fmtShort(totalExpenses)}</p>
                    <p className="text-xs text-muted-foreground">₹{recurringExpenses.toLocaleString()} recurring</p>
                </div>
            </div>

            {/* ── 3. ANALYTICS GRID ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

                {/* Charts (8 col) */}
                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">

                    {/* Revenue Sources */}
                    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                            <CircleDollarSign className="w-3.5 h-3.5" />
                            Revenue Sources
                        </h3>
                        <p className="text-sm font-medium text-foreground mb-4">MRR by Service</p>
                        <div className="h-52 w-full">
                            {Object.keys(serviceBreakdown).length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No active retainers yet</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(serviceBreakdown).map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }))}
                                            cx="50%" cy="50%" innerRadius={55} outerRadius={75}
                                            paddingAngle={6} dataKey="value" stroke="none" cornerRadius={6}
                                        >
                                            {Object.entries(serviceBreakdown).map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, '']} contentStyle={tooltipStyle} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--muted-foreground)', paddingTop: '8px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        {/* MRR by Service breakdown list */}
                        {Object.keys(serviceBreakdown).length > 0 && (
                            <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                                {Object.entries(serviceBreakdown).map(([svc, amt]) => (
                                    <div key={svc} className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">{svc}</span>
                                        <span className="font-semibold text-foreground">₹{(amt as number).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cashflow Pipeline */}
                    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5" />
                            Cashflow Pipeline
                        </h3>
                        <p className="text-sm font-medium text-foreground mb-4">Invoice Health</p>
                        <div className="h-52 w-full">
                            {invoicePieData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No invoice data yet</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={invoicePieData}
                                            cx="50%" cy="50%" innerRadius={55} outerRadius={75}
                                            paddingAngle={6} dataKey="value" stroke="none" cornerRadius={6}
                                        >
                                            {invoicePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                        <RechartsTooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, '']} contentStyle={tooltipStyle} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--muted-foreground)', paddingTop: '8px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Burn Ledger (4 col) */}
                <div className="md:col-span-4 bg-card border border-border rounded-2xl flex flex-col min-h-[340px]">
                    <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-border">
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Burn Ledger</h3>
                            <p className="text-sm font-medium text-foreground mt-0.5">Monthly Expenses</p>
                        </div>
                        <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="outline" className="w-8 h-8 rounded-full">
                                    <Plus className="w-3.5 h-3.5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[420px] rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-semibold">Log Expense</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 pt-2">
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Label</label>
                                        <Input value={newExpense.label} onChange={e => setNewExpense({ ...newExpense, label: e.target.value })} placeholder="e.g. Framer Pro" className="h-10 rounded-lg" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount (₹)</label>
                                            <Input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0" className="h-10 rounded-lg" />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
                                            <Input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className="h-10 rounded-lg" />
                                        </div>
                                    </div>
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                                        <Select value={newExpense.category} onValueChange={(val) => setNewExpense({ ...newExpense, category: val })}>
                                            <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors">
                                        <input type="checkbox" checked={newExpense.recurring} onChange={e => setNewExpense({ ...newExpense, recurring: e.target.checked })} className="w-4 h-4 accent-primary rounded" />
                                        <span className="text-sm text-foreground">Recurring monthly</span>
                                    </label>
                                </div>
                                <DialogFooter className="mt-2">
                                    <Button variant="ghost" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddExpense} disabled={isSaving}>
                                        {isSaving ? 'Saving…' : 'Add Expense'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="px-6 flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto space-y-2 py-4 max-h-[260px] pr-1">
                            {expenses.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-10 gap-3 opacity-60">
                                    <PackageMinus className="w-8 h-8 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">No expenses logged yet</p>
                                </div>
                            ) : (
                                expenses.map(exp => (
                                    <div key={exp.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors group border border-transparent hover:border-border">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-sm font-medium text-foreground truncate">{exp.label}</span>
                                                {exp.recurring && (
                                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 shrink-0">Rec</span>
                                                )}
                                            </div>
                                            <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_PILL[exp.category] || CATEGORY_PILL['Miscellaneous']}`}>
                                                {exp.category}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-sm font-semibold text-foreground">₹{(exp.amount || 0).toLocaleString()}</span>
                                            <button
                                                onClick={() => setDeleteTarget(exp)}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {expenses.length > 0 && (
                            <div className="border-t border-border py-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recurring</p>
                                    <p className="text-base font-semibold text-foreground">₹{recurringExpenses.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Burn</p>
                                    <p className="text-xl font-bold text-foreground">₹{totalExpenses.toLocaleString()}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 4. MONTHLY REVENUE BREAKDOWN ── */}
            <Card className="bg-card border border-border rounded-2xl overflow-hidden mt-6">
                <CardHeader className="px-8 pt-6 pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                Monthly Revenue Breakdown
                            </CardTitle>
                            <CardDescription>Agency revenue generated month-wise over the last 6 months</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-8 pb-8 pt-4">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                                    tickFormatter={(value) => value >= 100000 ? `₹${value / 100000}L` : `₹${value / 1000}k`}
                                />
                                <RechartsTooltip
                                    contentStyle={tooltipStyle}
                                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                                    formatter={(value: any) => [`₹${(Number(value) || 0).toLocaleString()}`, 'Revenue']}
                                />
                                <Bar
                                    dataKey="revenue"
                                    fill="var(--primary)"
                                    radius={[6, 6, 0, 0]}
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* ── EMPTY STATE ── */}
            {totalMRR === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-12 flex flex-col items-center justify-center bg-muted/20 gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <CircleDollarSign className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-base font-semibold text-foreground">No revenue data yet</p>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                        Add active clients with MRR in the Clients module to populate your financial dashboard.
                    </p>
                </div>
            )}

            {/* ── DELETE CONFIRMATION ── */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
                <DialogContent className="sm:max-w-[380px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Delete Expense?
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground pt-1">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-foreground">"{deleteTarget?.label}"</span>
                            {' '}(₹{(deleteTarget?.amount || 0).toLocaleString()})? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-2 gap-2">
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
