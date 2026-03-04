import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
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

    const payload = {
        user_id: '00000000-0000-0000-0000-000000000000',
        name: 'Test Client',
        company: 'Test Company',
        status: 'active'
    }

    const { data, error } = await supabase
        .from('clients')
        .insert(payload)
        .select()

    const fs = require('fs')
    fs.writeFileSync('supabase-client-error.json', JSON.stringify({ error, data }, null, 2))

    return NextResponse.json({ success: !error, error, data })
}
