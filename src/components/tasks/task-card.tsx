'use client'

import React from 'react'
import { Task } from '@/types/tasks'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, Clock, Repeat, CheckSquare, Edit3, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { getTodayString, parseLocalDate } from '@/lib/utils/task-date'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { TaskModal } from './task-modal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
    task: Task
    isOverlay?: boolean
    setTasks?: React.Dispatch<React.SetStateAction<Task[]>>
    userId?: string
}

export function TaskCard({ task, isOverlay = false, setTasks, userId }: Props) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: task
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
    }

    const priorityColors = {
        'High': 'bg-red-500/10 text-red-500 border-red-500/20',
        'Medium': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20',
        'Low': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20',
    }

    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [showSubtasks, setShowSubtasks] = React.useState(false)
    const supabase = createClient()

    const isOverdue = task.due_date ? task.due_date < getTodayString() && task.column_id !== 'Done' : false
    const isCompleted = task.column_id === 'Done'

    const handleCheck = async (checked: boolean) => {
        if (!setTasks || !userId) return

        const newColumn = checked ? 'Done' : 'Today'
        const completedAt = checked ? new Date().toISOString() : null

        // Optimistic UI
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, column_id: newColumn, completed_at: completedAt } : t))

        const { error } = await supabase
            .from('tasks')
            .update({ column_id: newColumn, completed_at: completedAt })
            .eq('id', task.id)

        if (error) {
            toast.error('Failed to update task status')
            // Revert on error
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, column_id: task.column_id, completed_at: task.completed_at } : t))
        }
    }

    const handleDelete = async () => {
        if (!setTasks) return
        if (!confirm('Are you sure you want to delete this task?')) return

        setTasks(prev => prev.filter(t => t.id !== task.id))
        const { error } = await supabase.from('tasks').delete().eq('id', task.id)
        if (error) toast.error('Failed to delete task')
    }

    const handleSubtaskCheck = async (subId: string, checked: boolean) => {
        if (!setTasks) return
        const newSubtasks = task.subtasks.map(s => s.id === subId ? { ...s, completed: checked } : s)

        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, subtasks: newSubtasks } : t))
        const { error } = await supabase.from('tasks').update({ subtasks: newSubtasks }).eq('id', task.id)
        if (error) toast.error('Failed to update subtask')
    }

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={`
                group relative flex flex-col gap-2 p-3 bg-card border rounded-xl shadow-sm text-left
                hover:shadow-md hover:border-primary/30 transition-shadow cursor-grab active:cursor-grabbing
                ${isOverlay ? 'shadow-xl scale-105 rotate-2 z-50' : ''}
            `}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                        {!isOverlay && setTasks && (
                            <div onPointerDown={e => e.stopPropagation()}>
                                <Checkbox
                                    checked={isCompleted}
                                    onCheckedChange={handleCheck}
                                    className={`mt-0.5 ${isCompleted ? 'data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground' : ''}`}
                                />
                            </div>
                        )}
                        <h4 className={`font-medium text-sm line-clamp-2 leading-tight flex-1 ${isCompleted ? 'text-muted-foreground line-through opacity-70' : 'text-foreground'}`}>
                            {task.title}
                        </h4>
                    </div>

                    {!isOverlay && setTasks && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onPointerDown={e => e.stopPropagation()}>
                            <button onClick={() => setIsEditOpen(true)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
                                <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={handleDelete} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                <div className={`flex flex-wrap items-center gap-2 mt-1 ${isCompleted ? 'opacity-50' : ''}`}>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${priorityColors[task.priority]}`}>
                        {task.priority}
                    </span>

                    {isOverdue && (
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/20">
                            <span>⚠️ Overdue</span>
                        </div>
                    )}

                    {task.due_date && (
                        <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border 
                        ${isOverdue ? 'bg-red-500/5 text-red-500/80 border-red-500/10' : 'bg-secondary text-muted-foreground border-border/50'}
                    `}>
                            <Calendar className="w-3 h-3" />
                            <span suppressHydrationWarning>{isOverdue ? '⚠️ Overdue' : `Due: ${format(parseLocalDate(task.due_date), 'MMM d')}`}</span>
                        </div>
                    )}

                    {task.time_estimate && (
                        <div className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border bg-secondary text-muted-foreground border-border/50">
                            <Clock className="w-3 h-3" />
                            <span>{task.time_estimate}</span>
                        </div>
                    )}

                    {task.is_recurring && (
                        <div className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border bg-blue-500/10 text-blue-500 border-blue-500/20">
                            <Repeat className="w-3 h-3" />
                            <span>{task.recurring_frequency}</span>
                        </div>
                    )}

                    {task.subtasks.length > 0 && (
                        <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() => setShowSubtasks(!showSubtasks)}
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border bg-secondary text-muted-foreground border-border/50 hover:bg-secondary/70 transition-colors"
                        >
                            <CheckSquare className="w-3 h-3" />
                            <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks</span>
                            {showSubtasks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    )}
                </div>

                {task.tags.length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isCompleted ? 'opacity-50' : ''}`}>
                        {task.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {!isOverlay && showSubtasks && task.subtasks.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5 pt-2 border-t border-border/50" onPointerDown={e => e.stopPropagation()}>
                        {task.subtasks.map(sub => (
                            <div key={sub.id} className="flex items-start gap-2">
                                <Checkbox
                                    id={`sub-${sub.id}`}
                                    checked={sub.completed}
                                    onCheckedChange={(c) => handleSubtaskCheck(sub.id, c === true)}
                                    className="mt-0.5 h-3.5 w-3.5"
                                />
                                <label htmlFor={`sub-${sub.id}`} className={`text-xs ${sub.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                    {sub.title}
                                </label>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {setTasks && userId && (
                <TaskModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} task={task} setTasks={setTasks} userId={userId} />
            )}
        </>
    )
}
