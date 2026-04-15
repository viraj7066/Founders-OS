'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { FinancialDashboard } from '@/components/financials/financial-overview'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function FinancialsPage() {
    const supabase = createClient()
    const router = useRouter()

    const [mounted, setMounted] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [clients, setClients] = useState<any[]>([])
    const [expenses, setExpenses] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)

    useEffect(() => {
        document.title = 'Financial Engine'
        setMounted(true)

        const fetchAll = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user?.id) { router.push('/login'); return }
                setUserId(user.id)

                // Fetch expenses and invoices in parallel
                const [expensesRes, invoicesRes] = await Promise.all([
                    supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
                    supabase.from('invoices')
                        .select('id, amount, status, date, advance_collected, advance_amount, payment_details_json')
                        .eq('user_id', user.id).order('date', { ascending: false }),
                ])

                // Fetch clients — try with service column first, fallback without it
                // (handles case where migration-phase34 hasn't been run yet)
                let clientData: any[] = []
                const { data: clientsWithService, error: serviceErr } = await supabase
                    .from('clients')
                    .select('id, name, mrr, status, service_type, service, created_at')
                    .eq('user_id', user.id)
                    .order('mrr', { ascending: false })

                if (!serviceErr && clientsWithService) {
                    clientData = clientsWithService
                } else {
                    // service column missing — fallback without it
                    console.warn('service column not found, falling back:', serviceErr?.message)
                    const { data: clientsFallback, error: fallbackErr } = await supabase
                        .from('clients')
                        .select('id, name, mrr, status, service_type, created_at')
                        .eq('user_id', user.id)
                        .order('mrr', { ascending: false })

                    if (!fallbackErr && clientsFallback) {
                        clientData = clientsFallback
                    } else {
                        // Last resort — select everything
                        const { data: clientsAll } = await supabase
                            .from('clients')
                            .select('*')
                            .eq('user_id', user.id)
                        clientData = clientsAll || []
                    }
                }

                console.log(`[Financials] Loaded ${clientData.length} clients`)
                if (clientData.length > 0) {
                    const statuses = [...new Set(clientData.map((c: any) => c.status))]
                    const mrrs = clientData.map((c: any) => `${c.name}: ₹${c.mrr || 0} (${c.status})`)
                    console.log('[Financials] Status values in DB:', statuses)
                    console.log('[Financials] Client MRRs:', mrrs)
                }

                setClients(clientData)
                setExpenses(expensesRes.data || [])
                setInvoices(invoicesRes.data || [])
            } catch (err: any) {
                console.error('[Financials] Fetch error:', err)
                setFetchError(err?.message || 'Failed to load data')
            } finally {
                setIsLoading(false)
            }
        }

        fetchAll()
    }, [])

    return (
        <DashboardLayout>
            {mounted && (
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Engine</h1>
                        <p className="text-muted-foreground mt-1">
                            Real-time revenue, expenses, and profit tracking from your agency data.
                        </p>
                    </div>

                    {fetchError && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            Error loading data: {fetchError}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-32 bg-secondary rounded-2xl" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-24 bg-secondary rounded-xl" />
                                ))}
                            </div>
                            <div className="h-64 bg-secondary rounded-2xl" />
                        </div>
                    ) : (
                        <FinancialDashboard
                            clients={clients}
                            expenses={expenses}
                            invoices={invoices}
                            userId={userId || ''}
                        />
                    )}
                </div>
            )}
        </DashboardLayout>
    )
}
