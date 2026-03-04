import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { IPVaultDashboard } from '@/components/vault/ip-vault-dashboard'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function VaultPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
            },
        }
    )

    // For local dev, bypass auth and use dummy user
    const userId = '00000000-0000-0000-0000-000000000000'

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
