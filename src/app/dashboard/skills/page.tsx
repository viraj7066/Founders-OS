import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SkillsDashboard } from "@/components/skills/skills-dashboard"
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export const metadata = {
    title: "Skills Tracker | Venture Deck",
    description: "Track your learning progress and mastery.",
}

export default async function SkillsPage() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <DashboardLayout>
            <div className="flex-1 w-full h-full p-2 max-w-[1600px] mx-auto flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Skills Tracker</h1>
                    <p className="text-sm text-muted-foreground">Manage your learning journey, track daily practice streaks, and achieve mastery.</p>
                </div>

                <SkillsDashboard
                    userId={user.id}
                    initialSkills={skills || []}
                />
            </div>
        </DashboardLayout>
    )
}
