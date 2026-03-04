'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lead } from '@/types/crm'
import { Building2, DollarSign, Sparkles } from 'lucide-react'

interface KanbanCardProps {
    lead: Lead
    isOverlay?: boolean
    onClick?: () => void
}

export function KanbanCard({ lead, isOverlay, onClick }: KanbanCardProps) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: lead.id,
        data: { type: 'Lead', lead },
    })

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`touch-none cursor-pointer pb-2 ${isOverlay ? 'opacity-100 rotate-2 scale-105 transition-all shadow-xl' : ''}`}
        >
            <Card className="hover:border-primary/50 border-border bg-card transition-all shadow-sm group rounded-xl p-2.5">
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate leading-tight">
                            {lead.name}
                        </h3>
                        {lead.value && (
                            <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md shrink-0 border border-emerald-500/20">
                                ₹{lead.value.toLocaleString()}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center text-[10px] text-muted-foreground truncate leading-none opacity-80 group-hover:opacity-100 transition-opacity">
                        <Building2 className="w-3 h-3 mr-1 shrink-0" />
                        <span className="truncate">{lead.company || 'Private'}</span>
                    </div>

                    {lead.service && (
                        <div className="mt-0.5 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/10 w-fit">
                            <Sparkles className="w-2.5 h-2.5 text-primary" />
                            <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                                {lead.service}
                            </span>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
