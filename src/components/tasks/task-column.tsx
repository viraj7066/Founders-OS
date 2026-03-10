'use client'

import React, { useState } from 'react'
import { Task, TaskColumn as ColumnType } from '@/types/tasks'
import { useDroppable } from '@dnd-kit/core'
import { TaskCard } from './task-card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
    id: ColumnType
    title: string
    tasks: Task[]
    userId: string
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>
}

export function TaskColumn({ id, title, tasks, userId, setTasks }: Props) {
    const { setNodeRef, isOver } = useDroppable({ id })
    const supabase = createClient()
    const [isAdding, setIsAdding] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium')

    const handleQuickAdd = async () => {
        if (!newTaskTitle.trim()) {
            setIsAdding(false)
            return
        }

        let newDueDate: string | null = null
        const now = new Date()

        if (id === 'Today') {
            newDueDate = now.toISOString().split('T')[0]
        } else if (id === 'Tomorrow') {
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            newDueDate = tomorrow.toISOString().split('T')[0]
        } else if (id === 'This Week') {
            const later = new Date(now)
            later.setDate(later.getDate() + 2)
            newDueDate = later.toISOString().split('T')[0]
        }

        const newTask: Partial<Task> = {
            user_id: userId,
            title: newTaskTitle.trim(),
            priority: newTaskPriority,
            column_id: id,
            due_date: newDueDate,
            tags: [],
            subtasks: [],
            is_recurring: false,
        }

        // Optimistic UI update
        const tempId = crypto.randomUUID()
        const optimisticTask = { ...newTask, id: tempId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Task
        setTasks(prev => [...prev, optimisticTask])

        setNewTaskTitle('')
        setIsAdding(false)

        try {
            const { data, error } = await supabase
                .from('tasks')
                .insert(newTask)
                .select('*')
                .single()

            if (error) throw error

            // Replace temp ID with real ID
            setTasks(prev => prev.map(t => t.id === tempId ? data : t))
        } catch (error: any) {
            toast.error("Failed to add task: " + error.message)
            setTasks(prev => prev.filter(t => t.id !== tempId))
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleQuickAdd()
        } else if (e.key === 'Escape') {
            setIsAdding(false)
            setNewTaskTitle('')
        }
    }

    // Daily Limit Warning for "Today" column
    const showLimitWarning = id === 'Today' && tasks.length > 5

    return (
        <div className="flex flex-col flex-shrink-0 w-[320px] max-h-full">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-secondary text-[10px] font-medium text-muted-foreground">
                        {tasks.length}
                    </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setIsAdding(true)}>
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            {showLimitWarning && (
                <div className="mb-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>You have {tasks.length} tasks today — consider moving some to Tomorrow.</span>
                </div>
            )}

            <div
                ref={setNodeRef}
                className={`flex-1 flex flex-col gap-3 p-2 rounded-xl border transition-colors 
                    ${isOver ? 'bg-secondary/50 border-primary/50' : 'bg-secondary/20 border-transparent'}
                    min-h-[150px] overflow-y-auto overflow-x-hidden relative`}
            >
                {/* Quick Add Form */}
                {isAdding && (
                    <div className="p-3 bg-card border rounded-lg shadow-sm flex flex-col gap-2">
                        <Input
                            autoFocus
                            placeholder="Task title..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-8 text-sm"
                        />
                        <div className="flex items-center gap-2">
                            <Select value={newTaskPriority} onValueChange={(v: any) => setNewTaskPriority(v)}>
                                <SelectTrigger className="h-7 text-xs flex-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="High" className="text-xs">🔴 High</SelectItem>
                                    <SelectItem value="Medium" className="text-xs">🟡 Medium</SelectItem>
                                    <SelectItem value="Low" className="text-xs">🟢 Low</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button size="sm" className="h-7 text-xs px-3" onClick={handleQuickAdd}>Add</Button>
                        </div>
                    </div>
                )}

                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} setTasks={setTasks} userId={userId} />
                ))}

                {!isAdding && tasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center h-full text-xs text-muted-foreground/50 border-2 border-dashed border-border/50 rounded-lg py-8">
                        Drop tasks here
                    </div>
                )}
            </div>
        </div>
    )
}
