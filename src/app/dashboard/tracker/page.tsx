import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DailyActionTracker } from '@/components/dashboard/daily-action-tracker'

export default function TrackerPage() {
    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Daily Action Tracker</h1>
                    <p className="text-muted-foreground mt-1">Track your daily outreach volume, focus tasks, and follow-up triggers.</p>
                </div>
                <DailyActionTracker />
            </div>
        </DashboardLayout>
    )
}
