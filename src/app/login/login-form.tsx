'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, AlertCircle, Zap, ArrowRight } from 'lucide-react'

export default function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        // Check if we are using the placeholder URL
        if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('xyz.supabase.co') || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
            setError('Configuration Error: Your Supabase URL and Key are missing in Vercel. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your project settings.')
            setIsLoading(false)
            return
        }

        try {
            console.log('Attempting Supabase login...');
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

            if (signInError) {
                let msg = signInError.message
                if (msg.toLowerCase().includes('fetch')) {
                    msg = `Network Error: Failed to reach your database. Please double-check that your NEXT_PUBLIC_SUPABASE_URL in Vercel is exactly right (including https://) and that your Supabase project isn't paused.`
                }
                setError(msg)
                setIsLoading(false)
                return
            }
            router.push('/dashboard')
            router.refresh()
        } catch (err: any) {
            let msg = err.message || 'Unknown error'
            if (msg.toLowerCase().includes('fetch')) {
                msg = `Network Error: Failed to reach your database. Please confirm your Supabase URL in Vercel and check your internet connection.`
            }
            console.error('Login error detail:', err);
            setError(`Connection Error: ${msg}`)
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background glow orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-400/5 blur-[100px] pointer-events-none" />

            {/* Subtle grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.015)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

            <div className="relative w-full max-w-md">
                {/* Logo / Brand mark */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-orange-400 shadow-xl shadow-primary/25 mb-4">
                        <Zap className="w-7 h-7 text-white" fill="white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Founder's OS</h1>
                    <p className="text-sm text-white/40 mt-1">Your agency command center</p>
                </div>

                {/* Card */}
                <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
                    {/* Top shimmer line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

                    <div className="p-8">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-white">Welcome back</h2>
                            <p className="text-sm text-white/40 mt-0.5">Enter your credentials to continue</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && (
                                <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="founder@agency.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary to-orange-400 hover:from-primary/90 hover:to-orange-400/90 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign in to dashboard
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Bottom shimmer line */}
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-white/20 mt-6">
                    Powered by Supabase · Built for Founders
                </p>
            </div>
        </div>
    )
}
