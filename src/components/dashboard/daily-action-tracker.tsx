'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, MessageCircle, Instagram, Linkedin, Target, Bell, Plus, Minus, Trash2, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'

const PLATFORMS = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, target: 20, color: 'text-pink-500' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, target: 15, color: 'text-blue-500' },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, target: 10, color: 'text-green-500' },
]

const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'

export function DailyActionTracker() {
    const supabase = createClient()
    const [mounted, setMounted] = useState(false)
    const [counters, setCounters] = useState({ instagram: 0, linkedin: 0, whatsapp: 0 })
    const [focus, setFocus] = useState("")
    const [userId, setUserId] = useState<string>(FALLBACK_USER_ID)
    const [isSaving, setIsSaving] = useState(false)
    const [focusList, setFocusList] = useState<{ id: string, text: string, completed: boolean }[]>([])
    const [followUps, setFollowUps] = useState<any[]>([])
    const [newFollowUp, setNewFollowUp] = useState({ name: '', company: '', action: '', due: '' })
    const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false)
    const [outreachHistory, setOutreachHistory] = useState<any[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const userIdRef = useRef<string>(FALLBACK_USER_ID)

    const today = new Date().toISOString().split('T')[0]

    const loadData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const uid = user?.id || FALLBACK_USER_ID
            setUserId(uid)
            userIdRef.current = uid

            const { data } = await supabase
                .from('daily_activities')
                .select('*')
                .eq('user_id', uid)
                .eq('date', today)
                .single()

            if (data) {
                setCounters({
                    instagram: data.instagram_sent || 0,
                    linkedin: data.linkedin_sent || 0,
                    whatsapp: data.whatsapp_sent || 0,
                })
            }

            // Load permanent focus tasks
            const { data: focusTasks } = await supabase
                .from('focus_tasks')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: true })

            if (focusTasks) {
                setFocusList(focusTasks.map(t => ({ id: t.id, text: t.text, completed: Boolean(t.completed) })))
            }

            // Load follow ups
            const { data: followUpsData } = await supabase
                .from('follow_ups')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false })
            if (followUpsData) setFollowUps(followUpsData)

            // Load last 7 days of outreach history
            const sevenDaysAgo = subDays(new Date(), 6).toISOString().split('T')[0]
            const { data: historyData } = await supabase
                .from('daily_activities')
                .select('date, instagram_sent, linkedin_sent, whatsapp_sent')
                .eq('user_id', uid)
                .gte('date', sevenDaysAgo)
                .order('date', { ascending: false })
            if (historyData) setOutreachHistory(historyData)

        } catch (e) {
            console.error('Failed to load daily tracker data:', e)
        }
    }, [supabase, today])

    useEffect(() => {
        setMounted(true)
        loadData()
    }, [loadData])

    const saveData = async (newCounters: typeof counters) => {
        const uid = userIdRef.current
        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('daily_activities')
                .upsert({
                    user_id: uid,
                    date: today,
                    instagram_sent: newCounters.instagram,
                    linkedin_sent: newCounters.linkedin,
                    whatsapp_sent: newCounters.whatsapp,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id,date' })
            if (error) toast.error('Save failed: ' + error.message)
        } catch (err) {
            console.error('Error saving tracker data:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddFocus = async () => {
        if (!focus.trim()) return
        const uid = userIdRef.current || FALLBACK_USER_ID

        const { data, error } = await supabase
            .from('focus_tasks')
            .insert({ user_id: uid, text: focus.trim(), completed: false })
            .select()
            .single()

        if (!error && data) {
            setFocusList(prev => [...prev, { id: data.id, text: data.text, completed: data.completed }])
            setFocus("")
        } else {
            console.error('Focus task insertion error:', error)
            toast.error('Failed to add focus task: ' + (error?.message || 'Check if you ran the fixed SQL'))
        }
    }

    const toggleFocusItem = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('focus_tasks')
            .update({ completed: !currentStatus })
            .eq('id', id)

        if (!error) {
            setFocusList(prev => prev.map(item => item.id === id ? { ...item, completed: !currentStatus } : item))
        } else {
            toast.error('Update failed')
        }
    }

    const deleteFocusItem = async (id: string) => {
        const { error } = await supabase
            .from('focus_tasks')
            .delete()
            .eq('id', id)

        if (!error) {
            setFocusList(prev => prev.filter(item => item.id !== id))
        } else {
            toast.error('Delete failed')
        }
    }

    const handleAddFollowUp = async () => {
        if (!newFollowUp.name || !newFollowUp.action) { toast.error('Name and action are required'); return }
        setIsSaving(true)
        const uid = userIdRef.current
        const payload = { name: newFollowUp.name, company: newFollowUp.company, action: newFollowUp.action, due: newFollowUp.due, user_id: uid }
        const { data, error } = await supabase.from('follow_ups').insert(payload).select().single()
        if (!error && data) {
            setFollowUps(prev => [...prev, data])
            setNewFollowUp({ name: '', company: '', action: '', due: '' })
            setIsFollowUpDialogOpen(false)
            toast.success('Follow-up added!')
        } else {
            toast.error(error?.message || 'Failed to add follow-up')
        }
        setIsSaving(false)
    }

    const completeFollowUp = async (id: string) => {
        const { error } = await supabase.from('follow_ups').delete().eq('id', id)
        if (!error) {
            setFollowUps(prev => prev.filter(f => f.id !== id))
            toast.success('Follow-up completed!')
        } else {
            toast.error('Failed to remove follow-up')
        }
    }

    const increment = async (platformId: string) => {
        const newCounters = { ...counters, [platformId]: counters[platformId as keyof typeof counters] + 1 }
        setCounters(newCounters)
        await saveData(newCounters)
        // Refresh history
        const sevenDaysAgo = subDays(new Date(), 6).toISOString().split('T')[0]
        const { data } = await supabase.from('daily_activities').select('date, instagram_sent, linkedin_sent, whatsapp_sent').eq('user_id', userIdRef.current).gte('date', sevenDaysAgo).order('date', { ascending: false })
        if (data) setOutreachHistory(data)
    }

    const decrement = async (platformId: string) => {
        const currentCount = counters[platformId as keyof typeof counters]
        if (currentCount <= 0) return
        const newCounters = { ...counters, [platformId]: currentCount - 1 }
        setCounters(newCounters)
        await saveData(newCounters)
        // Refresh history
        const sevenDaysAgo = subDays(new Date(), 6).toISOString().split('T')[0]
        const { data } = await supabase.from('daily_activities').select('date, instagram_sent, linkedin_sent, whatsapp_sent').eq('user_id', userIdRef.current).gte('date', sevenDaysAgo).order('date', { ascending: false })
        if (data) setOutreachHistory(data)
    }

    if (!mounted) return null

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Today's Focus */}
            <Card className="col-span-full lg:col-span-1 shadow-sm border-border group flex flex-col">
                <CardHeader className="pb-3 relative">
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground tracking-tight">
                        <Target className="h-5 w-5 text-primary" />
                        Today&apos;s Focus
                    </CardTitle>
                    <CardDescription>Your primary objective for the day</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                    <div className="flex gap-2 mb-4">
                        <Input
                            value={focus}
                            onChange={(e) => setFocus(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddFocus()}
                            className="bg-secondary/50 border-border text-foreground text-sm focus:ring-primary placeholder-muted-foreground placeholder:text-xs transition-all"
                            placeholder="Add a new task..."
                        />
                        <Button onClick={handleAddFocus} size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex-shrink-0">
                            <Plus className="h-4 w-4 text-primary-foreground" />
                        </Button>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {focusList.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 group/item">
                                <Checkbox
                                    id={`focus-${item.id}`}
                                    checked={item.completed}
                                    onCheckedChange={() => toggleFocusItem(item.id, item.completed)}
                                    className="mt-1 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <label
                                    htmlFor={`focus-${item.id}`}
                                    className={`text-sm font-medium leading-tight cursor-pointer transition-all duration-300 flex-1 ${item.completed ? 'text-muted-foreground line-through opacity-70' : 'text-foreground'}`}
                                >
                                    {item.text}
                                </label>
                                <button onClick={() => deleteFocusItem(item.id)} className="opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                        {focusList.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-6">No tasks yet. Add one above!</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Outreach Volume */}
            <Card className="col-span-full lg:col-span-2 shadow-sm border-border flex flex-col">
                <CardHeader className="pb-3 relative">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-foreground tracking-tight">Outreach Volume</CardTitle>
                            <CardDescription>Track your daily outbound activity</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-1 text-muted-foreground">
                            <BarChart3 className="h-4 w-4" />
                            History
                            {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center">
                    <div className="grid gap-4 sm:grid-cols-3">
                        {PLATFORMS.map((platform) => {
                            const count = counters[platform.id as keyof typeof counters]
                            const progress = Math.min((count / platform.target) * 100, 100)
                            const isComplete = progress >= 100
                            return (
                                <div key={platform.id} className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/50 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <platform.icon className={`h-5 w-5 ${platform.color}`} />
                                            <span className="font-semibold text-foreground">{platform.name}</span>
                                        </div>
                                        <span className={`text-2xl font-bold ${isComplete ? 'text-primary' : 'text-foreground'}`}>
                                            {count}<span className="text-sm font-medium text-muted-foreground">/{platform.target}</span>
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden mt-4">
                                        <div className={`h-full ${isComplete ? 'bg-primary' : 'bg-primary/70'} transition-all duration-500 ease-out`} style={{ width: `${progress}%` }} />
                                    </div>
                                    <div className="mt-5 flex gap-2">
                                        <Button onClick={() => decrement(platform.id)} variant="outline" size="sm" className="flex-1 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors">
                                            <Minus className="h-4 w-4 mr-1" /> 1
                                        </Button>
                                        <Button onClick={() => increment(platform.id)} variant="outline" size="sm" className="flex-[2] border-border hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors">
                                            <Plus className="h-4 w-4 mr-1" /> 1 Sent
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Outreach History */}
                    {showHistory && outreachHistory.length > 0 && (
                        <div className="mt-6 border border-border/50 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-primary" /> Last 7 Days Outreach
                            </h4>
                            <div className="space-y-2">
                                {outreachHistory.map(row => (
                                    <div key={row.date} className="flex items-center gap-3 text-xs">
                                        <span className="text-muted-foreground w-20 shrink-0">{format(new Date(row.date + 'T00:00:00'), 'EEE, MMM d')}</span>
                                        <div className="flex gap-3 flex-1">
                                            <span className="flex items-center gap-1 text-pink-400"><Instagram className="h-3 w-3" />{row.instagram_sent || 0}</span>
                                            <span className="flex items-center gap-1 text-blue-400"><Linkedin className="h-3 w-3" />{row.linkedin_sent || 0}</span>
                                            <span className="flex items-center gap-1 text-green-400"><MessageCircle className="h-3 w-3" />{row.whatsapp_sent || 0}</span>
                                        </div>
                                        <span className="text-muted-foreground font-medium">{(row.instagram_sent || 0) + (row.linkedin_sent || 0) + (row.whatsapp_sent || 0)} total</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Follow-up Triggers */}
            <Card className="col-span-full shadow-sm border-border">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg text-foreground tracking-tight">
                            <Bell className="h-5 w-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            Active Follow-up Triggers
                        </CardTitle>
                        <CardDescription>Leads that require immediate attention today</CardDescription>
                    </div>
                    <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 transition-colors">
                                <Plus className="h-4 w-4 mr-1" /> New Followup
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Add New Follow-up</DialogTitle>
                                <DialogDescription>Schedule a new lead follow-up action for today.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="fu-name" className="text-foreground">Lead Name *</Label>
                                    <Input id="fu-name" value={newFollowUp.name} onChange={e => setNewFollowUp({ ...newFollowUp, name: e.target.value })} className="bg-secondary/50 border-border" placeholder="e.g. John Doe" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="fu-company" className="text-foreground">Company</Label>
                                    <Input id="fu-company" value={newFollowUp.company} onChange={e => setNewFollowUp({ ...newFollowUp, company: e.target.value })} className="bg-secondary/50 border-border" placeholder="e.g. Acme Corp" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="fu-action" className="text-foreground">Action Needed *</Label>
                                    <Input id="fu-action" value={newFollowUp.action} onChange={e => setNewFollowUp({ ...newFollowUp, action: e.target.value })} className="bg-secondary/50 border-border" placeholder="e.g. Send Proposal" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="fu-due" className="text-foreground">Time (Optional)</Label>
                                    <Input id="fu-due" value={newFollowUp.due} onChange={e => setNewFollowUp({ ...newFollowUp, due: e.target.value })} className="bg-secondary/50 border-border" placeholder="e.g. Today, 5:00 PM" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddFollowUp} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    {isSaving ? 'Saving...' : 'Add Trigger'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {followUps.map((trigger) => (
                            <div key={trigger.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-secondary/40 transition-colors gap-4">
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-foreground">{trigger.name} {trigger.company && <span className="text-muted-foreground font-medium text-xs">({trigger.company})</span>}</span>
                                    <span className="text-sm text-muted-foreground mt-1 tracking-wide">{trigger.action}</span>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                    {trigger.due && <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">{trigger.due}</span>}
                                    <Button onClick={() => completeFollowUp(trigger.id)} size="sm" variant="outline" className="border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                                        Done
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {followUps.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground flex flex-col items-center justify-center border border-dashed border-border/50 rounded-xl">
                                <Check className="h-8 w-8 text-primary mb-2 opacity-50" />
                                <p className="font-medium text-foreground">All caught up!</p>
                                <p className="text-xs mt-1">No pending follow-ups for today.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
