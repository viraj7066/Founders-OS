'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import with ssr:false — this is in a CLIENT component so dynamic() works fine
const InspirationCanvas = dynamic(
    () => import('@/components/inspiration/inspiration-canvas').then(m => m.InspirationCanvas),
    {
        ssr: false,
        loading: () => (
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#ffffff',
            }}>
                <div style={{
                    width: 24, height: 24,
                    border: '2px solid #888', borderTopColor: 'transparent',
                    borderRadius: '50%', animation: 'spin 1s linear infinite',
                }} />
            </div>
        )
    }
)

interface Props {
    boardId: string
    userId: string
    boardName: string
    initialSnapshot: any
}

export function BoardCanvas({ boardId, userId, boardName, initialSnapshot }: Props) {
    const router = useRouter()

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
            }}
        >
            {/* Header */}
            <div
                style={{
                    height: 56,
                    borderBottom: '1px solid #e5e5e5',
                    background: '#ffffff',
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
                    className="h-8 w-8 text-black hover:bg-gray-100"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="font-semibold text-black">{boardName} <span className="text-gray-400 font-normal ml-2">Moodboard</span></span>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1, position: 'relative' }}>
                <InspirationCanvas
                    boardId={boardId}
                    userId={userId}
                    initialSnapshot={initialSnapshot}
                />
            </div>
        </div>
    )
}
