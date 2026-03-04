import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { IPVaultDashboard } from '@/components/vault/ip-vault-dashboard'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export default async function VaultPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    if (!userId) {
        redirect('/login')
    }

    const { data: prompts } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">IP & Asset Vault</h1>
                    <p className="text-muted-foreground mt-1">Manage your proven AI prompts, SOPs, and standard client materials.</p>
                </div>

                <IPVaultDashboard initialPrompts={prompts || []} userId={userId} />
            </div>
        </DashboardLayout>
    )
}
