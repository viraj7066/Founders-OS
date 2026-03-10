import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'

export const metadata = {
  title: 'Login',
}


export default async function LoginPage() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session) redirect('/dashboard')
    return <LoginForm />
}
