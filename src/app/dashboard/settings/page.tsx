import { SettingsPanel } from '@/components/settings/settings-panel'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
    title: 'Settings',
}

export const dynamic = 'force-dynamic'
export default async function SettingsPage() {
    let userProfile: any = {}

    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
            userProfile = {
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
                agency_name: session.user.user_metadata?.agency_name || '',
                phone: session.user.user_metadata?.phone || '',
                website: session.user.user_metadata?.website || '',
            }
        }
    } catch (e) {
        console.error('Settings page auth error:', e)
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your account, agency, and preferences.</p>
            </div>
            <SettingsPanel initialProfile={userProfile} />
        </div>
    )
}
