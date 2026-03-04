'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type DeliverableStatus = 'pending' | 'in-progress' | 'review' | 'completed'
type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface Deliverable {
    id: string
    clientId: string
    clientName: string
    title: string
    status: DeliverableStatus
    priority: Priority
    dueDate: string
    assignedTo: string
}

interface Client {
    id: string
    name: string
}

interface DeliverableListProps {
    initialDeliverables: any[]
    initialClients: Client[]
    userId: string
}

export function DeliverableList({ initialDeliverables, initialClients, userId }: DeliverableListProps) {
    const supabase = createClient()
    const [tasks, setTasks] = useState<Deliverable[]>([])
    const [clients, setClients] = useState<Client[]>(initialClients)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Deliverable | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form state
    const [formData, setFormData] = useState<Partial<Deliverable>>({
        title: '', status: 'pending', priority: 'medium', dueDate: '', assignedTo: '', clientId: ''
    })
    const [customClientName, setCustomClientName] = useState('')

    useEffect(() => {
        const mapped: Deliverable[] = initialDeliverables.map((d: any) => ({
            id: d.id,
            clientId: d.client_id,
            clientName: d.clients?.name || d.client_id || 'Unknown',
            title: d.title,
            status: d.status as DeliverableStatus,
            priority: (d.priority || 'medium') as Priority,
            dueDate: d.due_date || '',
            assignedTo: d.assigned_to || ''
        }))
        setTasks(mapped)
    }, [initialDeliverables])

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.clientName.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = filterStatus === 'all' || t.status === filterStatus
            return matchesSearch && matchesStatus
        })
    }, [tasks, searchQuery, filterStatus])

    const handleInlineStatusChange = async (id: string, newStatus: DeliverableStatus) => {
        const { error } = await supabase.from('deliverables').update({ status: newStatus }).eq('id', id)
        if (!error) {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
        } else {
            toast.error('Failed to update status')
        }
    }

    const handleRowDelete = (task: Deliverable) => {
        setDeleteTarget(task)
    }

    const confirmRowDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        const { error } = await supabase.from('deliverables').delete().eq('id', deleteTarget.id)
        if (!error) {
            setTasks(prev => prev.filter(t => t.id !== deleteTarget.id))
            toast.success('Deliverable deleted')
        } else {
            toast.error(error.message || 'Failed to delete deliverable')
        }
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const openCreateModal = () => {
        setModalMode('create')
        setEditingId(null)
        setFormData({ title: '', status: 'pending', priority: 'medium', dueDate: '', assignedTo: '', clientId: clients[0]?.id || '' })
        setCustomClientName('')
        setIsModalOpen(true)
    }

    const openEditModal = (task: Deliverable) => {
        setModalMode('edit')
        setEditingId(task.id)
        setFormData({
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            assignedTo: task.assignedTo,
            clientId: task.clientId
        })
        setCustomClientName('')
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.title?.trim()) { toast.error('Title is required'); return }
        setIsSaving(true)

        let finalClientId = formData.clientId || ''
        let finalClientName = clients.find(c => c.id === finalClientId)?.name || ''

        if (customClientName.trim()) {
            const { data: newClient, error: clientErr } = await supabase
                .from('clients')
                .insert({
                    user_id: userId,
                    name: customClientName,
                    company: customClientName
                })
                .select('id, name')
                .single()

            if (clientErr) throw clientErr

            finalClientId = newClient.id
            finalClientName = newClient.name
            setClients(prev => [...prev, newClient]) // Update local state for dropdowns
        }

        if (!finalClientId) {
            setIsSaving(false)
            return // Must select or create a client
        }

        const dbPayload = {
            user_id: userId,
            client_id: finalClientId,
            title: formData.title,
            status: formData.status,
            priority: formData.priority,
            due_date: formData.dueDate,
            assigned_to: formData.assignedTo
        }

        if (modalMode === 'create') {
            const { data, error } = await supabase
                .from('deliverables')
                .insert(dbPayload)
                .select('id')
                .single()

            if (error) throw error

            // Optimistic visual block addition
            const newTask: Deliverable = {
                id: data.id,
                clientId: finalClientId,
                clientName: finalClientName,
                title: formData.title!,
                status: formData.status as DeliverableStatus,
                priority: formData.priority as Priority,
                dueDate: formData.dueDate!,
                assignedTo: formData.assignedTo!
            }
            setTasks(prev => [newTask, ...prev])
            toast.success('Deliverable created!')
        } else if (editingId) {
            const { error } = await supabase
                .from('deliverables')
                .update(dbPayload)
                .eq('id', editingId)

            if (error) throw error

            setTasks(prev => prev.map(t => t.id === editingId ? {
                ...t,
                clientId: finalClientId,
                clientName: finalClientName,
                title: formData.title!,
                status: formData.status as DeliverableStatus,
                priority: formData.priority as Priority,
                dueDate: formData.dueDate!,
                assignedTo: formData.assignedTo!
            } : t))
            toast.success('Deliverable updated!')
        }

        setIsSaving(false)
        setIsModalOpen(false)
    }

    const getStatusStyle = (status: DeliverableStatus) => {
        switch (status) {
            case 'pending': return 'bg-secondary/80 text-muted-foreground border-border'
            case 'in-progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            case 'review': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }
    }

    const getPriorityStyle = (priority: Priority) => {
        switch (priority) {
            case 'low': return 'text-gray-400'
            case 'medium': return 'text-blue-400'
            case 'high': return 'text-amber-400'
            case 'urgent': return 'text-red-400'
        }
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Find tasks or clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-card border-border text-foreground focus:ring-primary transition-all"
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                        <SelectTrigger className="w-[140px] bg-secondary/50 border-border text-foreground">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="review">In Review</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button onClick={openCreateModal} className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap">
                    <Plus className="h-4 w-4 mr-2" /> New Task
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary/30 border-border hover:bg-secondary/30">
                                <TableHead className="text-foreground font-semibold">Task</TableHead>
                                <TableHead className="text-foreground font-semibold">Client</TableHead>
                                <TableHead className="text-foreground font-semibold">Due Date</TableHead>
                                <TableHead className="text-foreground font-semibold">Priority</TableHead>
                                <TableHead className="text-foreground font-semibold">Assigned To</TableHead>
                                <TableHead className="text-foreground font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                        {searchQuery || filterStatus !== 'all' ? 'No tasks match your filters.' : 'No deliverables yet. Create your first task!'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTasks.map(task => (
                                    <TableRow key={task.id} className="border-border hover:bg-secondary/20 transition-colors group">
                                        <TableCell className="font-medium text-foreground">
                                            <button
                                                onClick={() => openEditModal(task)}
                                                className="text-left hover:text-primary transition-colors"
                                            >
                                                {task.title}
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{task.clientName}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs font-semibold capitalize ${getPriorityStyle(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{task.assignedTo || '—'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                {task.status !== 'completed' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleInlineStatusChange(task.id, 'completed')}
                                                        className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Mark as Completed"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Select value={task.status} onValueChange={(val: DeliverableStatus) => handleInlineStatusChange(task.id, val)}>
                                                    <SelectTrigger className={`h-8 w-[130px] ${getStatusStyle(task.status)} capitalize`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-card border-border">
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="in-progress">In Progress</SelectItem>
                                                        <SelectItem value="review">In Review</SelectItem>
                                                        <SelectItem value="completed">Completed</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRowDelete(task)}
                                                    className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[520px] bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>{modalMode === 'create' ? 'New Deliverable' : 'Edit Deliverable'}</DialogTitle>
                        <DialogDescription>
                            {modalMode === 'create' ? 'Add a new task to track for a client.' : 'Update the deliverable details.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Task Title *</Label>
                            <Input
                                placeholder="e.g. Design homepage mockup"
                                value={formData.title || ''}
                                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                className="bg-secondary/50 border-border"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Select
                                    value={formData.clientId || ''}
                                    onValueChange={val => setFormData(p => ({ ...p, clientId: val }))}
                                    disabled={!!customClientName}
                                >
                                    <SelectTrigger className="bg-secondary/50 border-border">
                                        <SelectValue placeholder="Select client" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="Or type new client name"
                                    value={customClientName}
                                    onChange={e => setCustomClientName(e.target.value)}
                                    className="bg-secondary/50 border-border text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input
                                    type="date"
                                    value={formData.dueDate || ''}
                                    onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                                    className="bg-secondary/50 border-border"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={formData.status || 'pending'} onValueChange={val => setFormData(p => ({ ...p, status: val as DeliverableStatus }))}>
                                    <SelectTrigger className="bg-secondary/50 border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in-progress">In Progress</SelectItem>
                                        <SelectItem value="review">In Review</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select value={formData.priority || 'medium'} onValueChange={val => setFormData(p => ({ ...p, priority: val as Priority }))}>
                                    <SelectTrigger className="bg-secondary/50 border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Assigned To</Label>
                            <Input
                                placeholder="e.g. Rahul, Priya"
                                value={formData.assignedTo || ''}
                                onChange={e => setFormData(p => ({ ...p, assignedTo: e.target.value }))}
                                className="bg-secondary/50 border-border"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {isSaving ? 'Saving...' : modalMode === 'create' ? 'Create Task' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
                <DialogContent className="sm:max-w-[380px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <AlertTriangle className="w-4 h-4 text-red-500" /> Delete Deliverable?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteTarget?.title}"</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmRowDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}