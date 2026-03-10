import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DeliverableList } from '@/components/deliverables/deliverable-list'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Deliverables',
}


export const dynamic = 'force-dynamic'
export default async function DeliverablesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    if (!userId) {
        redirect('/login')
    }

    // Fetch clients
    const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', userId)
        .order('name', { ascending: true })

    // Fetch deliverables with client name joined
    const { data: deliverablesData } = await supabase
        .from('deliverables')
        .select(`
            *,
            client:clients(name)
        `)
        .eq('user_id', userId)
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

    // Get user id (satisfied above)

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
