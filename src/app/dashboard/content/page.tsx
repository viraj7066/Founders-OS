import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ContentCalendarDashboard } from '@/components/content/content-calendar-dashboard'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export default async function ContentPage() {
    const supabase = await createClient()

    const userId = '00000000-0000-0000-0000-000000000000'

    const { data: posts } = await supabase
        .from('content_posts')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_date', { ascending: true })

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Content Calendar</h1>
                    <p className="text-muted-foreground mt-1">Plan, schedule, and track your content across all platforms.</p>
                </div>
                <ContentCalendarDashboard initialPosts={posts || []} userId={userId} />
            </div>
        </DashboardLayout>
    )
}
