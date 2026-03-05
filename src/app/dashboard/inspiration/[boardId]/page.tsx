'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import dynamic from 'next/dynamic'

// Load Tldraw only in browser
const InspirationCanvas = dynamic(
    () => import('@/components/inspiration/inspiration-canvas').then(m => m.InspirationCanvas),
    { ssr: false, loading: () => null }
)

export default function BoardPage() {
    const params = useParams()
    const router = useRouter()
    const boardId = params.boardId as string

    const supabaseRef = useRef(createClient())
    const [boardName, setBoardName] = useState('')
    const [userId, setUserId] = useState<string | null>(null)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let cancelled = false
        async function load() {
            const supabase = supabaseRef.current
            const { data: { session } } = await supabase.auth.getSession()
            const uid = session?.user?.id
            if (!uid || cancelled) return

            const { data } = await supabase
                .from('inspiration_boards')
                .select('name')
                .eq('id', boardId)
                .single()

            if (cancelled) return
            setUserId(uid)
            setBoardName(data?.name ?? 'Untitled Board')
            setReady(true)
        }
        load()
        return () => { cancelled = true }
    }, [boardId])

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

            {/* Canvas */}
            <div style={{ flex: 1, position: 'relative' }}>
                {ready && userId ? (
                    <InspirationCanvas boardId={boardId} userId={userId} />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>
    )
}
