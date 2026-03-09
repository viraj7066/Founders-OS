'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skill, SkillCategory, SkillStatus } from '@/types/skills'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Slider } from '@/components/ui/slider'

interface Props {
    isOpen: boolean
    onClose: () => void
    skill: Skill
    userId: string
    setSkills: React.Dispatch<React.SetStateAction<Skill[]>>
}

export function SkillModal({ isOpen, onClose, skill, userId, setSkills }: Props) {
    const supabase = createClient()
    const [name, setName] = useState(skill.name)
    const [category, setCategory] = useState<SkillCategory>(skill.category)
    const [status, setStatus] = useState<SkillStatus>(skill.status)
    const [progress, setProgress] = useState(skill.progress)
    const [primaryResource, setPrimaryResource] = useState(skill.primary_resource || '')
    const [nextAction, setNextAction] = useState(skill.next_action || '')
    const [timeGoal, setTimeGoal] = useState(skill.time_goal || '')
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Skill name is required')
            return
        }

        setIsSaving(true)

        const updates: Partial<Skill> = {
            name: name.trim(),
            category,
            status,
            progress,
            primary_resource: primaryResource.trim() || null,
            next_action: nextAction.trim() || null,
            time_goal: timeGoal.trim() || null,
            updated_at: new Date().toISOString()
        }

        try {
            const { error } = await supabase
                .from('skills')
                .update(updates)
                .eq('id', skill.id)

            if (error) throw error

            setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, ...updates } : s))
            toast.success('Skill updated successfully')
            onClose()
        } catch (error: any) {
            toast.error('Failed to update skill: ' + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Skill</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Skill Name *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tech">Tech</SelectItem>
                                    <SelectItem value="Creative">Creative</SelectItem>
                                    <SelectItem value="Soft Skill">Soft Skill</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Wishlist">Wishlist</SelectItem>
                                    <SelectItem value="Learning">Learning</SelectItem>
                                    <SelectItem value="Mastered">Mastered 🏆</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2 mt-2">
                        <div className="flex justify-between items-center">
                            <Label>Mastery Progress</Label>
                            <span className="text-xs font-bold text-primary">{progress}%</span>
                        </div>
                        <Slider
                            value={[progress]}
                            max={100}
                            step={1}
                            onValueChange={(val) => setProgress(val[0])}
                            className="my-2"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Primary Resource (Course, Book, URL)</Label>
                        <Input value={primaryResource} onChange={e => setPrimaryResource(e.target.value)} placeholder="e.g. Next.js Documentation" />
                    </div>

                    <div className="grid gap-2">
                        <Label>Next Action</Label>
                        <Input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="e.g. Build basic UI layout" />
                    </div>

                    <div className="grid gap-2">
                        <Label>Time Goal</Label>
                        <Input value={timeGoal} onChange={e => setTimeGoal(e.target.value)} placeholder="e.g. 1 hour / day" />
                    </div>
                </div>

                <DialogFooter className="sm:justify-between items-center mt-4 pt-4 border-t border-border/50">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
