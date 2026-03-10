'use client'

import React, { useState, useEffect } from 'react'
import { Task } from '@/types/tasks'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns'
import { CalendarMonthView } from './calendar-month-view'
import { CalendarWeekView } from './calendar-week-view'
import { CalendarDayView } from './calendar-day-view'

interface Props {
    userId: string
    initialTasks: Task[]
}

type ViewType = 'Day' | 'Week' | 'Month'

export function CalendarView({ userId, initialTasks }: Props) {
    const supabase = createClient()
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [viewType, setViewType] = useState<ViewType>('Month')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [currentTime, setCurrentTime] = useState(new Date())

    // 1. Setup Data Sync
    useEffect(() => {
        const channel = supabase.channel('calendar-tasks-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, async () => {
                const { data } = await supabase.from('tasks').select('*').eq('user_id', userId);
                if (data) setTasks(data as Task[]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); }
    }, [userId])

    // 2. Setup Real-time "Red Line" interval (Updates every 60 seconds)
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000)
        return () => clearInterval(timer)
    }, [])

    const handlePrevious = () => {
        if (viewType === 'Month') setCurrentDate(subMonths(currentDate, 1))
        else if (viewType === 'Week') setCurrentDate(subWeeks(currentDate, 1))
        else setCurrentDate(subDays(currentDate, 1))
    }

    const handleNext = () => {
        if (viewType === 'Month') setCurrentDate(addMonths(currentDate, 1))
        else if (viewType === 'Week') setCurrentDate(addWeeks(currentDate, 1))
        else setCurrentDate(addDays(currentDate, 1))
    }

    const handleToday = () => {
        setCurrentDate(new Date())
    }

    const getHeaderText = () => {
        if (viewType === 'Month') return format(currentDate, 'MMMM yyyy')
        if (viewType === 'Week') {
            // Very basic week formatting
            const startOfWeek = new Date(currentDate)
            startOfWeek.setDate(currentDate.getDate() - (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1))
            const endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 6)

            if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                return `${format(startOfWeek, 'MMM d')} – ${format(endOfWeek, 'd, yyyy')}`
            }
            return `${format(startOfWeek, 'MMM d')} – ${format(endOfWeek, 'MMM d, yyyy')}`
        }
        return format(currentDate, 'EEEE, MMMM d, yyyy')
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background rounded-2xl border border-border/50 shadow-sm relative">

            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={handleToday} className="h-8 shadow-none bg-background">
                        Today
                    </Button>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handlePrevious} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight min-w-[200px]">{getHeaderText()}</h2>
                </div>

                {/* Layout Switcher */}
                <div className="flex items-center bg-secondary/50 rounded-lg p-1 border border-border/50">
                    {(['Day', 'Week', 'Month'] as ViewType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setViewType(type)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewType === type
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar Content Area */}
            <div className="flex-1 w-full overflow-hidden relative bg-card">
                {viewType === 'Month' && <CalendarMonthView currentDate={currentDate} tasks={tasks} setTasks={setTasks} userId={userId} />}
                {viewType === 'Week' && <CalendarWeekView currentDate={currentDate} currentTime={currentTime} tasks={tasks} setTasks={setTasks} userId={userId} />}
                {viewType === 'Day' && <CalendarDayView currentDate={currentDate} currentTime={currentTime} tasks={tasks} setTasks={setTasks} userId={userId} />}
            </div>

        </div>
    )
}
