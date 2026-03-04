import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { FinancialDashboard } from '@/components/financials/financial-overview'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export default async function FinancialsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'

    const [{ data: clients }, { data: expenses }, { data: invoices }] = await Promise.all([
        supabase
            .from('clients')
            .select('id, name, mrr, status, service_type, created_at')
            .eq('user_id', userId)
            .order('mrr', { ascending: false }),
        supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false }),
        supabase
            .from('invoices')
            .select('id, amount, status, date')
            .eq('user_id', userId)
            .order('date', { ascending: false })
    ])

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Engine</h1>
                    <p className="text-muted-foreground mt-1">Real-time revenue, expenses, and profit tracking from your agency data.</p>
                </div>
                <FinancialDashboard
                    clients={clients || []}
                    expenses={expenses || []}
                    invoices={invoices || []}
                    userId={userId}
                />
            </div>
        </DashboardLayout>
    )
}
