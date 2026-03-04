'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Plus, Search, Pencil, Trash2, Instagram, Linkedin, Mail, Youtube,
    Calendar, TrendingUp, Eye, Heart, MessageCircle, Bookmark,
    ChevronLeft, ChevronRight, LayoutGrid, List, Sparkles, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { retryQuery } from '@/lib/supabase/retry'
import {
    format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday
} from 'date-fns'

export interface ContentPost {
    id: string
    user_id: string
    title: string
    scheduled_date: string
    platform: string
    status: string
    caption: string
    content_type: string
    topic: string
    canva_link?: string
    hashtags?: string[]
    reach?: number
    likes?: number
    comments?: number
    saves?: number
    is_high_performer: boolean
    created_at: string
}

interface ContentCalendarDashboardProps {
    initialPosts: any[]
    userId: string
}

const STATUS_COLORS: Record<string, string> = {
    Idea: 'bg-secondary text-muted-foreground border-border/40',
    Draft: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Scheduled: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Published: 'bg-primary/15 text-primary border-primary/30',
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
    Instagram: <Instagram className="w-3.5 h-3.5 text-pink-400" />,
    LinkedIn: <Linkedin className="w-3.5 h-3.5 text-blue-400" />,
    Email: <Mail className="w-3.5 h-3.5 text-emerald-400" />,
    YouTube: <Youtube className="w-3.5 h-3.5 text-red-400" />,
}

const PLATFORM_DOT: Record<string, string> = {
    Instagram: 'bg-pink-400',
    LinkedIn: 'bg-blue-400',
    Email: 'bg-emerald-400',
    YouTube: 'bg-red-400',
}

const EMPTY_POST = {
    title: '',
    platform: 'Instagram',
    status: 'Idea',
    content_type: 'Single_Image',
    topic: '',
    caption: '',
    canva_link: '',
    scheduled_date: '',
    is_high_performer: false,
}

