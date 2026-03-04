'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    User, Bell, Shield, Palette, Globe, CreditCard, LogOut,
    Building, Phone, Mail, Link, ChevronRight, Save, Zap, Moon, Sun,
    Check, AlertTriangle, Trash2
} from 'lucide-react'

interface SettingsPanelProps {
    initialProfile?: {
        name?: string
        email?: string
        agency_name?: string
        phone?: string
        website?: string
    }
}

const NAV_ITEMS = [
    { id: 'profile', label: 'Profile', icon: User, description: 'Your personal details' },
    { id: 'agency', label: 'Agency', icon: Building, description: 'Business information' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alerts & reminders' },
    { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme & display' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Password & sessions' },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, description: 'Destructive actions', danger: true },
]

export function SettingsPanel({ initialProfile }: SettingsPanelProps) {
    const supabase = createClient()
    const [activeSection, setActiveSection] = useState('profile')
    const [isSaving, setIsSaving] = useState(false)

    // Profile form
    const [profile, setProfile] = useState({
        name: initialProfile?.name || '',
        email: initialProfile?.email || '',
        agency_name: initialProfile?.agency_name || '',
        phone: initialProfile?.phone || '',
        website: initialProfile?.website || '',
    })

    // Notification toggles
    const [notifications, setNotifications] = useState({
        new_leads: true,
        overdue_deliverables: true,
        invoice_paid: true,
        follow_up_reminders: true,
        weekly_report: false,
    })

    // Appearance
    const [theme, setTheme] = useState<'dark' | 'darker'>('dark')

    // Security
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handleSaveProfile = async () => {
        setIsSaving(true)
        await new Promise(r => setTimeout(r, 600)) // Simulate API
        toast.success('Profile saved successfully')
        setIsSaving(false)
    }

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) { toast.error('Fill in all password fields'); return }
        if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return }
        if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
        setIsSaving(true)
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (!error) {
            toast.success('Password updated successfully')
            setOldPassword(''); setNewPassword(''); setConfirmPassword('')
        } else {
            toast.error(error.message)
        }
        setIsSaving(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    const renderSection = () => {
        switch (activeSection) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Personal Details</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Update your name, email, and contact info.</p>
                        </div>
                        {/* Avatar */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary/20">
                                {profile.name ? profile.name[0].toUpperCase() : 'V'}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">{profile.name || 'Founder'}</p>
                                <p className="text-xs text-muted-foreground">{profile.email || 'founder@agency.com'}</p>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium text-foreground">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Viraj Founder" className="pl-10 bg-secondary/50 border-white/10 focus:border-primary/50" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium text-foreground">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="you@agency.com" className="pl-10 bg-secondary/50 border-white/10 focus:border-primary/50" type="email" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium text-foreground">Phone</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 98765 43210" className="pl-10 bg-secondary/50 border-white/10 focus:border-primary/50" />
                                </div>
                            </div>
                        </div>
                        <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                            <Save className="w-4 h-4" />{isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                )

            case 'agency':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Agency Information</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Your agency's public-facing details.</p>
                        </div>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">Agency Name</Label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input value={profile.agency_name} onChange={e => setProfile({ ...profile, agency_name: e.target.value })} placeholder="Viraj Digital Agency" className="pl-10 bg-secondary/50 border-white/10" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">Website</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input value={profile.website} onChange={e => setProfile({ ...profile, website: e.target.value })} placeholder="https://youragency.com" className="pl-10 bg-secondary/50 border-white/10" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold text-foreground">Goal Tracker</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Your MRR goal is set at <span className="text-primary font-semibold">₹10,00,000</span>. Track progress in Financials.</p>
                        </div>
                        <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                            <Save className="w-4 h-4" />{isSaving ? 'Saving...' : 'Save Agency Info'}
                        </Button>
                    </div>
                )

            case 'notifications':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Control what alerts you receive.</p>
                        </div>
                        <div className="space-y-3">
                            {[
                                { key: 'new_leads', label: 'New Lead Added', desc: 'When a new lead enters your pipeline' },
                                { key: 'overdue_deliverables', label: 'Overdue Deliverables', desc: 'Tasks that have passed their deadline' },
                                { key: 'invoice_paid', label: 'Invoice Paid', desc: 'When a client pays an invoice' },
                                { key: 'follow_up_reminders', label: 'Follow-up Reminders', desc: 'Daily tracker follow-up alerts' },
                                { key: 'weekly_report', label: 'Weekly MRR Report', desc: 'Weekly performance summary email' },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{label}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                                    </div>
                                    <button
                                        onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${notifications[key as keyof typeof notifications] ? 'bg-primary' : 'bg-secondary'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${notifications[key as keyof typeof notifications] ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <Button onClick={() => toast.success('Preferences saved')} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                            <Save className="w-4 h-4" />Save Preferences
                        </Button>
                    </div>
                )

            case 'appearance':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Customize how the app looks.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {([
                                { id: 'dark', label: 'Dark', desc: 'Default dark theme', icon: <Moon className="w-5 h-5" /> },
                                { id: 'darker', label: 'Pitch Black', desc: 'Pure black OLED theme', icon: <span className="text-lg">⚫</span> },
                            ] as const).map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`relative p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${theme === t.id ? 'border-primary bg-primary/10' : 'border-white/10 bg-secondary/20'}`}
                                >
                                    <div className="mb-3">{t.icon}</div>
                                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                                    {theme === t.id && <Check className="absolute top-3 right-3 w-4 h-4 text-primary" />}
                                </button>
                            ))}
                        </div>
                        <div className="rounded-xl bg-secondary/20 border border-white/5 p-4">
                            <p className="text-xs text-muted-foreground">🎨 More themes coming soon — pastel, high-contrast, and custom accent colors.</p>
                        </div>
                    </div>
                )

            case 'security':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Security</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Update your password and manage sessions.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">Current Password</Label>
                                <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Your current password" className="bg-secondary/50 border-white/10" />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">New Password</Label>
                                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" className="bg-secondary/50 border-white/10" />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">Confirm New Password</Label>
                                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className="bg-secondary/50 border-white/10" />
                            </div>
                        </div>
                        <Button onClick={handleChangePassword} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                            <Shield className="w-4 h-4" />{isSaving ? 'Updating...' : 'Update Password'}
                        </Button>
                        <div className="border-t border-white/5 pt-4">
                            <p className="text-sm font-medium text-foreground mb-2">Active Session</p>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-white/5">
                                <div>
                                    <p className="text-xs font-medium text-foreground">Current Browser · localhost</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Active now</p>
                                </div>
                                <Button variant="ghost" onClick={handleLogout} className="text-xs text-destructive hover:bg-destructive/10 gap-1.5">
                                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                                </Button>
                            </div>
                        </div>
                    </div>
                )

            case 'danger':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">These actions are irreversible. Proceed carefully.</p>
                        </div>
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Delete All Leads</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Permanently removes all leads from your CRM pipeline.</p>
                                </div>
                                <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0 text-xs" onClick={() => toast.error('Please confirm in Supabase dashboard for safety')}>
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />Clear
                                </Button>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Sign Out of All Devices</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Terminates all active sessions for your account.</p>
                                </div>
                                <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0 text-xs" onClick={handleLogout}>
                                    <LogOut className="w-3.5 h-3.5 mr-1.5" />Sign Out
                                </Button>
                            </div>
                        </div>
                    </div>
                )
        }
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Nav */}
            <div className="w-full lg:w-64 shrink-0">
                <div className="rounded-2xl border border-white/8 bg-card overflow-hidden">
                    <div className="px-4 py-4 border-b border-white/5">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Settings</p>
                    </div>
                    <nav className="p-2 space-y-0.5">
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group
                                    ${activeSection === item.id
                                        ? item.danger ? 'bg-red-500/10 text-red-400' : 'bg-primary/10 text-primary'
                                        : item.danger ? 'text-red-400/60 hover:bg-red-500/5 hover:text-red-400' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                                    }`}
                            >
                                <item.icon className="w-4 h-4 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{item.label}</p>
                                </div>
                                <ChevronRight className={`w-3.5 h-3.5 transition-opacity shrink-0 ${activeSection === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content Panel */}
            <div className="flex-1 min-w-0">
                <div className="rounded-2xl border border-white/8 bg-card p-6 min-h-[500px]">
                    {renderSection()}
                </div>
            </div>
        </div>
    )
}
