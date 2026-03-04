'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './kanban-card'
import { Lead } from '@/types/crm'
import { StageId } from './kanban-board'

interface KanbanColumnProps {
    id: StageId
    title: string
    leads: Lead[]
    onCardClick?: (lead: Lead) => void
}

export function KanbanColumn({ id, title, leads, onCardClick }: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({
        id,
    })

    return (
        <div className="flex flex-col w-72 shrink-0">
            <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {leads.length}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className="flex-1 bg-secondary/30 border border-border/50 rounded-xl p-3 min-h-[150px] flex flex-col gap-3"
            >
                <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    {leads.map((lead) => (
                        <KanbanCard key={lead.id} lead={lead} onClick={() => onCardClick && onCardClick(lead)} />
                    ))}
                </SortableContext>
            </div>
        </div>
    )
}
