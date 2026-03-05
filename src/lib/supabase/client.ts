import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Fallback for build time static generation
    if (!url || !anonKey) {
        console.warn('Supabase credentials missing. Using placeholder URL.')
        return createBrowserClient(
            'https://xyz.supabase.co',
            'placeholder'
        )
    }

    return createBrowserClient(url, anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    })
}
