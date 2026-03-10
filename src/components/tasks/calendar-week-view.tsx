'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Task } from '@/types/tasks'
import { TaskModal } from './task-modal'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, addMinutes, differenceInMinutes, startOfDay } from 'date-fns'

interface Props {
    currentDate: Date
    currentTime: Date
    tasks: Task[]
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>
    userId: string
}

export function CalendarWeekView({ currentDate, currentTime, tasks, setTasks, userId }: Props) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Drag-to-create State
    const [dragStart, setDragStart] = useState<{ day: Date, time: string } | null>(null)
    const [dragCurrent, setDragCurrent] = useState<{ day: Date, time: string } | null>(null)

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 })
        const end = endOfWeek(currentDate, { weekStartsOn: 1 })
        return eachDayOfInterval({ start, end })
    }, [currentDate])

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
            const period = i < 12 ? 'AM' : 'PM'
            const hour12 = i % 12 === 0 ? 12 : i % 12
            slots.push(`${hour12} ${period}`)
        }
        return slots
    }, [])

    const getTaskStyle = (task: Task) => {
        // Default to 1 hour at 9 AM if no time is set
        const startTimeStr = task.start_time || '09:00:00'
        const endTimeStr = task.end_time || '10:00:00'

        const [sH, sM] = startTimeStr.split(':').map(Number)
        const [eH, eM] = endTimeStr.split(':').map(Number)

        const startMinutes = (sH * 60) + sM
        let endMinutes = (eH * 60) + eM
        if (endMinutes <= startMinutes) endMinutes = startMinutes + 60 // Minimum 1 hour block for invalid cases

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
        return Math.floor(y / 0.8) // Convert px back to minutes (0.8px = 1 min)
    }

    const formatMinutesToTime = (totalMinutes: number) => {
        const h = Math.floor(totalMinutes / 60)
        const m = Math.floor((totalMinutes % 60) / 15) * 15 // Snap to 15 min increments
        return `${Math.min(h, 23).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
        const mins = getMinutesFromTop(e)
        const time = formatMinutesToTime(mins)
        setDragStart({ day, time })
        setDragCurrent({ day, time })
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
        if (!dragStart) return
        if (!isSameDay(dragStart.day, day)) return // Only drag within same day
        const mins = getMinutesFromTop(e)
        const time = formatMinutesToTime(mins)
        setDragCurrent({ day, time })
    }

    const handleMouseUp = () => {
        if (!dragStart || !dragCurrent) return

        let startT = dragStart.time
        let endT = dragCurrent.time

        // Correct inversion if dragged upwards
        if (dragCurrent.time < dragStart.time) {
            startT = dragCurrent.time
            endT = dragStart.time
        }

        // Ensure at least 30 min duration
        if (startT === endT) {
            const [h, m] = startT.split(':').map(Number)
            const endMins = (h * 60) + m + 30
            endT = formatMinutesToTime(endMins)
        }

        const newTask: Task = {
            id: crypto.randomUUID(),
            user_id: userId,
            title: '',
            description: null,
            priority: 'Medium',
            due_date: format(dragStart.day, 'yyyy-MM-dd') + 'T00:00:00.000Z',
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

    // Get Drag Ghost Style
    const getDragGhostStyle = (day: Date) => {
        if (!dragStart || !dragCurrent || !isSameDay(dragStart.day, day)) return null

        let startT = dragStart.time
        let endT = dragCurrent.time
        if (dragCurrent.time < dragStart.time) {
            startT = dragCurrent.time
            endT = dragStart.time
        }
        if (startT === endT) {
            const [h, m] = startT.split(':').map(Number)
            endT = formatMinutesToTime((h * 60) + m + 30) // Minimum 30 visual representation during drag
        }

        const [sH, sM] = startT.split(':').map(Number)
        const [eH, eM] = endT.split(':').map(Number)
        const startMinutes = (sH * 60) + sM
        const endMinutes = (eH * 60) + eM

        const top = startMinutes * 0.8
        const height = (endMinutes - startMinutes) * 0.8
        return { top: `${top}px`, height: `${height}px` }
    }

    return (
        <div className="flex flex-col h-full bg-card" onMouseUp={handleMouseUp} onMouseLeave={() => setDragStart(null)}>

            {/* Days Header */}
            <div className="flex border-b border-border/50 bg-muted/30 shrink-0 pl-14">
                {weekDays.map(day => {
                    const isToday = isSameDay(day, new Date())
                    return (
                        <div key={day.toString()} className={`flex-1 py-2 text-center border-l border-border/50 flex flex-col items-center justify-center gap-0.5 ${isToday ? 'bg-primary/5' : ''}`}>
                            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                                {format(day, 'EEE')}
                            </span>
                            <span className={`text-lg font-medium w-8 h-8 flex items-center justify-center rounded-full
                                ${isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'}
                            `}>
                                {format(day, 'd')}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Timetable Grid */}
            <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
                <div className="flex relative min-h-[1152px]"> {/* 24h * 48px = 1152px */}

                    {/* Time Axis */}
                    <div className="w-14 shrink-0 border-r border-border/50 bg-card relative z-10">
                        {timeSlots.map((time, i) => (
                            <div key={time} className="absolute w-full pr-2 text-right text-[10px] font-medium text-muted-foreground" style={{ top: `${(i * 48) - 6}px` }}>
                                {time}
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    {weekDays.map((day, dayIndex) => {
                        const dateKey = format(day, 'yyyy-MM-dd')
                        const isToday = isSameDay(day, new Date())
                        const dayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(dateKey))

                        // Current time red line math
                        const currentMins = (currentTime.getHours() * 60) + currentTime.getMinutes()
                        const redLineTop = currentMins * 0.8

                        return (
                            <div
                                key={day.toString()}
                                className={`flex-1 border-r border-border/50 relative group ${isToday ? 'bg-primary/5' : ''}`}
                                onMouseDown={(e) => handleMouseDown(e, day)}
                                onMouseMove={(e) => handleMouseMove(e, day)}
                            >
                                {/* Horizontal Grid Lines (every 1 hour solid, every 30 min dashed) */}
                                {timeSlots.map((_, i) => (
                                    <React.Fragment key={i}>
                                        <div className="absolute w-full border-t border-border/50" style={{ top: `${i * 48}px` }} />
                                        <div className="absolute w-full border-t border-border/30 border-dashed" style={{ top: `${(i * 48) + 24}px` }} />
                                    </React.Fragment>
                                ))}

                                {/* Realtime Red Line */}
                                {isToday && (
                                    <>
                                        <div className="absolute w-full border-t-2 border-red-500 z-20" style={{ top: `${redLineTop}px` }} />
                                        {/* Little dot on the left axis ONLY for the first column just as UI flair, though standard practice puts it across all or just left */}
                                        {dayIndex === new Date().getDay() - 1 && (
                                            <div className="absolute w-2 h-2 rounded-full bg-red-500 z-20 -left-[5px]" style={{ top: `${redLineTop - 3}px` }} />
                                        )}
                                    </>
                                )}

                                {/* Hover / Drag Overlay */}
                                {getDragGhostStyle(day) && (
                                    <div
                                        className="absolute w-[calc(100%-8px)] left-[4px] bg-primary/20 border border-primary/50 rounded-md z-30 pointer-events-none"
                                        style={getDragGhostStyle(day) as React.CSSProperties}
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
                                            style={{ ...style, width: 'calc(100% - 8px)', left: '4px' }}
                                            className={`
                                                absolute rounded-md px-2 py-1 overflow-hidden cursor-pointer border hover:opacity-90 shadow-sm z-10 transition-all
                                                ${isDone ? priorityColorsMuted[task.priority] + ' line-through' : priorityColors[task.priority]}
                                            `}
                                        >
                                            <div className="text-xs font-semibold truncate">{task.title}</div>
                                            {!isDone && task.start_time && task.end_time && (
                                                <div className="text-[10px] opacity-80 font-medium mt-0.5">
                                                    {task.start_time.substring(0, 5)} - {task.end_time.substring(0, 5)}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}

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
