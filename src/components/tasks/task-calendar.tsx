'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskStats, TaskColumn as ColumnType } from '@/types/tasks'
import { format } from 'date-fns'
import { parseLocalDate, getTodayString, getTomorrowString } from '@/lib/utils/task-date'
import { toast } from 'sonner'
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { TaskColumn } from './task-column'
import { TaskCard } from './task-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Flame, Target, CheckCircle2 } from 'lucide-react'

const COLUMNS: ColumnType[] = ['Backlog', 'This Week', 'Today', 'In Progress', 'Tomorrow', 'Done']

interface Props {
    userId: string
    initialTasks: Task[]
    initialStats: TaskStats | null
}

export function TaskCalendar({ userId, initialTasks, initialStats }: Props) {
    const supabase = createClient()
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [stats, setStats] = useState<TaskStats | null>(initialStats)

    // UI State
    const [searchQuery, setSearchQuery] = useState('')
    const [focusMode, setFocusMode] = useState(false)
    const [activeTask, setActiveTask] = useState<Task | null>(null)

    // Handle Recurring Tasks Regeneration & Realtime Sync
    useEffect(() => {
        const checkRecurringTasks = async () => {
            const now = new Date();
            const completedRecurring = tasks.filter(t => t.is_recurring && t.column_id === 'Done' && t.completed_at);

            const tasksToDuplicate: Task[] = [];

            for (const task of completedRecurring) {
                const completedDate = new Date(task.completed_at!);
                let shouldRegenerate = false;

                if (task.recurring_frequency === 'Daily') {
                    if (completedDate.toDateString() !== now.toDateString()) shouldRegenerate = true;
                } else if (task.recurring_frequency === 'Weekly') {
                    const diffTime = Math.abs(now.getTime() - completedDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays >= 7) shouldRegenerate = true;
                } else {
                    if (completedDate.toDateString() !== now.toDateString()) shouldRegenerate = true;
                }

                if (shouldRegenerate) tasksToDuplicate.push(task);
            }

            if (tasksToDuplicate.length === 0) return;

            // Generate new tasks
            const newTasks = tasksToDuplicate.map(oldTask => {
                const { id, created_at, updated_at, completed_at, ...rest } = oldTask;
                return {
                    ...rest,
                    column_id: 'Today' as ColumnType,
                    completed_at: null,
                    subtasks: oldTask.subtasks.map(s => ({ ...s, id: crypto.randomUUID(), completed: false }))
                };
            });

            try {
                const { data: inserted, error: insertError } = await supabase.from('tasks').insert(newTasks).select();
                if (insertError) throw insertError;

                // Mark old tasks as non-recurring to prevent infinite duplication
                const oldTaskIds = tasksToDuplicate.map(t => t.id);
                const { error: updateError } = await supabase.from('tasks').update({ is_recurring: false }).in('id', oldTaskIds);
                if (updateError) throw updateError;

                setTasks(prev => {
                    const modified = prev.map(t => oldTaskIds.includes(t.id) ? { ...t, is_recurring: false } : t);
                    return [...modified, ...(inserted as Task[])];
                });

                toast.success(`Regenerated ${inserted?.length || 0} recurring task(s)`);
            } catch (error) {
                console.error("Failed to regenerate recurring tasks", error);
            }
        };

        checkRecurringTasks();

        // Setup realtime subscription to keep board in sync with TodaysTasksWidget
        const channel = supabase.channel('kanban-tasks-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, async () => {
                const { data } = await supabase.from('tasks').select('*').eq('user_id', userId);
                if (data) setTasks(data as Task[]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); }
    }, [userId]); // Intentionally omitting inner deps so this only runs heavily on mount

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // Filter tasks based on search
    const filteredTasks = useMemo(() => {
        let filtered = tasks
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = tasks.filter(t =>
                t.title.toLowerCase().includes(query) ||
                t.tags.some(tag => tag.toLowerCase().includes(query))
            )
        }
        return filtered
    }, [tasks, searchQuery])

    // Group tasks by column
    const tasksByColumn = useMemo(() => {
        const grouped: Record<ColumnType, Task[]> = {
            'Backlog': [],
            'This Week': [],
            'Today': [],
            'In Progress': [],
            'Tomorrow': [],
            'Done': []
        }

        filteredTasks.forEach(task => {
            if (grouped[task.column_id]) {
                grouped[task.column_id].push(task)
            }
        })

        // Sort each column by priority: High -> Medium -> Low
        const priorityScore = { 'High': 3, 'Medium': 2, 'Low': 1 }
        Object.keys(grouped).forEach(col => {
            grouped[col as ColumnType].sort((a, b) => priorityScore[b.priority] - priorityScore[a.priority])
        })

        return grouped
    }, [filteredTasks])

    const todayTasksCount = tasksByColumn['Today'].length
    const todayDoneCount = tasksByColumn['Done'].filter(t => t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()).length

    // Derived columns based on Focus Mode
    const visibleColumns = focusMode ? ['Today', 'In Progress'] as ColumnType[] : COLUMNS

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const task = tasks.find(t => t.id === active.id)
        if (task) setActiveTask(task)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveTask(null)
        const { active, over } = event

        if (!over) return

        const taskId = active.id as string
        const toColumn = over.id as ColumnType

        const task = tasks.find(t => t.id === taskId)
        if (!task || task.column_id === toColumn) return

        // Optimistic UI update
        const previousColumn = task.column_id
        const isDone = toColumn === 'Done'
        const completedAt = isDone ? new Date().toISOString() : null

        let newDueDate = task.due_date || null
        const now = new Date()

        if (toColumn === 'Today') {
            newDueDate = format(now, 'yyyy-MM-dd')
        } else if (toColumn === 'Tomorrow') {
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            newDueDate = format(tomorrow, 'yyyy-MM-dd')
        } else if (toColumn === 'This Week') {
            if (previousColumn === 'Today' || previousColumn === 'Tomorrow') {
                const later = new Date(now)
                later.setDate(later.getDate() + 2)
                newDueDate = format(later, 'yyyy-MM-dd')
            }
        } else if (toColumn === 'Backlog') {
            if (previousColumn === 'Today' || previousColumn === 'Tomorrow' || previousColumn === 'This Week') {
                newDueDate = null
            }
        }

        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                return { ...t, column_id: toColumn, due_date: newDueDate, completed_at: completedAt }
            }
            return t
        }))

        // Database sync
        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    column_id: toColumn,
                    due_date: newDueDate,
                    completed_at: completedAt,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId)

            if (error) throw error

            // Handle Streak Logic here if moved to Done from Today
        } catch (error: any) {
            toast.error("Failed to move task: " + error.message)
            // Revert optimistic update
            setTasks(prev => prev.map(t => {
                if (t.id === taskId) {
                    return { ...t, column_id: previousColumn, completed_at: task.completed_at }
                }
                return t
            }))
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background rounded-2xl border border-border/50 shadow-sm relative">

            {/* Header / Stats */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-600 rounded-lg">
                        <Flame className="w-4 h-4" />
                        <span className="text-sm font-semibold">{stats?.current_streak || 0} Day Streak</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Target className="w-4 h-4 text-emerald-500" />
                            <span>Today's Progress:</span>
                            <span className="font-semibold text-foreground">{todayDoneCount} / {todayTasksCount + todayDoneCount}</span>
                        </div>
                        <div className="w-32 h-2.5 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${todayTasksCount + todayDoneCount > 0 ? (todayDoneCount / (todayTasksCount + todayDoneCount)) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Filter tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64 pl-9 h-9 border-border/50 bg-background/50 focus-visible:ring-1"
                        />
                    </div>
                    <Button
                        variant={focusMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFocusMode(!focusMode)}
                        className={focusMode ? "bg-primary text-primary-foreground" : ""}
                    >
                        <Target className="w-4 h-4 mr-2" />
                        {focusMode ? "Unfocus" : "Focus Mode"}
                    </Button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-muted/20">
                <DndContext
                    id="dnd-task-calendar"
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex h-full p-4 gap-4 w-max min-w-full">
                        {visibleColumns.map(col => {
                            let displayTitle: string = col
                            if (col === 'Today') {
                                displayTitle = `Today — ${format(parseLocalDate(getTodayString()), 'MMM d')}`
                            } else if (col === 'Tomorrow') {
                                displayTitle = `Tomorrow — ${format(parseLocalDate(getTomorrowString()), 'MMM d')}`
                            } else if (col === 'This Week') {
                                const endOfWeek = new Date(parseLocalDate(getTodayString()));
                                endOfWeek.setDate(endOfWeek.getDate() + 7);
                                displayTitle = `This Week — ${format(parseLocalDate(getTodayString()), 'MMM d')}–${format(endOfWeek, 'MMM d')}`
                            }
                            return (
                                <TaskColumn
                                    key={col}
                                    id={col}
                                    title={displayTitle}
                                    tasks={tasksByColumn[col]}
                                    userId={userId}
                                    setTasks={setTasks}
                                />
                            )
                        })}
                    </div>

                    <DragOverlay>
                        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    )
}