export function ContentCalendarDashboard({ initialPosts, userId }: ContentCalendarDashboardProps) {
    const supabase = createClient()
    const [posts, setPosts] = useState<ContentPost[]>(initialPosts)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeStatus, setActiveStatus] = useState('All')
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const [isAddOpen, setIsAddOpen] = useState(false)
    const [addDefaultDate, setAddDefaultDate] = useState('')
    const [editingPost, setEditingPost] = useState<ContentPost | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [deletePostTarget, setDeletePostTarget] = useState<ContentPost | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [form, setForm] = useState<Partial<ContentPost>>(EMPTY_POST)

    const statuses = ['All', 'Idea', 'Draft', 'Scheduled', 'Published']

    const filtered = posts.filter(p => {
        const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.caption || '').toLowerCase().includes(searchQuery.toLowerCase())
        const matchStatus = activeStatus === 'All' || p.status === activeStatus
        return matchSearch && matchStatus
    })

    // Calendar grid logic
    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
        const days: Date[] = []
        let d = start
        while (d <= end) { days.push(d); d = addDays(d, 1) }
        return days
    }, [currentMonth])

    const postsByDate = useMemo(() => {
        const map: Record<string, ContentPost[]> = {}
        posts.forEach(p => {
            if (!p.scheduled_date) return
            try {
                const key = parseISO(p.scheduled_date).toISOString().split('T')[0]
                if (!map[key]) map[key] = []
                map[key].push(p)
            } catch { }
        })
        return map
    }, [posts])

    const handleSave = async () => {
        if (!form.title?.trim()) { toast.error('Title is required'); return }
        setIsSaving(true)
        const payload = {
            user_id: userId,
            title: form.title,
            platform: form.platform || 'Instagram',
            status: form.status || 'Idea',
            content_type: form.content_type || 'Single_Image',
            topic: form.topic || '',
            caption: form.caption || '',
            canva_link: form.canva_link || '',
            scheduled_date: form.scheduled_date || null,
            is_high_performer: form.is_high_performer || false,
        }
        const { data, error } = await retryQuery(() =>
            supabase.from('content_posts').insert(payload).select().single()
        )
        if (!error && data) {
            setPosts([data as ContentPost, ...posts])
            setIsAddOpen(false)
            setForm(EMPTY_POST)
            toast.success('Post added to calendar!')
        } else {
            toast.error(`Failed to save post: ${error?.message || 'Unknown error'}`)
        }
        setIsSaving(false)
    }

    const handleUpdate = async () => {
        if (!editingPost || !editingPost.title?.trim()) { toast.error('Title is required'); return }
        setIsSaving(true)
        const { error } = await retryQuery(() =>
            supabase.from('content_posts').update({
                title: editingPost.title,
                platform: editingPost.platform,
                status: editingPost.status,
                content_type: editingPost.content_type,
                topic: editingPost.topic,
                caption: editingPost.caption,
                canva_link: editingPost.canva_link,
                scheduled_date: editingPost.scheduled_date || null,
                is_high_performer: editingPost.is_high_performer,
            }).eq('id', editingPost.id)
        )
        if (!error) {
            setPosts(prev => prev.map(p => p.id === editingPost!.id ? editingPost! : p))
            setEditingPost(null)
            toast.success('Post updated!')
        } else {
            toast.error('Failed to update post')
        }
        setIsSaving(false)
    }

    const handleDelete = async () => {
        if (!deletePostTarget) return
        setIsDeleting(true)
        const { error } = await supabase.from('content_posts').delete().eq('id', deletePostTarget.id)
        if (!error) {
            setPosts(prev => prev.filter(p => p.id !== deletePostTarget.id))
            setEditingPost(null)
            toast.success('Post deleted')
        } else {
            toast.error('Failed to delete post')
        }
        setIsDeleting(false)
        setDeletePostTarget(null)
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        const { error } = await supabase.from('content_posts').update({ status: newStatus }).eq('id', id)
        if (!error) setPosts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
    }

    const openAddOnDate = (dateStr: string) => {
        setForm({ ...EMPTY_POST, scheduled_date: dateStr })
        setAddDefaultDate(dateStr)
        setIsAddOpen(true)
    }

    return (
        <div className="space-y-5">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Posts', value: posts.length, color: 'text-foreground', bg: 'bg-secondary/30 border-border/40' },
                    { label: 'Scheduled', value: posts.filter(p => p.status === 'Scheduled').length, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
                    { label: 'Published', value: posts.filter(p => p.status === 'Published').length, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
                    { label: 'High Performers', value: posts.filter(p => p.is_high_performer).length, color: 'text-pink-400', bg: 'bg-pink-500/5 border-pink-500/20' },
                ].map(stat => (
                    <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div className="flex bg-secondary/50 p-1 rounded-xl border border-white/5 overflow-x-auto">
                    {statuses.map(s => (
                        <button key={s} onClick={() => setActiveStatus(s)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeStatus === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                            {s}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Search posts..." className="pl-9 h-9 bg-secondary/30 border-white/10 w-full text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    {/* View Mode Toggle */}
                    <div className="flex border border-white/10 rounded-lg overflow-hidden">
                        <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`} title="Calendar View">
                            <Calendar className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`} title="List View">
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0 h-9" onClick={() => setForm(EMPTY_POST)}>
                                <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Post</span>
                            </Button>
                        </DialogTrigger>
                        <PostFormDialog title="Plan New Post" description="Add a new post to your content calendar."
                            data={form} onChange={setForm as any} onSave={handleSave} onCancel={() => setIsAddOpen(false)} isSaving={isSaving} />
                    </Dialog>
                </div>
            </div>

            {/* ═══ CALENDAR VIEW ═══ */}
            {viewMode === 'calendar' && (
                <div className="rounded-2xl border border-white/8 bg-card overflow-hidden">
                    {/* Month nav */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <h2 className="text-base font-semibold text-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Day-of-week headers */}
                    <div className="grid grid-cols-7 border-b border-white/5">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                            <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{d}</div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, idx) => {
                            const key = format(day, 'yyyy-MM-dd')
                            const dayPosts = postsByDate[key] || []
                            const isCurrentMonth = isSameMonth(day, currentMonth)
                            const isTodayDate = isToday(day)

                            return (
                                <div key={idx}
                                    className={`min-h-[110px] border-b border-r border-white/5 p-2 relative group transition-colors cursor-pointer
                                        ${!isCurrentMonth ? 'opacity-30' : ''}
                                        ${isTodayDate ? 'bg-primary/5' : 'hover:bg-secondary/20'}
                                        ${idx % 7 === 6 ? 'border-r-0' : ''}
                                    `}
                                    onClick={() => openAddOnDate(key)}
                                >
                                    {/* Day number */}
                                    <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1 transition-colors ${isTodayDate ? 'bg-primary text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                        {format(day, 'd')}
                                    </div>
                                    {/* + icon on hover */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="w-3 h-3 text-primary" />
                                    </div>

                                    {/* Posts for this day */}
                                    <div className="space-y-1 mt-0.5" onClick={e => e.stopPropagation()}>
                                        {dayPosts.slice(0, 3).map(post => (
                                            <div key={post.id}
                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer border truncate max-w-full ${STATUS_COLORS[post.status] || STATUS_COLORS.Idea} hover:opacity-80 transition-opacity`}
                                                onClick={(e) => { e.stopPropagation(); setEditingPost({ ...post }) }}
                                                title={post.title}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PLATFORM_DOT[post.platform] || 'bg-muted-foreground'}`} />
                                                <span className="truncate">{post.title}</span>
                                            </div>
                                        ))}
                                        {dayPosts.length > 3 && (
                                            <div className="text-[9px] text-muted-foreground pl-1">+{dayPosts.length - 3} more</div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-5 px-5 py-3 border-t border-white/5">
                        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
                            <div key={status} className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-sm border ${cls}`} />
                                <span className="text-[10px] text-muted-foreground">{status}</span>
                            </div>
                        ))}
                        <div className="ml-auto flex items-center gap-3">
                            {Object.entries(PLATFORM_DOT).map(([platform, dotClass]) => (
                                <div key={platform} className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                                    <span className="text-[10px] text-muted-foreground">{platform}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ LIST VIEW ═══ */}
            {viewMode === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-secondary/20 rounded-2xl border border-white/5 border-dashed">
                            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <h3 className="text-base font-semibold text-foreground mb-1">No posts yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">Start building your content pipeline.</p>
                            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)}>Plan First Post</Button>
                        </div>
                    ) : (
                        filtered.map(post => (
                            <Card key={post.id} className="bg-card border-border/50 hover:border-primary/30 transition-all group flex flex-col">
                                <div className="p-4 flex-1">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                {PLATFORM_ICONS[post.platform] || <Instagram className="w-3.5 h-3.5 text-pink-400" />}
                                                {post.platform}
                                            </span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[post.status] || STATUS_COLORS.Idea}`}>
                                                {post.status}
                                            </span>
                                            {post.is_high_performer && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/30 flex items-center gap-1">
                                                    <TrendingUp className="w-2.5 h-2.5" /> Top
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingPost({ ...post })} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"><Pencil className="w-3 h-3" /></button>
                                            <button onClick={() => setDeletePostTarget(post)} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-semibold leading-tight text-foreground mb-2">{post.title}</h3>
                                    {post.caption && <p className="text-xs text-muted-foreground line-clamp-2 bg-secondary/30 p-2 rounded-lg mb-3">{post.caption}</p>}
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.scheduled_date ? format(parseISO(post.scheduled_date), 'MMM d') : 'No date'}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50">{post.content_type?.replace('_', ' ')}</span>
                                    </div>
                                </div>
                                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                                    <Select value={post.status} onValueChange={val => handleStatusChange(post.id, val)}>
                                        <SelectTrigger className="h-8 text-xs rounded-lg border border-white/10 bg-secondary/50"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-card">
                                            {['Idea', 'Draft', 'Scheduled', 'Published'].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* Add Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <PostFormDialog title="Plan New Post" description="Add a new post to your content calendar."
                    data={form} onChange={setForm as any} onSave={handleSave} onCancel={() => setIsAddOpen(false)} isSaving={isSaving} />
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingPost} onOpenChange={open => !open && setEditingPost(null)}>
                <PostFormDialog title="Edit Post" description="Update this post's details."
                    data={editingPost || {}} onChange={(val: Partial<ContentPost>) => setEditingPost(prev => prev ? { ...prev, ...val } : prev)}
                    onSave={handleUpdate} onCancel={() => setEditingPost(null)} isSaving={isSaving}
                    onDelete={editingPost ? () => setDeletePostTarget(editingPost) : undefined}
                />
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletePostTarget} onOpenChange={open => { if (!open) setDeletePostTarget(null) }}>
                <DialogContent className="sm:max-w-[380px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <AlertTriangle className="w-4 h-4 text-red-500" /> Delete Post?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-foreground">"{deletePostTarget?.title}"</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setDeletePostTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function PostFormDialog({ title, description, data, onChange, onSave, onCancel, isSaving, onDelete }: any) {
    return (
        <DialogContent className="sm:max-w-[620px] bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
                <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">Title *</label>
                    <Input value={data.title || ''} onChange={e => onChange({ ...data, title: e.target.value })} placeholder="e.g. Behind the Scenes Reel" className="bg-secondary/50 border-white/10" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-foreground">Platform</label>
                        <Select value={data.platform || 'Instagram'} onValueChange={val => onChange({ ...data, platform: val })}>
                            <SelectTrigger className="bg-secondary/50 border-white/10"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-card">
                                {['Instagram', 'LinkedIn', 'YouTube', 'Email'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-foreground">Status</label>
                        <Select value={data.status || 'Idea'} onValueChange={val => onChange({ ...data, status: val })}>
                            <SelectTrigger className="bg-secondary/50 border-white/10"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-card">
                                {['Idea', 'Draft', 'Scheduled', 'Published'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-foreground">Content Type</label>
                        <Select value={data.content_type || 'Single_Image'} onValueChange={val => onChange({ ...data, content_type: val })}>
                            <SelectTrigger className="bg-secondary/50 border-white/10"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-card">
                                {['Single_Image', 'Carousel', 'Reel', 'Video', 'Story', 'Newsletter'].map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-foreground">Scheduled Date</label>
                        <Input type="date" value={data.scheduled_date?.split('T')[0] || ''} onChange={e => onChange({ ...data, scheduled_date: e.target.value })} className="bg-secondary/50 border-white/10" />
                    </div>
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">Topic / Angle</label>
                    <Input value={data.topic || ''} onChange={e => onChange({ ...data, topic: e.target.value })} placeholder="e.g. Case Study, Tutorial, Personal Story" className="bg-secondary/50 border-white/10" />
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">Caption</label>
                    <textarea value={data.caption || ''} onChange={e => onChange({ ...data, caption: e.target.value })}
                        placeholder="Write your caption here..." rows={4}
                        className="flex w-full rounded-md border border-white/10 bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">Canva / Asset Link</label>
                    <Input value={data.canva_link || ''} onChange={e => onChange({ ...data, canva_link: e.target.value })} placeholder="https://canva.com/design/..." className="bg-secondary/50 border-white/10" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" checked={data.is_high_performer || false} onChange={e => onChange({ ...data, is_high_performer: e.target.checked })} className="rounded border-white/20" />
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Mark as High Performer
                </label>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
                <div>
                    {onDelete && (
                        <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                    <Button onClick={onSave} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        {isSaving ? 'Saving...' : 'Save Post'}
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    )
}
