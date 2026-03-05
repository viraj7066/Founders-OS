'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import dynamic from 'next/dynamic'

// Load Tldraw only in browser
const InspirationCanvas = dynamic(
    () => import('@/components/inspiration/inspiration-canvas').then(m => m.InspirationCanvas),
    {
        ssr: false, loading: () => (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }
)

interface Props {
    boardId: string
    userId: string
    boardName: string
}

// This component receives server-validated userId/boardId/boardName as props.
// No client-side auth checks needed — the server page already verified the session.
export function BoardCanvas({ boardId, userId, boardName }: Props) {
    const router = useRouter()

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--background, #fff)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    height: 56,
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--background)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 16px',
                    flexShrink: 0,
                    zIndex: 10,
                }}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="h-8 w-8"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="font-semibold text-foreground">{boardName}</span>
            </div>

            {/* Canvas — always renders since auth was verified server-side */}
            <div style={{ flex: 1, position: 'relative' }}>
                <InspirationCanvas boardId={boardId} userId={userId} />
            </div>
        </div>
    )
}
