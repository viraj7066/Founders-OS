'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Plus, Search, Star, MessageSquareDashed, Image as ImageIcon, FileText, Settings2, Sparkles, TrendingUp, CalendarDays, Pencil, Trash2, FolderPlus, FolderX, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

export interface AIPrompt {
    id: string
    user_id: string
    title: string
    category: string
    prompt_text: string
    settings?: any
    thumbnail_url?: string
    result_images?: string[]
    times_used: number
    success_rate?: number
    avg_client_rating?: number
    last_used?: string
    tags?: string[]
    is_favorite: boolean
    is_proven_winner: boolean
    created_at: string
}

interface IPVaultDashboardProps {
    initialPrompts: any[]
    userId: string
}

export function IPVaultDashboard({ initialPrompts, userId }: IPVaultDashboardProps) {
    const supabase = createClient()
    const [prompts, setPrompts] = useState<AIPrompt[]>(initialPrompts)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('All')

    // Add dialog state
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [newPrompt, setNewPrompt] = useState<Partial<AIPrompt>>({
        title: '',
        category: 'Social Media',
        prompt_text: '',
        is_favorite: false,
        is_proven_winner: false
    })
    const [customCategory, setCustomCategory] = useState('')

    // Edit dialog state
    const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null)
    const [editCustomCategory, setEditCustomCategory] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    // Delete confirmation state
    const [deletePromptTarget, setDeletePromptTarget] = useState<AIPrompt | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const baseCategories = ['Social Media', 'Midjourney', 'Copywriting', 'SEO', 'Email']
    const uniquePromptCategories = Array.from(new Set(prompts.map(p => p.category))).filter(c => !baseCategories.includes(c) && c)
    const tabsCategories = ['All', ...baseCategories, ...uniquePromptCategories]
    const dropdownCategories = [...baseCategories, ...uniquePromptCategories, 'Custom...']

    // Manage Categories state
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [customCategories, setCustomCategories] = useState<string[]>(uniquePromptCategories)

    const filteredPrompts = prompts.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.prompt_text.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTab = activeTab === 'All' || p.category === activeTab || (activeTab === 'Favorites' && p.is_favorite)
        return matchesSearch && matchesTab
    })

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success("Prompt copied to clipboard!")
        // Ideally we would increment times_used here in the DB
    }

    const handleToggleFavorite = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('ai_prompts')
            .update({ is_favorite: !currentStatus })
            .eq('id', id)

        if (!error) {
            setPrompts(prev => prev.map(p => p.id === id ? { ...p, is_favorite: !currentStatus } : p))
        }
    }

    const openEditDialog = (prompt: AIPrompt) => {
        setEditingPrompt({ ...prompt })
        setEditCustomCategory('')
    }

    const handleUpdatePrompt = async () => {
        if (!editingPrompt || !editingPrompt.title || !editingPrompt.prompt_text) {
            toast.error("Title and content are required")
            return
        }

        const finalCategory = editingPrompt.category === 'Custom...'
            ? editCustomCategory.trim()
            : editingPrompt.category

        if (editingPrompt.category === 'Custom...' && !finalCategory) {
            toast.error("Please enter a custom category name")
            return
        }

        setIsEditing(true)
        const { error } = await supabase
            .from('ai_prompts')
            .update({
                title: editingPrompt.title,
                category: finalCategory,
                prompt_text: editingPrompt.prompt_text,
                is_favorite: editingPrompt.is_favorite,
                is_proven_winner: editingPrompt.is_proven_winner
            })
            .eq('id', editingPrompt.id)

        if (!error) {
            setPrompts(prev => prev.map(p =>
                p.id === editingPrompt.id ? { ...editingPrompt, category: finalCategory } : p
            ))
            setEditingPrompt(null)
            toast.success("Prompt updated!")
        } else {
            toast.error("Failed to update prompt")
            console.error(error)
        }
        setIsEditing(false)
    }

    const handleDeletePrompt = async () => {
        if (!deletePromptTarget) return
        setIsDeleting(true)
        const { error } = await supabase.from('ai_prompts').delete().eq('id', deletePromptTarget.id)
        if (!error) {
            setPrompts(prev => prev.filter(p => p.id !== deletePromptTarget.id))
            toast.success('Prompt deleted')
        } else {
            toast.error('Failed to delete prompt')
        }
        setIsDeleting(false)
        setDeletePromptTarget(null)
    }

    const handleSavePrompt = async () => {
        if (!newPrompt.title || !newPrompt.prompt_text) {
            toast.error("Please provide a title and prompt content")
            return
        }

        const finalCategory = newPrompt.category === 'Custom...' ? customCategory.trim() : (newPrompt.category || 'Social Media');
        if (newPrompt.category === 'Custom...' && !finalCategory) {
            toast.error("Please enter a custom category name")
            return
        }

        setIsSaving(true)
        const payload = {
            user_id: userId,
            title: newPrompt.title,
            category: finalCategory,
            prompt_text: newPrompt.prompt_text,
            is_favorite: newPrompt.is_favorite || false,
            is_proven_winner: newPrompt.is_proven_winner || false
        }

        const { data, error } = await supabase
            .from('ai_prompts')
            .insert(payload)
            .select()
            .single()

        if (!error && data) {
            setPrompts([data as AIPrompt, ...prompts])
            setIsAddOpen(false)
            setNewPrompt({ title: '', category: 'Social Media', prompt_text: '', is_favorite: false, is_proven_winner: false })
            setCustomCategory('')
            toast.success("Prompt saved successfully!")
        } else {
            toast.error("Failed to save prompt")
            console.error(error)
        }
        setIsSaving(false)
    }

    const handleAddCategory = () => {
        const name = newCategoryName.trim()
        if (!name || customCategories.includes(name) || baseCategories.includes(name)) {
            toast.error(!name ? 'Enter a category name' : 'Category already exists')
            return
        }
        setCustomCategories(prev => [...prev, name])
        setNewCategoryName('')
        toast.success(`Category "${name}" created`)
    }

    const handleDeleteCategory = (cat: string) => {
        const hasPrompts = prompts.some(p => p.category === cat)
        if (hasPrompts) {
            toast.error(`Cannot delete "${cat}" — it has prompts. Re-categorize them first.`)
            return
        }
        setCustomCategories(prev => prev.filter(c => c !== cat))
        if (activeTab === cat) setActiveTab('All')
        toast.success(`Category "${cat}" deleted`)
    }

    return (
        <div className="space-y-6">
            {/* Header / Search / Filter */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex bg-secondary/50 p-1 rounded-xl border border-white/5 overflow-x-auto w-full sm:w-auto">
                    {tabsCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === cat
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                    <button
                        onClick={() => setActiveTab('Favorites')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1 ${activeTab === 'Favorites'
                            ? 'bg-background text-yellow-400 shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                            }`}
                    >
                        <Star className="w-4 h-4" />
                        Favorites
                    </button>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search prompts..."
                            className="pl-9 bg-secondary/30 border-white/10 w-full"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Manage Categories Dialog */}
                    <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-white/10 text-muted-foreground hover:text-foreground shrink-0 gap-2">
                                <Settings2 className="w-4 h-4" /><span className="hidden sm:inline">Categories</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border sm:max-w-[420px]">
                            <DialogHeader>
                                <DialogTitle>Manage Categories</DialogTitle>
                                <DialogDescription>Create or delete custom prompt categories.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="flex gap-2">
                                    <Input placeholder="New category name..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddCategory()} className="bg-secondary/50 border-white/10 flex-1" />
                                    <Button onClick={handleAddCategory} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 gap-1">
                                        <FolderPlus className="w-4 h-4" /> Create
                                    </Button>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Built-in Categories</p>
                                    <div className="space-y-1">
                                        {baseCategories.map(cat => (
                                            <div key={cat} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/20 border border-white/5">
                                                <span className="text-sm text-muted-foreground">{cat}</span>
                                                <span className="text-[10px] text-muted-foreground/50">{prompts.filter(p => p.category === cat).length} prompts</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {customCategories.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Custom Categories</p>
                                        <div className="space-y-1">
                                            {customCategories.map(cat => (
                                                <div key={cat} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 border border-white/8 group">
                                                    <span className="text-sm text-foreground">{cat}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-muted-foreground">{prompts.filter(p => p.category === cat).length} prompts</span>
                                                        <button onClick={() => handleDeleteCategory(cat)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0">
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">New Prompt</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] bg-card border-border">
                            <DialogHeader>
                                <DialogTitle>Add to Vault</DialogTitle>
                                <DialogDescription>Store a proven AI prompt or asset template.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Title</label>
                                    <Input
                                        placeholder="e.g. Viral Hook Generator"
                                        value={newPrompt.title}
                                        onChange={e => setNewPrompt({ ...newPrompt, title: e.target.value })}
                                        className="bg-secondary/50 border-white/10"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <Select value={newPrompt.category} onValueChange={(val: string) => setNewPrompt({ ...newPrompt, category: val })}>
                                        <SelectTrigger className="bg-secondary/50 border-white/10 mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card">
                                            {dropdownCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {newPrompt.category === 'Custom...' && (
                                        <Input
                                            placeholder="Enter custom category name"
                                            value={customCategory}
                                            onChange={e => setCustomCategory(e.target.value)}
                                            className="bg-secondary/50 border-white/10 mt-1"
                                            autoFocus
                                        />
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Prompt Content</label>
                                    <textarea
                                        placeholder="Act as a master copywriter. Your task is to..."
                                        value={newPrompt.prompt_text}
                                        onChange={e => setNewPrompt({ ...newPrompt, prompt_text: e.target.value })}
                                        className="flex min-h-[150px] w-full rounded-md border border-white/10 bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newPrompt.is_proven_winner}
                                            onChange={e => setNewPrompt({ ...newPrompt, is_proven_winner: e.target.checked })}
                                            className="rounded border-white/20 bg-secondary/50"
                                        />
                                        Mark as Proven Winner
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newPrompt.is_favorite}
                                            onChange={e => setNewPrompt({ ...newPrompt, is_favorite: e.target.checked })}
                                            className="rounded border-white/20 bg-secondary/50"
                                        />
                                        Add to Favorites
                                    </label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button onClick={handleSavePrompt} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    {isSaving ? 'Saving...' : 'Save to Vault'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Prompts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrompts.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-white/5 border-dashed">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-foreground mb-1">No prompts found</h3>
                        <p className="text-sm">Store your best prompts here to ensure high-quality output every time.</p>
                        <Button variant="outline" className="mt-4" onClick={() => setIsAddOpen(true)}>
                            Add Your First Prompt
                        </Button>
                    </div>
                ) : (
                    filteredPrompts.map(prompt => (
                        <Card key={prompt.id} className="bg-card border-border/50 hover:border-primary/50 transition-colors group flex flex-col">
                            <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                            {prompt.category}
                                        </span>
                                        {prompt.is_proven_winner && (
                                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" /> Proven
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="text-base font-semibold leading-tight">{prompt.title}</CardTitle>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleToggleFavorite(prompt.id, prompt.is_favorite)}
                                        className={`p-1.5 rounded-md transition-colors ${prompt.is_favorite ? 'text-yellow-400' : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary'}`}
                                        title="Toggle favorite"
                                    >
                                        <Star className="w-4 h-4" fill={prompt.is_favorite ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        onClick={() => openEditDialog(prompt)}
                                        className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary hover:text-foreground transition-colors"
                                        title="Edit prompt"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setDeletePromptTarget(prompt)}
                                        className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-colors"
                                        title="Delete prompt"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-4 flex-1">
                                <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed bg-secondary/30 p-3 rounded-lg border border-white/5 text-xs font-mono">
                                    {prompt.prompt_text}
                                </p>
                            </CardContent>
                            <CardFooter className="pt-0 flex items-center justify-between border-t border-white/5 pt-4">
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5" title="Times Used">
                                        <Sparkles className="w-3.5 h-3.5" /> {prompt.times_used || 0}
                                    </span>
                                    <span className="flex items-center gap-1.5" title="Added">
                                        <CalendarDays className="w-3.5 h-3.5 hidden" /> {format(new Date(prompt.created_at), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 gap-2 hover:bg-primary/20 hover:text-primary transition-colors"
                                    onClick={() => handleCopy(prompt.prompt_text)}
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingPrompt} onOpenChange={(open) => !open && setEditingPrompt(null)}>
                <DialogContent className="sm:max-w-[600px] bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Edit Prompt</DialogTitle>
                        <DialogDescription>Update any fields and save your changes.</DialogDescription>
                    </DialogHeader>
                    {editingPrompt && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Title</label>
                                <Input
                                    value={editingPrompt.title}
                                    onChange={e => setEditingPrompt({ ...editingPrompt, title: e.target.value })}
                                    className="bg-secondary/50 border-white/10"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select value={editingPrompt.category} onValueChange={(val: string) => setEditingPrompt({ ...editingPrompt, category: val })}>
                                    <SelectTrigger className="bg-secondary/50 border-white/10 mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card">
                                        {dropdownCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {editingPrompt.category === 'Custom...' && (
                                    <Input
                                        placeholder="Enter custom category name"
                                        value={editCustomCategory}
                                        onChange={e => setEditCustomCategory(e.target.value)}
                                        className="bg-secondary/50 border-white/10 mt-1"
                                        autoFocus
                                    />
                                )}
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Prompt Content</label>
                                <textarea
                                    value={editingPrompt.prompt_text}
                                    onChange={e => setEditingPrompt({ ...editingPrompt, prompt_text: e.target.value })}
                                    className="flex min-h-[150px] w-full rounded-md border border-white/10 bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingPrompt.is_proven_winner}
                                        onChange={e => setEditingPrompt({ ...editingPrompt, is_proven_winner: e.target.checked })}
                                        className="rounded border-white/20 bg-secondary/50"
                                    />
                                    Mark as Proven Winner
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingPrompt.is_favorite}
                                        onChange={e => setEditingPrompt({ ...editingPrompt, is_favorite: e.target.checked })}
                                        className="rounded border-white/20 bg-secondary/50"
                                    />
                                    Favorite
                                </label>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingPrompt(null)}>Cancel</Button>
                        <Button onClick={handleUpdatePrompt} disabled={isEditing} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {isEditing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletePromptTarget} onOpenChange={open => { if (!open) setDeletePromptTarget(null) }}>
                <DialogContent className="sm:max-w-[380px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <AlertTriangle className="w-4 h-4 text-red-500" /> Delete Prompt?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-foreground">"{deletePromptTarget?.title}"</span> from the vault? This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setDeletePromptTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeletePrompt} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
