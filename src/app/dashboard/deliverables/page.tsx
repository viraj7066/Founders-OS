import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DeliverableList } from '@/components/deliverables/deliverable-list'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function DeliverablesPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    // Fetch clients
    const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

    // Fetch deliverables with client name joined
    const { data: deliverablesData } = await supabase
        .from('deliverables')
        .select(`
            *,
            client:clients(name)
        `)
        .order('due_date', { ascending: true })

    // Map database shape to our frontend Deliverable type
    const deliverables = (deliverablesData || []).map(d => ({
        id: d.id,
        clientId: d.client_id,
        clientName: d.client?.name || 'Unknown Client',
        title: d.title,
        status: d.status,
        priority: d.priority,
        dueDate: d.due_date,
        assignedTo: d.assigned_to || 'Unassigned'
    }))

    const initialClients = (clientsData || []).map(c => ({
        id: c.id,
        name: c.name
    }))

    // Get user id if available (for RLS). Falls back to a placeholder for dev.
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center pr-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Delivery Tracker</h1>
                        <p className="text-muted-foreground mt-1">Cross-client operational tasks and deadlines.</p>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 pt-6">
                    <DeliverableList
                        initialDeliverables={deliverables}
                        initialClients={initialClients}
                        userId={userId}
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}
