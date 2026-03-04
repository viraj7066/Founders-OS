import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TeamDashboard } from '@/components/team/team-dashboard'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function TeamPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
    )

    const userId = '00000000-0000-0000-0000-000000000000'

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
