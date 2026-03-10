import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { KanbanBoard } from '@/components/crm/kanban-board'
import { Lead } from '@/types/crm'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'CRM Pipeline',
}


export const dynamic = 'force-dynamic'
export default async function PipelinePage() {
    const supabase = await createClient()

    // No user_id filter required right now as per instructions to let all leads sync
    const { data: leadsData } = await supabase.from('leads').select('*').order('created_at', { ascending: false })

    const initialLeads: Lead[] = (leadsData || []).map(lead => ({
        id: lead.id,
        name: lead.name,
        company: lead.company,
        email: lead.email,
        stage: lead.status as any,
        value: lead.value,
        service: lead.service
    }))

    return (
        <DashboardLayout>
            <KanbanBoard initialLeads={initialLeads} />
        </DashboardLayout>
    )
}
