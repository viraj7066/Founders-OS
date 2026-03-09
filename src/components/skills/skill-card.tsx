'use client'

import React, { useState } from 'react'
import { Skill } from '@/types/skills'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Flame, Link as LinkIcon, Edit3, CheckCircle2, Trash2 } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { isToday, parseISO } from 'date-fns'
import { SkillModal } from './skill-modal'

interface Props {
    skill: Skill
    isOverlay?: boolean
    userId: string
    setSkills: React.Dispatch<React.SetStateAction<Skill[]>>
}

export function SkillCard({ skill, isOverlay = false, userId, setSkills }: Props) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: skill.id,
        data: skill
    })

    const supabase = createClient()
    const [progress, setProgress] = useState(skill.progress)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
    }

    const categoryColors: Record<string, string> = {
        'Tech': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'Creative': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        'Soft Skill': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20',
        'Other': 'bg-secondary text-muted-foreground border-border/50',
    }

    const hasPracticedToday = skill.last_practiced_at ? isToday(parseISO(skill.last_practiced_at)) : false

    const handleProgressChange = async (value: number[]) => {
        const newProgress = value[0]
        setProgress(newProgress)

        let newStatus = skill.status
        if (newProgress === 100 && skill.status === 'Learning') {
            // Auto prompt for mastered (we just optimistically set it here)
            newStatus = 'Mastered'
            toast.success("🎉 Congratulations! Marked as Mastered.")
        }

        setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, progress: newProgress, status: newStatus } : s))

        try {
            await supabase.from('skills')
                .update({ progress: newProgress, status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', skill.id)
        } catch (error) {
            console.error(error)
        }
    }

    const handlePractice = async () => {
        if (hasPracticedToday) return

        const newStreak = skill.streak + 1
        const now = new Date().toISOString()

        setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, streak: newStreak, last_practiced_at: now } : s))

        try {
            await supabase.from('skills')
                .update({ streak: newStreak, last_practiced_at: now, updated_at: now })
                .eq('id', skill.id)
            toast.success("🔥 Streak updated!")
        } catch (error) {
            console.error(error)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this skill?')) return

        setSkills(prev => prev.filter(s => s.id !== skill.id))
        const { error } = await supabase.from('skills').delete().eq('id', skill.id)
        if (error) toast.error('Failed to delete skill')
    }

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={`
                group relative flex flex-col gap-3 p-4 bg-card border rounded-xl shadow-sm text-left
                hover:shadow-md hover:border-primary/30 transition-shadow cursor-grab active:cursor-grabbing
                ${isOverlay ? 'shadow-xl scale-105 rotate-2 z-50' : ''}
            `}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 flex-1">
                        <h4 className="font-semibold text-sm text-foreground leading-tight">
                            {skill.name}
                        </h4>
                        <span className={`w-fit px-2 py-0.5 rounded-md text-[10px] font-semibold border ${categoryColors[skill.category]}`}>
                            {skill.category}
                        </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-md border border-orange-500/20">
                            <Flame className="w-3 h-3" />
                            <span className="text-xs font-bold">{skill.streak}</span>
                        </div>

                        {!isOverlay && (
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
                </div>

                {skill.next_action && (
                    <div className="p-2 bg-secondary/30 rounded-lg border border-border/50">
                        <p className="text-[11px] text-muted-foreground font-medium flex items-start gap-1.5">
                            <Edit3 className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{skill.next_action}</span>
                        </p>
                    </div>
                )}

                <div
                    className="flex flex-col gap-1.5 mt-1"
                    onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when using slider
                >
                    <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Progress</span>
                        <span className={progress === 100 ? 'text-emerald-500 font-bold' : 'text-foreground'}>{progress}%</span>
                    </div>
                    <Slider
                        value={[progress]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={handleProgressChange}
                        className="w-full"
                    />
                </div>

                <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/50">
                    <Button
                        variant={hasPracticedToday ? "secondary" : "default"}
                        size="sm"
                        className={`h-7 text-xs px-3 ${hasPracticedToday ? 'text-muted-foreground opacity-70 pointer-events-none' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handlePractice(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {hasPracticedToday ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1.5 text-emerald-500" /> Done Today</>
                        ) : (
                            <><Flame className="w-3 h-3 mr-1.5" /> Practice</>
                        )}
                    </Button>

                    {skill.primary_resource && (
                        <a
                            href={skill.primary_resource}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <LinkIcon className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>

            <SkillModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} skill={skill} setSkills={setSkills} userId={userId} />
        </>
    )
}
