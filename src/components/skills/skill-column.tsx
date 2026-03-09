'use client'

import React, { useState } from 'react'
import { Skill, SkillStatus } from '@/types/skills'
import { useDroppable } from '@dnd-kit/core'
import { SkillCard } from './skill-card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

interface Props {
    id: SkillStatus
    title: string
    skills: Skill[]
    userId: string
    setSkills: React.Dispatch<React.SetStateAction<Skill[]>>
}

export function SkillColumn({ id, title, skills, userId, setSkills }: Props | any) {
    const { setNodeRef, isOver } = useDroppable({ id })
    const supabase = createClient()
    const [isAdding, setIsAdding] = useState(false)
    const [newSkillName, setNewSkillName] = useState('')

    const handleQuickAdd = async () => {
        if (!newSkillName.trim()) {
            setIsAdding(false)
            return
        }

        const newSkill: Partial<Skill> = {
            user_id: userId,
            name: newSkillName.trim(),
            category: 'Other',
            status: id,
            progress: 0,
            streak: 0,
        }

        const tempId = crypto.randomUUID()
        const optimisticSkill = { ...newSkill, id: tempId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Skill
        setSkills((prev: any) => [...prev, optimisticSkill])

        setNewSkillName('')
        setIsAdding(false)

        try {
            const { data, error } = await supabase
                .from('skills')
                .insert(newSkill)
                .select('*')
                .single()

            if (error) throw error
            setSkills((prev: any) => prev.map((s: any) => s.id === tempId ? data : s))
        } catch (error: any) {
            toast.error("Failed to add skill: " + error.message)
            setSkills((prev: any) => prev.filter((s: any) => s.id !== tempId))
        }
    }

    return (
        <div className="flex flex-col flex-shrink-0 w-[340px] max-h-full">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-secondary text-[10px] font-medium text-muted-foreground">
                        {skills.length}
                    </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setIsAdding(true)}>
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 flex flex-col gap-3 p-2 rounded-xl border transition-colors 
                    ${isOver ? 'bg-secondary/50 border-primary/50' : 'bg-secondary/20 border-transparent'}
                    min-h-[150px] overflow-y-auto overflow-x-hidden relative`}
            >
                {/* Quick Add Form */}
                {isAdding && (
                    <div className="p-3 bg-card border rounded-lg shadow-sm flex flex-col gap-2">
                        <Input
                            autoFocus
                            placeholder="Skill name..."
                            value={newSkillName}
                            onChange={(e) => setNewSkillName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                            className="h-8 text-sm"
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={handleQuickAdd}>Add</Button>
                    </div>
                )}

                {skills.map(skill => (
                    <SkillCard key={skill.id} skill={skill} userId={userId} setSkills={setSkills} />
                ))}

                {!isAdding && skills.length === 0 && (
                    <div className="flex-1 flex items-center justify-center h-full text-xs text-muted-foreground/50 border-2 border-dashed border-border/50 rounded-lg py-8">
                        Drop skills here
                    </div>
                )}
            </div>
        </div>
    )
}
