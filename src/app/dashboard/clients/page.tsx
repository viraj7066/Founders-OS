import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ClientList } from '@/components/clients/client-list'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Client Management',
}


export const dynamic = 'force-dynamic'
export default async function ClientsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    if (!userId) {
        redirect('/login')
    }

    // Fetch clients
    const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })

    const clients = (clientsData || []).map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        status: c.status,
        healthScore: c.health_score,
        mrr: c.mrr,
        onboardedAt: c.onboarded_at,
        email: c.email || '',
        phone: c.phone || ''
    }))

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center pr-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Client Database</h1>
                        <p className="text-muted-foreground mt-1">Manage active retainers, monitor account health, and track deliverables.</p>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 pt-6">
                    <ClientList initialClients={clients} userId={userId} />
                </div>
            </div>
        </DashboardLayout>
    )
}
