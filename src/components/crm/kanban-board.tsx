'use client'

import React, { useState, useEffect } from 'react'
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { Lead } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type StageId = 'lead' | 'contacted' | 'meeting' | 'proposal' | 'closed'

interface KanbanBoardProps {
    initialLeads: Lead[]
}

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
    const supabase = createClient()
    const [leads, setLeads] = useState<Lead[]>(initialLeads)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])


    // Modal state
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingLead, setEditingLead] = useState<Partial<Lead> | null>(null)
    const [confirmDeleteLead, setConfirmDeleteLead] = useState(false)
    const [isCustomService, setIsCustomService] = useState(false)
    const [customServiceValue, setCustomServiceValue] = useState('')

    const serviceOptions = ['AI Shoot', 'Web Development', 'AI Automations']

    const columns: { id: StageId; title: string }[] = [
        { id: 'lead', title: 'New Leads' },
        { id: 'contacted', title: 'Contacted' },
        { id: 'meeting', title: 'Meeting Set' },
        { id: 'proposal', title: 'Proposal Sent' },
        { id: 'closed', title: 'Closed Won' },
    ]

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id)
    }

    const handleDragOver = (event: any) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const overId = over.id
        const activeLead = leads.find((l) => l.id === activeId)
        const overLead = leads.find((l) => l.id === overId)

        if (!activeLead) return

        // Dropping a Lead over another Lead (Reordering within or across columns)
        if (activeLead && overLead && activeLead.stage !== overLead.stage) {
            setLeads((prev) => {
                const activeIndex = prev.findIndex((l) => l.id === activeId)
                const updatedLeads = [...prev]
                updatedLeads[activeIndex].stage = overLead.stage

                supabase.from('leads').update({ status: overLead.stage }).eq('id', activeId).then(({ error }) => {
                    if (error) console.error('Failed to update lead stage:', error)
                })

                return arrayMove(updatedLeads, activeIndex, activeIndex)
            })
        }

        // Dropping a Lead over an empty Column area
        const isOverColumn = columns.find((c) => c.id === overId)
        if (isOverColumn && activeLead.stage !== overId) {
            setLeads((prev) => {
                const activeIndex = prev.findIndex((l) => l.id === activeId)
                const updatedLeads = [...prev]
                updatedLeads[activeIndex].stage = overId as StageId

                supabase.from('leads').update({ status: overId }).eq('id', activeId).then(({ error }) => {
                    if (error) console.error('Failed to update lead stage:', error)
                })

                return arrayMove(updatedLeads, activeIndex, activeIndex)
            })
        }
    }

    const handleDragEnd = (event: any) => {
        const { active, over } = event
        if (!over) {
            setActiveId(null)
            return
        }

        const activeId = active.id
        const overId = over.id
        const activeIndex = leads.findIndex((l) => l.id === activeId)
        const overIndex = leads.findIndex((l) => l.id === overId)

        if (activeIndex !== overIndex) {
            setLeads((prev) => arrayMove(prev, activeIndex, overIndex))
        }

        setActiveId(null)
    }

    const activeLead = leads.find((l) => l.id === activeId)

    // Dialog handlers
    const handleNewLead = () => {
        setEditingLead({ id: Date.now().toString(), name: '', company: '', stage: 'lead', value: 0, service: 'AI Shoot' })
        setIsCustomService(false)
        setCustomServiceValue('')
        setIsDialogOpen(true)
    }

    const handleEditLead = (lead: Lead) => {
        setEditingLead(lead)
        const isCustom = lead.service ? !serviceOptions.includes(lead.service) : false
        setIsCustomService(isCustom)
        setCustomServiceValue(isCustom ? (lead.service || '') : '')
        setIsDialogOpen(true)
    }

    const handleSaveLead = async () => {
        if (!editingLead?.name) return

        const isNew = leads.findIndex(l => l.id === editingLead.id) === -1
        const finalService = isCustomService ? customServiceValue : editingLead.service

        const payload = {
            name: editingLead.name,
            company: editingLead.company,
            status: editingLead.stage,
            value: editingLead.value,
            service: finalService
        }

        if (isNew) {
            const { data: { user } } = await supabase.auth.getUser()
            const { data, error } = await supabase.from('leads').insert({ ...payload, user_id: user?.id }).select().single()
            if (error) { toast.error('Failed to create lead'); return }
            setLeads(prev => [...prev, { ...editingLead, ...payload, id: data.id } as Lead])
            toast.success('Lead created')
        } else {
            const { error } = await supabase.from('leads').update(payload).eq('id', editingLead.id)
            if (error) { toast.error('Failed to update lead'); return }
            setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...editingLead, ...payload } as Lead : l))
            toast.success('Lead updated')
        }

        setIsDialogOpen(false)
    }

    const handleDeleteLead = async () => {
        if (!editingLead?.id) return
        if (!confirmDeleteLead) { setConfirmDeleteLead(true); return }
        const { error } = await supabase.from('leads').delete().eq('id', editingLead.id)
        if (!error) {
            setLeads(prev => prev.filter(l => l.id !== editingLead.id))
            setIsDialogOpen(false)
            setConfirmDeleteLead(false)
            toast.success('Lead deleted')
        } else {
            toast.error('Failed to delete lead')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">CRM Pipeline</h1>
                    <p className="text-muted-foreground mt-1">Manage your active leads and deal stages.</p>
                </div>
                <Button onClick={handleNewLead} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    New Lead
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-card border-border sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">{leads.find(l => l.id === editingLead?.id) ? 'Edit Lead' : 'New Lead'}</DialogTitle>
                        <DialogDescription>Enter the details for this lead.</DialogDescription>
                    </DialogHeader>
                    {editingLead && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-foreground">Lead Name</Label>
                                <Input id="name" value={editingLead.name || ''} onChange={e => setEditingLead({ ...editingLead, name: e.target.value })} className="bg-secondary/50 border-border focus:ring-primary transition-all text-sm" placeholder="e.g. John Doe" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="company" className="text-foreground">Company</Label>
                                <Input id="company" value={editingLead.company || ''} onChange={e => setEditingLead({ ...editingLead, company: e.target.value })} className="bg-secondary/50 border-border focus:ring-primary transition-all text-sm" placeholder="e.g. Acme Corp" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="value" className="text-foreground">Value (₹)</Label>
                                <Input id="value" type="number" value={editingLead.value || ''} onChange={e => setEditingLead({ ...editingLead, value: parseInt(e.target.value) || 0 })} className="bg-secondary/50 border-border focus:ring-primary transition-all text-sm" placeholder="e.g. 5000" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="stage" className="text-foreground">Pipeline Stage</Label>
                                <Select value={editingLead.stage} onValueChange={(val: StageId) => setEditingLead({ ...editingLead, stage: val })}>
                                    <SelectTrigger className="bg-secondary/50 border-border text-foreground">
                                        <SelectValue placeholder="Select a stage" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        {columns.map(col => (
                                            <SelectItem key={col.id} value={col.id} className="focus:bg-primary/20 focus:text-primary cursor-pointer">{col.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="service" className="text-foreground">Service Type</Label>
                                <Select
                                    value={isCustomService ? 'custom' : editingLead.service || ''}
                                    onValueChange={(val: string) => {
                                        if (val === 'custom') {
                                            setIsCustomService(true)
                                        } else {
                                            setIsCustomService(false)
                                            setEditingLead({ ...editingLead, service: val })
                                        }
                                    }}
                                >
                                    <SelectTrigger className="bg-secondary/50 border-border text-foreground">
                                        <SelectValue placeholder="Select a service" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        {serviceOptions.map(opt => (
                                            <SelectItem key={opt} value={opt} className="focus:bg-primary/20 focus:text-primary cursor-pointer">{opt}</SelectItem>
                                        ))}
                                        <SelectItem value="custom" className="focus:bg-primary/20 focus:text-primary cursor-pointer text-primary font-medium">Custom Service Type</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {isCustomService && (
                                <div className="grid gap-2 animate-in slide-in-from-top-2 duration-300">
                                    <Label htmlFor="custom-service" className="text-foreground">Specify Service</Label>
                                    <Input
                                        id="custom-service"
                                        value={customServiceValue}
                                        onChange={e => setCustomServiceValue(e.target.value)}
                                        className="bg-secondary/50 border-border focus:ring-primary transition-all text-sm"
                                        placeholder="e.g. Video Editing"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        {leads.find(l => l.id === editingLead?.id) && (
                            <Button variant="ghost" onClick={handleDeleteLead} className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto">
                                <Trash2 className="w-4 h-4 mr-1" /> Delete Lead
                            </Button>
                        )}
                        <Button onClick={handleSaveLead} className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium">Save Lead</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="bg-card rounded-xl shadow-sm border border-border/50 p-4 pt-6">
                {!isMounted ? null : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-16rem)] min-h-[500px] custom-scrollbar">
                            {columns.map((col) => (
                                <KanbanColumn
                                    key={col.id}
                                    id={col.id}
                                    title={col.title}
                                    leads={leads.filter((l) => l.stage === col.id)}
                                    onCardClick={handleEditLead}
                                />
                            ))}

                            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
                                {activeLead ? <KanbanCard lead={activeLead} isOverlay /> : null}
                            </DragOverlay>
                        </div>
                    </DndContext>
                )}
            </div>
        </div>
    )
}
