'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Task, Subtask } from '@/types/tasks'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, Plus, Trash2 } from 'lucide-react'

interface Props {
    isOpen: boolean
    onClose: () => void
    task: Task
    userId: string
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>
}

export function TaskModal({ isOpen, onClose, task, userId, setTasks }: Props) {
    const supabase = createClient()
    const [title, setTitle] = useState(task.title)
    const [description, setDescription] = useState(task.description || '')
    const [priority, setPriority] = useState(task.priority)
    const [dueDate, setDueDate] = useState(task.due_date || '')
    const [timeEstimate, setTimeEstimate] = useState(task.time_estimate || '')
    const [tagsInput, setTagsInput] = useState(task.tags.join(', '))
    const [isRecurring, setIsRecurring] = useState(task.is_recurring)
    const [recurringFreq, setRecurringFreq] = useState(task.recurring_frequency || 'Daily')
    const [customFreq, setCustomFreq] = useState(task.recurring_frequency && !['Daily', 'Weekly'].includes(task.recurring_frequency) ? task.recurring_frequency : '')
    const [notes, setNotes] = useState(task.notes || '')
    const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || [])
    const [isSaving, setIsSaving] = useState(false)

    const handleAddSubtask = () => {
        setSubtasks([...subtasks, { id: crypto.randomUUID(), title: '', completed: false }])
    }

    const updateSubtaskTitle = (id: string, newTitle: string) => {
        setSubtasks(subtasks.map(s => s.id === id ? { ...s, title: newTitle } : s))
    }

    const removeSubtask = (id: string) => {
        setSubtasks(subtasks.filter(s => s.id !== id))
    }

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Title is required')
            return
        }

        setIsSaving(true)
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
        const finalFreq = isRecurring ? (recurringFreq === 'Custom' ? customFreq : recurringFreq) : null

        const updates: Partial<Task> = {
            title: title.trim(),
            description: description.trim() || null,
            priority,
            due_date: dueDate || null,
            time_estimate: timeEstimate || null,
            tags,
            is_recurring: isRecurring,
            recurring_frequency: finalFreq as any,
            notes: notes.trim() || null,
            subtasks,
            updated_at: new Date().toISOString()
        }

        try {
            const { error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', task.id)

            if (error) throw error

            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates } : t))
            toast.success('Task updated successfully')
            onClose()
        } catch (error: any) {
            toast.error('Failed to update task: ' + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Title *</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Add more detail about this task..."
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="High">🔴 High</SelectItem>
                                    <SelectItem value="Medium">🟡 Medium</SelectItem>
                                    <SelectItem value="Low">🟢 Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Due Date</Label>
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Time Estimate</Label>
                            <Input value={timeEstimate} onChange={e => setTimeEstimate(e.target.value)} placeholder="e.g. 2h, 30min" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tags (Comma separated)</Label>
                            <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="Work, Personal, Health" />
                        </div>
                    </div>

                    <div className="p-4 border rounded-xl bg-secondary/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 cursor-pointer">
                                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                                Recurring Task
                            </Label>
                        </div>

                        {isRecurring && (
                            <div className="flex items-center gap-3">
                                <Select value={recurringFreq === 'Daily' || recurringFreq === 'Weekly' ? recurringFreq : 'Custom'} onValueChange={(v: any) => setRecurringFreq(v)}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Daily">Daily</SelectItem>
                                        <SelectItem value="Weekly">Weekly</SelectItem>
                                        <SelectItem value="Custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                                {recurringFreq === 'Custom' && (
                                    <Input
                                        value={customFreq}
                                        onChange={e => setCustomFreq(e.target.value)}
                                        placeholder="e.g. Every 3 days"
                                        className="flex-1"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label>Subtasks</Label>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddSubtask} className="h-7 text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Add Subtask
                            </Button>
                        </div>
                        {subtasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No subtasks added.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {subtasks.map(sub => (
                                    <div key={sub.id} className="flex items-center gap-2">
                                        <Input
                                            value={sub.title}
                                            onChange={e => updateSubtaskTitle(sub.id, e.target.value)}
                                            placeholder="Subtask title"
                                            className="h-8 text-sm"
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeSubtask(sub.id)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Additional context or links..."
                            className="resize-none"
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter className="sm:justify-between items-center mt-4 pt-4 border-t">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
