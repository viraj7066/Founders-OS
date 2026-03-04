'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Trash2, Plus, Target,
    CircleDollarSign, Heart, User, Building2, Sparkles,
    Hash, Flame
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Goal {
    id: string
    title: string
    impact: string
    status: string
    progress_percent: number
    category: string
    tags: string
}

const CATEGORIES = [
    { value: 'Money', icon: <CircleDollarSign className="w-3.5 h-3.5" />, color: 'text-emerald-500' },
    { value: 'Health', icon: <Heart className="w-3.5 h-3.5" />, color: 'text-rose-500' },
    { value: 'Personal', icon: <User className="w-3.5 h-3.5" />, color: 'text-blue-500' },
    { value: 'Agency', icon: <Building2 className="w-3.5 h-3.5" />, color: 'text-purple-500' },
    { value: 'General', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-amber-500' },
]

export function LifeGoals({ userId }: { userId: string }) {
    const supabase = createClient()
    const [goals, setGoals] = useState<Goal[]>([])
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newGoal, setNewGoal] = useState({ title: '', impact: '', category: 'General', tags: '' })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!userId || userId === '00000000-0000-0000-0000-000000000000') return
        const fetchGoals = async () => {
            const { data } = await supabase
                .from('life_goals')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
            if (data) setGoals(data)
            setIsLoading(false)
        }
        fetchGoals()
    }, [userId, supabase])

    const handleAdd = async () => {
        if (!newGoal.title) return
        const { data, error } = await supabase
            .from('life_goals')
            .insert({
                user_id: userId,
                title: newGoal.title,
                impact: newGoal.impact,
                category: newGoal.category,
                tags: newGoal.tags,
                status: 'in_progress',
                progress_percent: 0
            })
            .select()
            .single()

        if (!error && data) {
            setGoals([data, ...goals])
            setNewGoal({ title: '', impact: '', category: 'General', tags: '' })
            setIsAddOpen(false)
            toast.success('Goal added to your roadmap.')
        } else {
            toast.error('Failed to add goal.')
        }
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('life_goals').delete().eq('id', id)
        if (!error) {
            setGoals(goals.filter(g => g.id !== id))
            toast.success('Goal removed')
        }
    }

    return (
        <Card className="h-[520px] flex flex-col border-white/10 bg-card/60 backdrop-blur-md rounded-3xl overflow-hidden shadow-xl lg:col-span-3">
            <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between space-y-0 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        <Target className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold tracking-tight">Life Roadmap</CardTitle>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Strategic Vision</p>
                    </div>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2 font-bold px-4 h-9 rounded-xl text-xs">
                            <Plus className="w-3.5 h-3.5" /> Add Goal
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">New Strategic Milestone</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Title</Label>
                                <Input
                                    placeholder="e.g. ₹100Cr Agency Exit"
                                    value={newGoal.title}
                                    onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</Label>
                                    <Select value={newGoal.category} onValueChange={(val) => setNewGoal({ ...newGoal, category: val })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(c => (
                                                <SelectItem key={c.value} value={c.value}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={c.color}>{c.icon}</span> {c.value}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Tags</Label>
                                    <Input
                                        placeholder="Comma separated..."
                                        value={newGoal.tags}
                                        onChange={e => setNewGoal({ ...newGoal, tags: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Impact / "The Why"</Label>
                                <Input
                                    placeholder="Manifesting freedom..."
                                    value={newGoal.impact}
                                    onChange={e => setNewGoal({ ...newGoal, impact: e.target.value })}
                                />
                            </div>
                        </div>
                        <Button onClick={handleAdd} className="w-full font-bold">Add to Roadmap</Button>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 bg-white/5 animate-pulse rounded-2xl" />)}
                    </div>
                ) : goals.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                        <Flame className="w-12 h-12 mb-4 text-muted-foreground" />
                        <p className="text-sm font-bold uppercase tracking-widest text-foreground">No Vision Set Yet</p>
                        <p className="text-xs mt-2">Start defining your path to legacy.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {goals.map(goal => {
                            const cat = CATEGORIES.find(c => c.value === goal.category) || CATEGORIES[4]
                            const tagsArray = goal.tags ? goal.tags.split(',').map(t => t.trim()).filter(Boolean) : []

                            return (
                                <div key={goal.id} className="group relative p-4 rounded-2xl border border-white/5 bg-secondary/10 hover:bg-secondary/20 transition-all flex flex-col justify-between h-full">
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`p-1.5 rounded-lg bg-background/50 border border-white/5 ${cat.color} shrink-0`}>
                                                    {cat.icon}
                                                </span>
                                                <h4 className="text-sm font-bold tracking-tight text-foreground truncate">{goal.title}</h4>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-6 h-6 shrink-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => handleDelete(goal.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>

                                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed italic">
                                            "{goal.impact || 'Strategic impact statement'}"
                                        </p>
                                    </div>

                                    {tagsArray.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-auto">
                                            {tagsArray.map((tag, i) => (
                                                <Badge key={i} variant="outline" className="text-[8px] h-3.5 font-bold uppercase tracking-wider bg-background/30 text-muted-foreground/70 border-white/5 px-1">
                                                    <Hash className="w-1.5 h-1.5 mr-0.5" /> {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
