'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Pencil, Trash2, Users, CheckCircle2, Clock, Star, DollarSign, Mail, Phone, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { retryQuery } from '@/lib/supabase/retry'

export interface TeamMember {
    id: string
    user_id: string
    name: string
    role: string
    email: string
    phone: string
    status: string
    rate_type: string
    rate_amount: number
    tasks_assigned: number
    tasks_completed: number
    quality_score: number
    dashboard_access: boolean
    created_at: string
}

interface TeamDashboardProps {
    initialMembers: any[]
    userId: string
}

const STATUS_COLORS: Record<string, string> = {
    Active: 'bg-primary/20 text-primary',
    Inactive: 'bg-secondary text-muted-foreground',
    On_Leave: 'bg-yellow-500/20 text-yellow-400',
}

const ROLE_COLORS: Record<string, string> = {
    Founder: 'bg-purple-500/20 text-purple-400',
    VA: 'bg-blue-500/20 text-blue-400',
    Freelancer: 'bg-emerald-500/20 text-emerald-400',
    Contractor: 'bg-orange-500/20 text-orange-400',
}

const EMPTY_MEMBER = {
    name: '', role: 'VA', email: '', phone: '',
    status: 'Active', rate_type: 'Hourly', rate_amount: 0,
    tasks_assigned: 0, tasks_completed: 0, quality_score: 0,
    dashboard_access: false,
}

