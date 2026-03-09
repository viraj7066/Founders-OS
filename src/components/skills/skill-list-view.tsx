'use client'

import React, { useState } from 'react'
import { Skill } from '@/types/skills'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Flame, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
    skills: Skill[]
    userId: string
    setSkills: React.Dispatch<React.SetStateAction<Skill[]>>
}

type SortField = 'name' | 'progress' | 'streak'
type SortOrder = 'asc' | 'desc'

export function SkillListView({ skills, userId, setSkills }: Props) {
    const [sortField, setSortField] = useState<SortField>('progress')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

    const sortedSkills = [...skills].sort((a, b) => {
        let valA: any = a[sortField]
        let valB: any = b[sortField]

        // Handle string sorting
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
    })

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortOrder('desc')
        }
    }

    const categoryColors: Record<string, string> = {
        'Tech': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'Creative': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        'Soft Skill': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20',
        'Other': 'bg-secondary text-muted-foreground border-border/50',
    }

    const statusColors: Record<string, string> = {
        'Wishlist': 'text-muted-foreground',
        'Learning': 'text-blue-500',
        'Mastered': 'text-emerald-500 font-medium',
    }

    return (
        <div className="bg-card border border-border/50 rounded-xl m-4 overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[200px]">
                            <Button variant="ghost" size="sm" onClick={() => toggleSort('name')} className="-ml-3 h-8 data-[state=open]:bg-accent">
                                Skill Name <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                        </TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                            <Button variant="ghost" size="sm" onClick={() => toggleSort('progress')} className="-ml-3 h-8">
                                Progress <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" size="sm" onClick={() => toggleSort('streak')} className="-ml-3 h-8">
                                Streak <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                        </TableHead>
                        <TableHead>Next Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedSkills.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No skills found. Try adjusting your filters.
                            </TableCell>
                        </TableRow>
                    )}
                    {sortedSkills.map((skill) => (
                        <TableRow key={skill.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-foreground">{skill.name}</TableCell>
                            <TableCell>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${categoryColors[skill.category]}`}>
                                    {skill.category}
                                </span>
                            </TableCell>
                            <TableCell className={statusColors[skill.status]}>
                                {skill.status}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${skill.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                            style={{ width: `${skill.progress}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground">{skill.progress}%</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1.5 text-orange-600">
                                    <Flame className="w-3.5 h-3.5" />
                                    <span className="text-sm font-semibold">{skill.streak}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {skill.next_action || '-'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
