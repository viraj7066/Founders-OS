'use client'

import { useState } from 'react'
import { OutreachScript, Campaign } from '@/types/outreach'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, Copy, Search, MessageSquare, Mail, Phone, ExternalLink, Calendar, Pencil, Trash2, AlertTriangle, Instagram } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface OutreachDashboardProps {
    initialScripts: OutreachScript[]
    initialCampaigns: Campaign[]
    initialFollowups?: any[]
    userId: string
}

export function OutreachDashboard({ initialScripts, initialCampaigns, initialFollowups = [], userId }: OutreachDashboardProps) {
    const supabase = createClient()
    const [scripts, setScripts] = useState<OutreachScript[]>(initialScripts)
    const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
    const [followups, setFollowups] = useState<any[]>(initialFollowups)
    const [searchQuery, setSearchQuery] = useState('')

    // Script Modal State
    const [isScriptModalOpen, setIsScriptModalOpen] = useState(false)
    const [editingScriptId, setEditingScriptId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Delete confirmation state
    const [deleteScriptTarget, setDeleteScriptTarget] = useState<OutreachScript | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Campaign Modal State
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false)
    const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
        name: '', status: 'active', targetAudience: ''
    })
    const [newScript, setNewScript] = useState<Partial<OutreachScript>>({
        title: '', platform: 'linkedin', category: 'cold', content: ''
    })

    const filteredScripts = scripts.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleCopyScript = (content: string) => {
        navigator.clipboard.writeText(content)
        toast.success("Script copied to clipboard!")
    }

    const openCreateScriptModal = () => {
        setEditingScriptId(null)
        setNewScript({ title: '', platform: 'linkedin', category: 'cold', content: '' })
        setIsScriptModalOpen(true)
    }

    const openEditScriptModal = (script: OutreachScript) => {
        setEditingScriptId(script.id)
        setNewScript({ title: script.title, platform: script.platform, category: script.category, content: script.content })
        setIsScriptModalOpen(true)
    }

    const handleSaveScript = async () => {
        if (!newScript.title?.trim() || !newScript.content?.trim()) {
            toast.error("Please fill in both the Title and the Script Content")
            return
        }
        setIsSaving(true)

        const payload = {
            user_id: userId,
            title: newScript.title,
            platform: newScript.platform || 'linkedin',
            category: newScript.category || 'cold',
            content: newScript.content
        }

        if (editingScriptId) {
            // UPDATE
            const { data, error } = await supabase
                .from('outreach_scripts')
                .update(payload)
                .eq('id', editingScriptId)
                .select()
                .single()

            if (!error && data) {
                setScripts(prev => prev.map(s => s.id === editingScriptId ? {
                    ...s,
                    title: data.title,
                    platform: data.platform as any,
                    category: data.category as any,
                    content: data.content,
                    updatedAt: data.updated_at
                } : s))
                toast.success("Script updated!")
            } else {
                toast.error(error?.message || "Failed to update script")
            }
        } else {
            // INSERT
            const { data, error } = await supabase
                .from('outreach_scripts')
                .insert(payload)
                .select()
                .single()

            if (!error && data) {
                const addedScript: OutreachScript = {
                    id: data.id,
                    userId: data.user_id,
                    title: data.title,
                    platform: data.platform as any,
                    category: data.category as any,
                    content: data.content,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                }
                setScripts([addedScript, ...scripts])
                toast.success("Script saved successfully")
            } else {
                toast.error(error?.message || "Failed to save script to database")
            }
        }

        setIsScriptModalOpen(false)
        setNewScript({ title: '', platform: 'linkedin', category: 'cold', content: '' })
        setEditingScriptId(null)
        setIsSaving(false)
    }

    const handleDeleteScript = async () => {
        if (!deleteScriptTarget) return
        setIsDeleting(true)
        const { error } = await supabase.from('outreach_scripts').delete().eq('id', deleteScriptTarget.id)
        if (!error) {
            setScripts(prev => prev.filter(s => s.id !== deleteScriptTarget.id))
            toast.success("Script deleted")
        } else {
            toast.error(error.message || "Failed to delete script")
        }
        setIsDeleting(false)
        setDeleteScriptTarget(null)
    }

    const handleSaveCampaign = async () => {
        if (!newCampaign.name?.trim()) {
            toast.error("Please provide a campaign name")
            return
        }
        setIsSaving(true)

        const payload = {
            user_id: userId,
            name: newCampaign.name,
            status: newCampaign.status || 'active',
            target_audience: newCampaign.targetAudience || ''
        }

        const { data, error } = await supabase
            .from('campaigns')
            .insert(payload)
            .select()
            .single()

        if (!error && data) {
            const addedCampaign: Campaign = {
                id: data.id,
                userId: data.user_id,
                name: data.name,
                status: data.status as any,
                targetAudience: data.target_audience,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            }
            setCampaigns([addedCampaign, ...campaigns])
            setIsCampaignModalOpen(false)
            setNewCampaign({ name: '', status: 'active', targetAudience: '' })
            toast.success("Campaign created successfully")
        } else {
            toast.error(error?.message || "Failed to create campaign")
        }
        setIsSaving(false)
    }

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'linkedin': return <MessageSquare className="w-4 h-4 text-blue-400" />
            case 'email': return <Mail className="w-4 h-4 text-emerald-400" />
            case 'whatsapp': return <Phone className="w-4 h-4 text-green-500" />
            case 'instagram': return <Instagram className="w-4 h-4 text-pink-500" />
            default: return <MessageSquare className="w-4 h-4" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metric Cards */}
                <Card className="bg-secondary/30 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Active Campaigns</CardDescription>
                        <CardTitle className="text-3xl font-bold">{campaigns.filter(c => c.status === 'active').length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-secondary/30 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Saved Scripts</CardDescription>
                        <CardTitle className="text-3xl font-bold">{scripts.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-secondary/30 border-border/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Follow-ups Today</CardDescription>
                        <CardTitle className="text-3xl font-bold text-amber-500">{followups.length}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Tabs defaultValue="scripts" className="w-full">
                <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
                    <TabsList className="bg-transparent space-x-2">
                        <TabsTrigger value="scripts" className="data-[state=active]:bg-secondary/50 data-[state=active]:text-primary rounded-md px-4 py-2">Scripts Library</TabsTrigger>
                        <TabsTrigger value="queue" className="data-[state=active]:bg-secondary/50 data-[state=active]:text-primary rounded-md px-4 py-2">Follow-up Queue</TabsTrigger>
                        <TabsTrigger value="campaigns" className="data-[state=active]:bg-secondary/50 data-[state=active]:text-primary rounded-md px-4 py-2">Campaigns</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="scripts" className="space-y-4 outline-none">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search scripts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-card border-border text-foreground"
                            />
                        </div>

                        <Button onClick={openCreateScriptModal} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="h-4 w-4 mr-2" /> New Script
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                        {filteredScripts.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-muted-foreground bg-secondary/10 rounded-xl border border-border/50 border-dashed">
                                No scripts found. Create your first outreach script!
                            </div>
                        ) : filteredScripts.map(script => (
                            <Card key={script.id} className="bg-card border-border/50 hover:border-primary/50 transition-colors group flex flex-col">
                                <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
                                    <div className="space-y-1 flex-1 min-w-0 mr-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            {getPlatformIcon(script.platform)}
                                            <span className="truncate">{script.title}</span>
                                        </CardTitle>
                                        <Badge variant="outline" className="capitalize text-xs font-normal">
                                            {script.category}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleCopyScript(script.content)}
                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                            title="Copy script"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditScriptModal(script)}
                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                            title="Edit script"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDeleteScriptTarget(script)}
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            title="Delete script"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="bg-secondary/30 p-3 rounded-md text-sm text-muted-foreground font-mono leading-relaxed line-clamp-4 relative group-hover:line-clamp-none transition-all">
                                        {script.content}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="queue" className="outline-none">
                    {followups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {followups.map(f => (
                                <Card key={f.id} className="bg-card border-border/50 transition-colors">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{f.company}</CardTitle>
                                        <CardDescription>{f.name}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">{f.action}</Badge>
                                            <span className="text-xs text-muted-foreground ml-auto">Due Today</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-card border border-border/50 rounded-xl p-8 text-center">
                            <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-1">Follow-up Queue Empty</h3>
                            <p className="text-muted-foreground">Log an outreach attempt in the CRM to schedule your first follow-up.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="campaigns" className="outline-none">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold">Active Campaigns</h3>
                        <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Plus className="h-4 w-4 mr-2" /> New Campaign
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Create Campaign</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Campaign Name</Label>
                                        <Input value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} className="bg-secondary/50 border-border" placeholder="e.g. Q4 SaaS Founders" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Target Audience</Label>
                                        <Input value={newCampaign.targetAudience} onChange={e => setNewCampaign({ ...newCampaign, targetAudience: e.target.value })} className="bg-secondary/50 border-border" placeholder="e.g. Series A Tech Startups" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleSaveCampaign} disabled={isSaving} className="bg-primary text-primary-foreground">
                                        {isSaving ? 'Creating...' : 'Create Campaign'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {campaigns.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {campaigns.map(c => (
                                <Card key={c.id} className="bg-card border-border/50 transition-colors">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base">{c.name}</CardTitle>
                                            <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                                                {c.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{c.targetAudience}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-card border border-border/50 rounded-xl p-8 text-center mt-6">
                            <ExternalLink className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-1">Campaigns Overview</h3>
                            <p className="text-muted-foreground">You don&apos;t have any active campaigns right now. Start a new campaign to organize prospects.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Create / Edit Script Modal */}
            <Dialog open={isScriptModalOpen} onOpenChange={open => { setIsScriptModalOpen(open); if (!open) { setEditingScriptId(null); setNewScript({ title: '', platform: 'linkedin', category: 'cold', content: '' }) } }}>
                <DialogContent className="bg-card border-border sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">{editingScriptId ? 'Edit Outreach Script' : 'Create Outreach Script'}</DialogTitle>
                        <DialogDescription>Save a template with placeholders like [Name] or [Company].</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label className="text-foreground">Title (Internal)</Label>
                            <Input value={newScript.title} onChange={e => setNewScript({ ...newScript, title: e.target.value })} className="bg-secondary/50 border-border" placeholder="e.g. Initial LinkedIn Connect" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-foreground">Platform</Label>
                                <Select value={newScript.platform} onValueChange={(val: any) => setNewScript({ ...newScript, platform: val })}>
                                    <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                        <SelectItem value="instagram">Instagram</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-foreground">Category</Label>
                                <Select value={newScript.category} onValueChange={(val: any) => setNewScript({ ...newScript, category: val })}>
                                    <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="cold">Cold Outreach</SelectItem>
                                        <SelectItem value="follow-up">Follow-up</SelectItem>
                                        <SelectItem value="inbound">Inbound Reply</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-foreground">Script Content</Label>
                            <Textarea
                                value={newScript.content}
                                onChange={e => setNewScript({ ...newScript, content: e.target.value })}
                                className="bg-secondary/50 border-border min-h-[150px] font-mono text-sm leading-relaxed"
                                placeholder="Hi [Name], I noticed you are hiring..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsScriptModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveScript} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {isSaving ? 'Saving...' : editingScriptId ? 'Save Changes' : 'Save Script'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteScriptTarget} onOpenChange={open => { if (!open) setDeleteScriptTarget(null) }}>
                <DialogContent className="sm:max-w-[380px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <AlertTriangle className="w-4 h-4 text-red-500" /> Delete Script?
                        </DialogTitle>
                        <DialogDescription>
                            Delete &ldquo;<strong>{deleteScriptTarget?.title}</strong>&rdquo;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setDeleteScriptTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteScript} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
