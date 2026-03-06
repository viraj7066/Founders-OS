'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

interface Props {
    boardId: string
    userId: string
    boardName: string
    initialSnapshot: any
}

// This component receives server-validated userId/boardId/boardName as props.
export function BoardCanvas({ boardId, userId, boardName, initialSnapshot }: Props) {
    const router = useRouter()
    const [canvasError, setCanvasError] = useState<string | null>(null)
    const [CanvasComponent, setCanvasComponent] = useState<React.ComponentType<any> | null>(null)
    const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading')

    // Manually import the canvas component with error catching
    useEffect(() => {
        let cancelled = false
        setLoadState('loading')

        import('@/components/inspiration/inspiration-canvas')
            .then((mod) => {
                if (cancelled) return
                setCanvasComponent(() => mod.InspirationCanvas)
                setLoadState('loaded')
            })
            .catch((err) => {
                if (cancelled) return
                const msg = err instanceof Error ? err.message : String(err)
                console.error('CANVAS IMPORT FAILED:', err)
                setCanvasError(msg)
                setLoadState('error')
            })

        return () => { cancelled = true }
    }, [])

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
                    className="h-8 w-8"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="font-semibold text-foreground">{boardName}</span>

                {/* STATUS BADGE - Always visible */}
                <span style={{
                    marginLeft: 'auto',
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    background: loadState === 'loaded' ? '#00cc44' : loadState === 'error' ? '#ff3333' : '#ffaa00',
                    color: '#fff',
                }}>
                    {loadState === 'loading' && '⏳ LOADING CANVAS MODULE...'}
                    {loadState === 'loaded' && '✅ CANVAS LOADED'}
                    {loadState === 'error' && '❌ IMPORT FAILED'}
                </span>
            </div>

            {/* Canvas area */}
            <div style={{ flex: 1, position: 'relative' }}>
                {loadState === 'loading' && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#fafafa',
                    }}>
                        <div style={{
                            textAlign: 'center', fontFamily: 'monospace', color: '#666',
                        }}>
                            <div style={{
                                width: 32, height: 32,
                                border: '3px solid #000', borderTopColor: 'transparent',
                                borderRadius: '50%', animation: 'spin 1s linear infinite',
                                margin: '0 auto 12px',
                            }} />
                            <p>Loading Tldraw canvas module...</p>
                            <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                                Board: {boardId}
                            </p>
                        </div>
                    </div>
                )}

                {loadState === 'error' && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        background: '#1a0000', color: '#ff4444',
                        fontFamily: 'monospace', padding: 32,
                    }}>
                        <h2 style={{ fontSize: 24, marginBottom: 16 }}>❌ Canvas Module Import Failed</h2>
                        <div style={{
                            background: '#330000', padding: 16, borderRadius: 8,
                            maxWidth: 600, width: '100%', wordBreak: 'break-all',
                        }}>
                            <p style={{ color: '#ff8888', fontSize: 13 }}>{canvasError}</p>
                        </div>
                        <p style={{ color: '#666', fontSize: 12, marginTop: 16 }}>
                            This error means the Tldraw library failed to load in production.
                            Take a screenshot and share it.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                marginTop: 16, padding: '8px 20px',
                                background: '#ff4444', color: '#fff',
                                border: 'none', borderRadius: 8, cursor: 'pointer',
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {loadState === 'loaded' && CanvasComponent && (
                    <CanvasComponent
                        boardId={boardId}
                        userId={userId}
                        initialSnapshot={initialSnapshot}
                    />
                )}
            </div>
        </div>
    )
}
