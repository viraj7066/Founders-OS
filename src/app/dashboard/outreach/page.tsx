import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { OutreachDashboard } from '@/components/outreach/outreach-dashboard'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function OutreachPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'

    // Fetch Scripts
    const { data: scriptsData } = await supabase
        .from('outreach_scripts')
        .select('*')
        .order('created_at', { ascending: false })

    const scripts = (scriptsData || []).map(s => ({
        id: s.id,
        userId: s.user_id,
        title: s.title,
        platform: s.platform,
        category: s.category,
        content: s.content,
        createdAt: s.created_at,
        updatedAt: s.updated_at
    }))

    // Fetch Active Campaigns
    const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

    const campaigns = (campaignsData || []).map(c => ({
        id: c.id,
        userId: c.user_id,
        name: c.name,
        status: c.status,
        targetAudience: c.target_audience,
        createdAt: c.created_at,
        updatedAt: c.updated_at
    }))

    // Fetch Today's Follow-ups
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: followupsData } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('due', todayStr)
        .eq('completed', false)
        .order('created_at', { ascending: false })

    const followups = (followupsData || []).map(f => ({
        id: f.id,
        company: f.company,
        name: f.name,
        action: f.action,
        due: f.due,
        completed: f.completed
    }))

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center pr-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Outreach System</h1>
                        <p className="text-muted-foreground mt-1">Manage message templates, active campaigns, and follow-ups.</p>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 pt-6">
                    <OutreachDashboard
                        initialScripts={scripts}
                        initialCampaigns={campaigns}
                        initialFollowups={followups}
                        userId={userId}
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}
