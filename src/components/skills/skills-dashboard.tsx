'use client'

import React, { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Skill, SkillStatus, SkillCategory } from '@/types/skills'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Flame, Target, List, LayoutGrid, Search, PlusCircle, CheckCircle2 } from 'lucide-react'
import { SkillColumn } from './skill-column'
import { SkillCard } from './skill-card'
import { SkillListView } from './skill-list-view'

const COLUMNS: SkillStatus[] = ['Wishlist', 'Learning', 'Mastered']

interface Props {
    userId: string
    initialSkills: Skill[]
}

export function SkillsDashboard({ userId, initialSkills }: Props) {
    const supabase = createClient()
    const [skills, setSkills] = useState<Skill[]>(initialSkills)
    const [view, setView] = useState<'board' | 'list'>('board')
    const [searchQuery, setSearchQuery] = useState('')
    const [activeSkill, setActiveSkill] = useState<Skill | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // Calculate Dashboard Stats
    const learningCount = skills.filter(s => s.status === 'Learning').length
    const masteredCount = skills.filter(s => s.status === 'Mastered').length
    const longestStreak = skills.length > 0 ? Math.max(...skills.map(s => s.streak)) : 0

    // Filter skills
    const filteredSkills = useMemo(() => {
        if (!searchQuery) return skills
        const query = searchQuery.toLowerCase()
        return skills.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.category.toLowerCase().includes(query)
        )
    }, [skills, searchQuery])

    // Group skills by status for Board View
    const skillsByStatus = useMemo(() => {
        const grouped: Record<SkillStatus, Skill[]> = {
            'Wishlist': [],
            'Learning': [],
            'Mastered': []
        }
        filteredSkills.forEach(skill => {
            if (grouped[skill.status]) {
                grouped[skill.status].push(skill)
            }
        })
        return grouped
    }, [filteredSkills])

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const skill = skills.find(s => s.id === active.id)
        if (skill) setActiveSkill(skill)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveSkill(null)
        const { active, over } = event
        if (!over) return

        const skillId = active.id as string
        const toStatus = over.id as SkillStatus

        const skill = skills.find(s => s.id === skillId)
        if (!skill || skill.status === toStatus) return

        const previousStatus = skill.status
        const newProgress = toStatus === 'Mastered' ? 100 : skill.progress

        // Optimistic Update
        setSkills(prev => prev.map(s =>
            s.id === skillId ? { ...s, status: toStatus, progress: newProgress } : s
        ))

        try {
            const { error } = await supabase
                .from('skills')
                .update({ status: toStatus, progress: newProgress, updated_at: new Date().toISOString() })
                .eq('id', skillId)

            if (error) throw error
        } catch (error: any) {
            toast.error("Failed to update status: " + error.message)
            setSkills(prev => prev.map(s =>
                s.id === skillId ? { ...s, status: previousStatus, progress: skill.progress } : s
            ))
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background rounded-2xl border border-border/50 shadow-sm">

            {/* Top Stat Cards */}
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-border/50 bg-card">
                <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/50">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Currently Learning</p>
                        <p className="text-2xl font-bold">{learningCount}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/50">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Mastered</p>
                        <p className="text-2xl font-bold">{masteredCount}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/50">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Longest Streak</p>
                        <p className="text-2xl font-bold">{longestStreak} Days</p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card z-10">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search skills..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 pl-9 h-9 border-border/50 bg-background/50"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center p-1 bg-secondary rounded-lg">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-3 text-xs ${view === 'board' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setView('board')}
                        >
                            <LayoutGrid className="w-4 h-4 mr-1.5" /> Board
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-3 text-xs ${view === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setView('list')}
                        >
                            <List className="w-4 h-4 mr-1.5" /> List
                        </Button>
                    </div>
                    <Button size="sm" className="h-9">
                        <PlusCircle className="w-4 h-4 mr-2" /> Add Skill
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-muted/20 relative">
                {view === 'board' ? (
                    <DndContext id="dnd-skills-dashboard"
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex h-full p-4 gap-6 w-max min-w-full">
                            {COLUMNS.map(col => (
                                <SkillColumn
                                    key={col}
                                    id={col}
                                    title={col}
                                    skills={skillsByStatus[col]}
                                    userId={userId}
                                    setSkills={setSkills}
                                />
                            ))}
                        </div>
                        <DragOverlay>
                            {activeSkill ? <SkillCard skill={activeSkill} isOverlay userId={userId} setSkills={setSkills} /> : null}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    <SkillListView skills={filteredSkills} setSkills={setSkills} userId={userId} />
                )}
            </div>
        </div>
    )
}
