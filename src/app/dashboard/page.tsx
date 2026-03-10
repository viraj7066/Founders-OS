import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { HomeDashboard } from '@/components/dashboard/home-dashboard'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Dashboard',
}


export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    if (!userId) {
        redirect('/login')
    }

    // Fetch all key data in parallel for the dashboard overview
    const [
        { data: clients },
        { data: leads },
        { data: deliverables },
        { data: scripts },
        { data: posts },
        { data: members },
        { data: prompts },
    ] = await Promise.all([
        supabase.from('clients').select('id, name, status, mrr, health_score'),
        supabase.from('leads').select('id, name, company, status'),
        supabase.from('deliverables').select('id, title, status, due_date, client_id'),
        supabase.from('outreach_scripts').select('*'),
        supabase.from('content_posts').select('id, title, status, platform, scheduled_date'),
        supabase.from('team_members').select('id, name, role, status, tasks_completed, tasks_assigned'),
        supabase.from('ai_prompts').select('id, title, category, is_proven_winner'),
    ])

    const stats = {
        clients: clients || [],
        leads: leads || [],
        deliverables: deliverables || [],
        scripts: scripts || [],
        posts: posts || [],
        members: members || [],
        prompts: prompts || [],
    }

    return (
        <DashboardLayout>
            <HomeDashboard stats={stats} />
        </DashboardLayout>
    )
}
