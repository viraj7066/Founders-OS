'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Task } from '@/types/tasks'
import { TaskModal } from './task-modal'
import { format, isSameDay } from 'date-fns'

interface Props {
    currentDate: Date
    currentTime: Date
    tasks: Task[]
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>
    userId: string
}

export function CalendarDayView({ currentDate, currentTime, tasks, setTasks, userId }: Props) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Drag-to-create State
    const [dragStart, setDragStart] = useState<string | null>(null)
    const [dragCurrent, setDragCurrent] = useState<string | null>(null)

    // Auto-scroll to current time on mount
    useEffect(() => {
        if (scrollContainerRef.current) {
            const currentHour = currentTime.getHours()
            const scrollPixels = (currentHour * 48) - 100 // 48px per hour, offset
            scrollContainerRef.current.scrollTo({ top: Math.max(0, scrollPixels), behavior: 'smooth' })
        }
    }, [])

    const timeSlots = useMemo(() => {
        const slots = []
        for (let i = 0; i < 24; i++) {
            slots.push(`${i.toString().padStart(2, '0')}:00`)
        }
        return slots
    }, [])

    const dayTasks = useMemo(() => {
        const dateKey = format(currentDate, 'yyyy-MM-dd')
        return tasks.filter(t => t.due_date && t.due_date.startsWith(dateKey))
    }, [tasks, currentDate])

    const getTaskStyle = (task: Task) => {
        const startTimeStr = task.start_time || '09:00:00'
        const endTimeStr = task.end_time || '10:00:00'

        const [sH, sM] = startTimeStr.split(':').map(Number)
        const [eH, eM] = endTimeStr.split(':').map(Number)

        const startMinutes = (sH * 60) + sM
        let endMinutes = (eH * 60) + eM
        if (endMinutes <= startMinutes) endMinutes = startMinutes + 60

        // 48px per hour -> 0.8px per minute
        const top = startMinutes * 0.8
        const height = (endMinutes - startMinutes) * 0.8

        return { top: `${top}px`, height: `${height}px` }
    }

    const priorityColors: Record<string, string> = {
        'High': 'bg-red-500 text-white border-red-600',
        'Medium': 'bg-yellow-500 text-white border-yellow-600',
        'Low': 'bg-emerald-500 text-white border-emerald-600',
    }

    const priorityColorsMuted: Record<string, string> = {
        'High': 'bg-red-500/20 text-red-500 border-red-500/30',
        'Medium': 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border-yellow-500/30',
        'Low': 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 border-emerald-500/30',
    }

    const handleTaskClick = (e: React.MouseEvent, task: Task) => {
        e.stopPropagation()
        setSelectedTask(task)
        setIsModalOpen(true)
    }

    // -- Drag to Create Logic --
    const getMinutesFromTop = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const y = e.clientY - rect.top
        return Math.floor(y / 0.8)
    }

    const formatMinutesToTime = (totalMinutes: number) => {
        const h = Math.floor(totalMinutes / 60)
        const m = Math.floor((totalMinutes % 60) / 15) * 15 // Snap to 15 min increments
        return `${Math.min(h, 23).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const mins = getMinutesFromTop(e)
        const time = formatMinutesToTime(mins)
        setDragStart(time)
        setDragCurrent(time)
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragStart) return
        const mins = getMinutesFromTop(e)
        const time = formatMinutesToTime(mins)
        setDragCurrent(time)
    }

    const handleMouseUp = () => {
        if (!dragStart || !dragCurrent) return

        let startT = dragStart
        let endT = dragCurrent

        if (dragCurrent < dragStart) {
            startT = dragCurrent
            endT = dragStart
        }

        if (startT === endT) {
            const [h, m] = startT.split(':').map(Number)
            endT = formatMinutesToTime((h * 60) + m + 30)
        }

        const newTask: Task = {
            id: crypto.randomUUID(),
            user_id: userId,
            title: '',
            description: null,
            priority: 'Medium',
            due_date: format(currentDate, 'yyyy-MM-dd') + 'T00:00:00.000Z',
            start_time: startT,
            end_time: endT,
            tags: [],
            subtasks: [],
            time_estimate: null,
            is_recurring: false,
            recurring_frequency: null,
            notes: null,
            column_id: 'Today',
            completed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        setSelectedTask(newTask)
        setIsModalOpen(true)
        setDragStart(null)
        setDragCurrent(null)
    }

    const getDragGhostStyle = () => {
        if (!dragStart || !dragCurrent) return null

        let startT = dragStart
        let endT = dragCurrent
        if (dragCurrent < dragStart) {
            startT = dragCurrent
            endT = dragStart
        }
        if (startT === endT) {
            const [h, m] = startT.split(':').map(Number)
            endT = formatMinutesToTime((h * 60) + m + 30)
        }

        const [sH, sM] = startT.split(':').map(Number)
        const [eH, eM] = endT.split(':').map(Number)
        const startMinutes = (sH * 60) + sM
        const endMinutes = (eH * 60) + eM

        const top = startMinutes * 0.8
        const height = (endMinutes - startMinutes) * 0.8
        return { top: `${top}px`, height: `${height}px` }
    }

    const isToday = isSameDay(currentDate, new Date())
    const currentMins = (currentTime.getHours() * 60) + currentTime.getMinutes()
    const redLineTop = currentMins * 0.8

    return (
        <div className="flex flex-col h-full bg-card" onMouseUp={handleMouseUp} onMouseLeave={() => setDragStart(null)}>

            {/* Header / Top gap for alignment */}
            <div className="h-8 border-b border-border/50 bg-muted/30 shrink-0" />

            {/* Timetable Grid */}
            <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
                <div className="flex relative min-h-[1152px]"> {/* 24h * 48px = 1152px */}

                    {/* Time Axis */}
                    <div className="w-16 shrink-0 border-r border-border/50 bg-card relative z-10">
                        {timeSlots.map((time, i) => (
                            <div key={time} className="absolute w-full pr-3 text-right text-[11px] font-medium text-muted-foreground" style={{ top: `${(i * 48) - 8}px` }}>
                                {time}
                            </div>
                        ))}
                    </div>

                    {/* Single Day Column */}
                    <div
                        className={`flex-1 relative group ${isToday ? 'bg-primary/5' : ''}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                    >
                        {/* Horizontal Grid Lines */}
                        {timeSlots.map((_, i) => (
                            <React.Fragment key={i}>
                                <div className="absolute w-full border-t border-border/50" style={{ top: `${i * 48}px` }} />
                                <div className="absolute w-full border-t border-border/30 border-dashed" style={{ top: `${(i * 48) + 24}px` }} />
                            </React.Fragment>
                        ))}

                        {/* Realtime Red Line */}
                        {isToday && (
                            <>
                                <div className="absolute w-full border-t-2 border-red-500 z-20 shadow-sm" style={{ top: `${redLineTop}px` }} />
                                <div className="absolute w-2.5 h-2.5 rounded-full bg-red-500 z-20 -left-[6px] shadow-sm" style={{ top: `${redLineTop - 4}px` }} />
                            </>
                        )}

                        {/* Hover / Drag Overlay */}
                        {getDragGhostStyle() && (
                            <div
                                className="absolute w-[calc(100%-16px)] left-[8px] bg-primary/20 border border-primary/50 rounded-lg z-30 pointer-events-none"
                                style={getDragGhostStyle() as React.CSSProperties}
                            />
                        )}

                        {/* Plotted Tasks */}
                        {dayTasks.map(task => {
                            const style = getTaskStyle(task)
                            const isDone = task.column_id === 'Done'
                            return (
                                <div
                                    key={task.id}
                                    onClick={(e) => handleTaskClick(e, task)}
                                    style={{ ...style, width: 'calc(100% - 16px)', left: '8px' }}
                                    className={`
                                        absolute rounded-lg px-3 py-1.5 overflow-hidden cursor-pointer border hover:opacity-90 shadow-sm z-10 transition-all
                                        ${isDone ? priorityColorsMuted[task.priority] + ' line-through' : priorityColors[task.priority]}
                                    `}
                                >
                                    <div className="text-sm font-semibold truncate">{task.title}</div>
                                    <div className="text-xs opacity-80 font-medium mt-0.5">
                                        {task.start_time?.substring(0, 5) || '09:00'} - {task.end_time?.substring(0, 5) || '10:00'}
                                    </div>
                                    {task.description && (
                                        <div className="text-xs mt-1 truncate opacity-70 border-t border-white/20 pt-1">
                                            {task.description}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                </div>
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
