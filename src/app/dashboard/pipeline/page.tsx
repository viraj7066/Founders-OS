import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { KanbanBoard } from '@/components/crm/kanban-board'
import { Lead } from '@/types/crm'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function PipelinePage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
    )

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