export function TeamDashboard({ initialMembers, userId }: TeamDashboardProps) {
    const supabase = createClient()
    const [members, setMembers] = useState<TeamMember[]>(initialMembers)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeRole, setActiveRole] = useState('All')

    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [deleteMemberTarget, setDeleteMemberTarget] = useState<TeamMember | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [form, setForm] = useState<Partial<TeamMember>>(EMPTY_MEMBER)

    const roles = ['All', 'VA', 'Freelancer', 'Contractor', 'Founder']

    const filtered = members.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchRole = activeRole === 'All' || m.role === activeRole
        return matchSearch && matchRole
    })

    const totalMonthlyCost = members.filter(m => m.status === 'Active').reduce((sum, m) => {
        if (m.rate_type === 'Fixed_Monthly') return sum + (m.rate_amount || 0)
        return sum
    }, 0)

    const handleSave = async () => {
        if (!form.name?.trim()) { toast.error('Name is required'); return }
        setIsSaving(true)
        const payload = { user_id: userId, ...form }
        const { data, error } = await retryQuery(() =>
            supabase.from('team_members').insert(payload).select().single()
        )
        if (!error && data) {
            setMembers([data as TeamMember, ...members])
            setIsAddOpen(false)
            setForm(EMPTY_MEMBER)
            toast.success('Team member added!')
        } else {
            toast.error('Failed to add member')
            console.error(error)
        }
        setIsSaving(false)
    }

    const handleUpdate = async () => {
        if (!editingMember?.name?.trim()) { toast.error('Name is required'); return }
        setIsSaving(true)
        const { id, user_id, created_at, ...updates } = editingMember
        const { error } = await retryQuery(() =>
            supabase.from('team_members').update(updates).eq('id', id)
        )
        if (!error) {
            setMembers(prev => prev.map(m => m.id === id ? editingMember : m))
            setEditingMember(null)
            toast.success('Member updated!')
        } else {
            toast.error('Failed to update member')
        }
        setIsSaving(false)
    }

    const handleDelete = async () => {
        if (!deleteMemberTarget) return
        setIsDeleting(true)
        const { error } = await supabase.from('team_members').delete().eq('id', deleteMemberTarget.id)
        if (!error) { setMembers(prev => prev.filter(m => m.id !== deleteMemberTarget.id)); toast.success('Member removed') }
        else toast.error('Failed to remove member')
        setIsDeleting(false)
        setDeleteMemberTarget(null)
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Members', value: members.length, icon: <Users className="w-4 h-4" />, color: 'text-foreground' },
                    { label: 'Active', value: members.filter(m => m.status === 'Active').length, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-primary' },
                    { label: 'On Leave', value: members.filter(m => m.status === 'On_Leave').length, icon: <Clock className="w-4 h-4" />, color: 'text-yellow-400' },
                    { label: 'Monthly Cost', value: `₹${totalMonthlyCost.toLocaleString()}`, icon: <DollarSign className="w-4 h-4" />, color: 'text-emerald-400' },
                ].map(s => (
                    <Card key={s.label} className="bg-card border-border/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                {s.icon}
                                <p className="text-xs uppercase tracking-wider">{s.label}</p>
                            </div>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters + Add */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex bg-secondary/50 p-1 rounded-xl border border-white/5 overflow-x-auto">
                    {roles.map(r => (
                        <button key={r} onClick={() => setActiveRole(r)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeRole === r ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
                            {r}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search members..." className="pl-9 bg-secondary/30 border-white/10 w-full" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0">
                                <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Member</span>
                            </Button>
                        </DialogTrigger>
                        <MemberFormDialog title="Add Team Member" description="Add a new VA, freelancer, or contractor." data={form} onChange={setForm as any} onSave={handleSave} onCancel={() => setIsAddOpen(false)} isSaving={isSaving} />
                    </Dialog>
                </div>
            </div>

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-secondary/20 rounded-2xl border border-white/5 border-dashed">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
                        <h3 className="text-lg font-medium text-foreground mb-1">No team members yet</h3>
                        <p className="text-sm text-muted-foreground">Add your VAs, freelancers, and contractors.</p>
                        <Button variant="outline" className="mt-4" onClick={() => setIsAddOpen(true)}>Add First Member</Button>
                    </div>
                ) : (
                    filtered.map(member => {
                        const completionRate = member.tasks_assigned > 0
                            ? Math.round((member.tasks_completed / member.tasks_assigned) * 100) : 0

                        return (
                            <Card key={member.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors group flex flex-col">
                                <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-emerald-500/30 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                                            {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-semibold">{member.name}</CardTitle>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[member.role] || 'bg-secondary text-muted-foreground'}`}>{member.role}</span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[member.status] || STATUS_COLORS.Active}`}>{member.status?.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setEditingMember({ ...member })} className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary hover:text-foreground transition-colors">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setDeleteMemberTarget(member)} className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-4 flex-1 space-y-3">
                                    {/* Contact */}
                                    <div className="space-y-1.5">
                                        {member.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{member.email}</div>}
                                        {member.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{member.phone}</div>}
                                    </div>

                                    {/* Rate */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">{member.rate_type?.replace('_', ' ')}</span>
                                        <span className="font-semibold text-foreground">₹{(member.rate_amount || 0).toLocaleString()}</span>
                                    </div>

                                    {/* Task progress */}
                                    {member.tasks_assigned > 0 && (
                                        <div>
                                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                <span>Tasks</span>
                                                <span>{member.tasks_completed}/{member.tasks_assigned} ({completionRate}%)</span>
                                            </div>
                                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Quality score */}
                                    {member.quality_score > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs">
                                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                            <span className="font-semibold">{member.quality_score}/5</span>
                                            <span className="text-muted-foreground">quality score</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingMember} onOpenChange={open => !open && setEditingMember(null)}>
                <MemberFormDialog title="Edit Member" description="Update this team member." data={editingMember || {}} onChange={(val: Partial<TeamMember>) => setEditingMember(prev => prev ? { ...prev, ...val } : prev)} onSave={handleUpdate} onCancel={() => setEditingMember(null)} isSaving={isSaving} />
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteMemberTarget} onOpenChange={open => { if (!open) setDeleteMemberTarget(null) }}>
                <DialogContent className="sm:max-w-[380px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <AlertTriangle className="w-4 h-4 text-red-500" /> Remove Team Member?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <span className="font-semibold text-foreground">{deleteMemberTarget?.name}</span>? This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setDeleteMemberTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
                            {isDeleting ? 'Removing…' : 'Remove'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function MemberFormDialog({ title, description, data, onChange, onSave, onCancel, isSaving }: any) {
    return (
        <DialogContent className="sm:max-w-[580px] bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Full Name *</label>
                    <Input value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="e.g. Priya Sharma" className="bg-secondary/50 border-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Role</label>
                        <Select value={data.role || 'VA'} onValueChange={(val: string) => onChange({ ...data, role: val })}>
                            <SelectTrigger className="bg-secondary/50 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card">
                                {['Founder', 'VA', 'Freelancer', 'Contractor'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Status</label>
                        <Select value={data.status || 'Active'} onValueChange={(val: string) => onChange({ ...data, status: val })}>
                            <SelectTrigger className="bg-secondary/50 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card">
                                {['Active', 'Inactive', 'On_Leave'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input type="email" value={data.email || ''} onChange={e => onChange({ ...data, email: e.target.value })} placeholder="email@example.com" className="bg-secondary/50 border-white/10" />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Phone</label>
                        <Input value={data.phone || ''} onChange={e => onChange({ ...data, phone: e.target.value })} placeholder="+91 9876543210" className="bg-secondary/50 border-white/10" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Rate Type</label>
                        <Select value={data.rate_type || 'Hourly'} onValueChange={(val: string) => onChange({ ...data, rate_type: val })}>
                            <SelectTrigger className="bg-secondary/50 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card">
                                {['Hourly', 'Per_Deliverable', 'Fixed_Monthly'].map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Rate Amount (₹)</label>
                        <Input type="number" value={data.rate_amount || ''} onChange={e => onChange({ ...data, rate_amount: parseFloat(e.target.value) || 0 })} placeholder="0" className="bg-secondary/50 border-white/10" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Tasks Assigned</label>
                        <Input type="number" value={data.tasks_assigned || ''} onChange={e => onChange({ ...data, tasks_assigned: parseInt(e.target.value) || 0 })} placeholder="0" className="bg-secondary/50 border-white/10" />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Completed</label>
                        <Input type="number" value={data.tasks_completed || ''} onChange={e => onChange({ ...data, tasks_completed: parseInt(e.target.value) || 0 })} placeholder="0" className="bg-secondary/50 border-white/10" />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Quality (1–5)</label>
                        <Input type="number" min="0" max="5" step="0.1" value={data.quality_score || ''} onChange={e => onChange({ ...data, quality_score: parseFloat(e.target.value) || 0 })} placeholder="0" className="bg-secondary/50 border-white/10" />
                    </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={data.dashboard_access || false} onChange={e => onChange({ ...data, dashboard_access: e.target.checked })} className="rounded border-white/20" />
                    Has Dashboard Access
                </label>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={onSave} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {isSaving ? 'Saving...' : 'Save Member'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}
