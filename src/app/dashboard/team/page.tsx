import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TeamDashboard } from '@/components/team/team-dashboard'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export default async function TeamPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    if (!userId) {
        return null // Middleware should handle redirect, but being safe
    }

    const { data: members } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Team & Delegation</h1>
                    <p className="text-muted-foreground mt-1">Manage your VAs, freelancers, and contractors. Track performance and costs.</p>
                </div>
                <TeamDashboard initialMembers={members || []} userId={userId} />
            </div>
        </DashboardLayout>
    )
}
