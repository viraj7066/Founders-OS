'use client'

import React, { useMemo, useState } from 'react'
import { Task } from '@/types/tasks'
import { TaskModal } from './task-modal'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, format, parseISO } from 'date-fns'

interface Props {
    currentDate: Date
    tasks: Task[]
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>
    userId: string
}

export function CalendarMonthView({ currentDate, tasks, setTasks, userId }: Props) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Generate calendar grid days
    const days = useMemo(() => {
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
        return eachDayOfInterval({ start: startDate, end: endDate })
    }, [currentDate])

    // Group tasks by date string (YYYY-MM-DD)
    const maxVisibleTasks = 3
    const tasksByDate = useMemo(() => {
        const map: Record<string, Task[]> = {}
        tasks.forEach(task => {
            if (task.due_date) {
                const dateKey = task.due_date.split('T')[0]
                if (!map[dateKey]) map[dateKey] = []
                map[dateKey].push(task)
            }
        })

        // Sort tasks within each day (Incomplete first > Priority)
        const priorityScore: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 }
        Object.keys(map).forEach(key => {
            map[key].sort((a, b) => {
                const aDone = a.column_id === 'Done' ? 1 : 0
                const bDone = b.column_id === 'Done' ? 1 : 0
                if (aDone !== bDone) return aDone - bDone
                return priorityScore[b.priority] - priorityScore[a.priority]
            })
        })
        return map
    }, [tasks])

    const handleDayClick = (date: Date) => {
        // Prepare a blank task pre-filled with this date
        const newTask: Task = {
            id: crypto.randomUUID(),
            user_id: userId,
            title: '',
            description: null,
            priority: 'Medium',
            due_date: format(date, 'yyyy-MM-dd'),
            start_time: null,
            end_time: null,
            tags: [],
            subtasks: [],
            time_estimate: null,
            is_recurring: false,
            recurring_frequency: null,
            notes: null,
            column_id: 'Today', // Will be overridden by sync logic if date != today
            completed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
        setSelectedTask(newTask)
        setIsModalOpen(true)
    }

    const handleTaskClick = (e: React.MouseEvent, task: Task) => {
        e.stopPropagation()
        setSelectedTask(task)
        setIsModalOpen(true)
    }

    const priorityColors: Record<string, string> = {
        'High': 'bg-red-500 text-white',
        'Medium': 'bg-yellow-500 text-white',
        'Low': 'bg-emerald-500 text-white',
    }

    const priorityColorsMuted: Record<string, string> = {
        'High': 'bg-red-500/20 text-red-500',
        'Medium': 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-500',
        'Low': 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-500',
    }

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30 shrink-0">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-hidden">
                {days.map((day, idx) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const dayTasks = tasksByDate[dateKey] || []
                    const isCurrentMonth = isSameMonth(day, currentDate)
                    const isToday = isSameDay(day, new Date())

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => handleDayClick(day)}
                            className={`
                                min-h-0 border-r border-b border-border/50 p-1 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-muted/30
                                ${!isCurrentMonth ? 'bg-muted/10 opacity-60' : ''}
                                ${isToday ? 'bg-primary/5' : ''}
                                ${idx % 7 === 6 ? 'border-r-0' : ''}
                            `}
                        >
                            <div className="flex items-center justify-between px-1 shrink-0">
                                <span className={`text-[11px] font-medium w-6 h-6 flex items-center justify-center rounded-full
                                    ${isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}
                                `}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-col gap-1 px-0.5">
                                {dayTasks.slice(0, maxVisibleTasks).map(task => {
                                    const isDone = task.column_id === 'Done'
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={(e) => handleTaskClick(e, task)}
                                            className={`
                                                relative w-full px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity
                                                ${isDone ? priorityColorsMuted[task.priority] + ' line-through opacity-70 border border-border/50' : priorityColors[task.priority]}
                                            `}
                                        >
                                            {task.title}
                                        </div>
                                    )
                                })}

                                {dayTasks.length > maxVisibleTasks && (
                                    <div className="text-[10px] text-muted-foreground font-medium pl-1 hover:text-foreground">
                                        + {dayTasks.length - maxVisibleTasks} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {isModalOpen && selectedTask && (
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    task={selectedTask}
                    userId={userId}
                    setTasks={setTasks}
                />
            )}
        </div>
    )
}
