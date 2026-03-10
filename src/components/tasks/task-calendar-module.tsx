'use client'

import React, { useState, useEffect } from 'react'
import { Task, TaskStats } from '@/types/tasks'
import { TaskCalendar } from './task-calendar'
import { CalendarView } from './calendar-view'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { KanbanSquare, Calendar as CalendarIcon } from 'lucide-react'

interface Props {
    userId: string
    initialTasks: Task[]
    initialStats: TaskStats | null
}

export function TaskCalendarModule({ userId, initialTasks, initialStats }: Props) {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState<'Kanban' | 'Calendar'>('Kanban')
    useEffect(() => {
        document.title = activeTab === 'Kanban' ? 'Task Calendar' : 'Calendar';
    }, [activeTab]);
    const [isCheckingStart, setIsCheckingStart] = useState(true)

    // Startup Logic: Ensures dates and columns are strictly synced according to today's date
    // Note: Our auto-regenerating recursive logic and Real-Time Sync is still independently handled 
    // inside task-calendar.tsx, but this outer layer does the "Midnight Rollover / App Start" column verification.
    useEffect(() => {
        const checkAppStartupState = async () => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)

            // Collect tasks that need moving
            const updatesToPush: { id: string, column_id: Task['column_id'] }[] = []

            for (const task of initialTasks) {
                if (task.column_id === 'Done' || !task.due_date) continue

                const taskDate = new Date(task.due_date)
                taskDate.setHours(0, 0, 0, 0)

                let expectedColumn: Task['column_id'] = task.column_id

                if (taskDate.getTime() === today.getTime()) {
                    expectedColumn = 'Today'
                } else if (taskDate.getTime() === tomorrow.getTime()) {
                    expectedColumn = 'Tomorrow'
                } else if (taskDate > tomorrow) {
                    const daysDiff = (taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    if (daysDiff <= 7 && taskDate.getDay() !== 1) { // Basic Check for 'This Week'
                        expectedColumn = 'This Week'
                    } else {
                        expectedColumn = 'Backlog'
                    }
                } else if (taskDate < today) {
                    expectedColumn = 'Today' // Overdue forced to today
                }

                if (expectedColumn !== task.column_id) {
                    updatesToPush.push({ id: task.id, column_id: expectedColumn })
                }
            }

            if (updatesToPush.length > 0) {
                console.log(`Syncing ${updatesToPush.length} tasks matching new date rules...`)
                for (const update of updatesToPush) {
                    // Doing sequential update to ensure triggers fire correctly in Supabase
                    await supabase.from('tasks').update({ column_id: update.column_id }).eq('id', update.id)
                }
            }

            setIsCheckingStart(false)
        }

        checkAppStartupState()
    }, [initialTasks, supabase])

    if (isCheckingStart) {
        return (
            <div className="flex-1 w-full h-full flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-muted-foreground animate-pulse">Syncing chronological database...</p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col w-full h-full gap-4">
            {/* Header Tabs Navigation */}
            <div className="flex items-center gap-2 p-1 bg-secondary rounded-lg w-fit">
                <Button
                    variant={activeTab === 'Kanban' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('Kanban')}
                    className="h-8 shadow-none"
                >
                    <KanbanSquare className="w-4 h-4 mr-2" />
                    Board
                </Button>
                <Button
                    variant={activeTab === 'Calendar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('Calendar')}
                    className="h-8 shadow-none"
                >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Calendar
                </Button>
            </div>

            {/* Container for both views. We use CSS display to hide the inactive one so its state is preserved! */}
            <div className="flex-1 w-full overflow-hidden relative">

                <div className="absolute inset-0 transition-opacity duration-300"
                    style={{ opacity: activeTab === 'Kanban' ? 1 : 0, pointerEvents: activeTab === 'Kanban' ? 'auto' : 'none', zIndex: activeTab === 'Kanban' ? 10 : 0 }}>
                    <TaskCalendar
                        userId={userId}
                        initialTasks={initialTasks}
                        initialStats={initialStats}
                    />
                </div>

                <div className="absolute inset-0 transition-opacity duration-300"
                    style={{ opacity: activeTab === 'Calendar' ? 1 : 0, pointerEvents: activeTab === 'Calendar' ? 'auto' : 'none', zIndex: activeTab === 'Calendar' ? 10 : 0 }}>
                    <CalendarView
                        userId={userId}
                        initialTasks={initialTasks}
                    />
                </div>

            </div>
        </div>
    )
}
