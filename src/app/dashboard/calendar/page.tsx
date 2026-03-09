import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TaskCalendar } from "@/components/tasks/task-calendar"
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export const metadata = {
    title: "Task Calendar | Venture Deck",
    description: "Manage your tasks and schedule.",
}

export default async function CalendarPage() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // Fetch initial tasks Server-Side for fast initial render
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    // Fetch task stats for streaks
    const { data: stats } = await supabase
        .from('task_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

    return (
        <DashboardLayout>
            <div className="flex-1 w-full h-full p-2 max-w-[1600px] mx-auto flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Task Calendar</h1>
                    <p className="text-sm text-muted-foreground">Manage your sprint, track daily tasks, and maintain your streak.</p>
                </div>

                <TaskCalendar
                    userId={user.id}
                    initialTasks={tasks || []}
                    initialStats={stats || null}
                />
            </div>
        </DashboardLayout>
    )
}
