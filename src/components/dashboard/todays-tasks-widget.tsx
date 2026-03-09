'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task } from '@/types/tasks'
import { CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { isPast, parseISO } from 'date-fns'

interface Props {
    userId: string
    className?: string
}

export function TodaysTasksWidget({ userId, className = '' }: Props) {
    const supabase = createClient()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTodayTasks()

        // Setup realtime subscription to keep Dashboard and Tracker in sync natively
        const channel = supabase.channel('today-tasks')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tasks',
                filter: `user_id=eq.${userId}`
            }, () => {
                fetchTodayTasks() // Re-fetch on any task change
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [userId])

    const fetchTodayTasks = async () => {
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .in('column_id', ['Today', 'Done'])

        if (data) {
            // Only show tasks that are IN 'Today' OR were completed TODAY.
            const todayTasks = data.filter(t => {
                if (t.column_id === 'Today') return true
                if (t.column_id === 'Done' && t.completed_at) {
                    return new Date(t.completed_at).toDateString() === new Date().toDateString()
                }
                return false
            })

            // Sort: Incomplete first, then by priority High -> Low
            const priorityScore: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 }
            todayTasks.sort((a, b) => {
                if (a.column_id === 'Done' && b.column_id !== 'Done') return 1
                if (a.column_id !== 'Done' && b.column_id === 'Done') return -1
                return priorityScore[b.priority] - priorityScore[a.priority]
            })

            setTasks(todayTasks)
        }
        setLoading(false)
    }

    const toggleTaskCompletion = async (task: Task) => {
        const isCurrentlyDone = task.column_id === 'Done'
        const newColumn = isCurrentlyDone ? 'Today' : 'Done'
        const completedAt = isCurrentlyDone ? null : new Date().toISOString()

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === task.id ? { ...t, column_id: newColumn, completed_at: completedAt } : t
        ))

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ column_id: newColumn, completed_at: completedAt, updated_at: new Date().toISOString() })
                .eq('id', task.id)

            if (error) throw error
        } catch (error: any) {
            toast.error("Failed to update task: " + error.message)
            fetchTodayTasks() // Revert on failure
        }
    }

    const completedCount = tasks.filter(t => t.column_id === 'Done').length
    const totalCount = tasks.length
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    const priorityColors: Record<string, string> = {
        'High': 'bg-red-500/10 text-red-500 border-red-500/20',
        'Medium': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20',
        'Low': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20',
    }

    return (
        <div className={`flex flex-col h-full bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden ${className}`}>

            {/* Header */}
            <div className="flex items-center justify-between p-4 lg:p-5 border-b border-border/50">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Today's Tasks</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Synced live from Kanban board</p>
                </div>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-foreground" asChild>
                    <Link href="/dashboard/calendar">
                        Open Kanban <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                </Button>
            </div>

            {/* Progress Bar */}
            <div className="px-4 lg:px-5 py-3 border-b border-border/50 bg-muted/20">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground">{completedCount} / {totalCount} Done</span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">Loading tasks...</div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mb-2" />
                        <p className="text-sm font-medium text-foreground">Nothing scheduled for today!</p>
                        <p className="text-xs text-muted-foreground mt-1">Add tasks in the Kanban board to see them here.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {tasks.map(task => {
                            const isDone = task.column_id === 'Done'
                            const isOverdue = task.due_date ? isPast(parseISO(task.due_date)) && !isDone : false

                            return (
                                <div
                                    key={task.id}
                                    className={`
                                        flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors group cursor-pointer
                                        ${isDone ? 'opacity-60' : ''}
                                    `}
                                    onClick={() => toggleTaskCompletion(task)}
                                >
                                    {/* Checkbox */}
                                    <button
                                        className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors focus:outline-none"
                                        onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task); }}
                                    >
                                        {isDone ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <Circle className="w-5 h-5" />
                                        )}
                                    </button>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                            {task.title}
                                        </p>

                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider border ${priorityColors[task.priority]}`}>
                                                {task.priority}
                                            </span>

                                            {task.time_estimate && (
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    {task.time_estimate}
                                                </div>
                                            )}

                                            {isOverdue && (
                                                <span className="text-[10px] font-semibold text-red-500">
                                                    ⚠️ Overdue
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
