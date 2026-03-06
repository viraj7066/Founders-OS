'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Tldraw, getSnapshot, Editor, TLAssetId, createTLStore, loadSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface InspirationCanvasProps {
    boardId: string
    userId: string
    initialSnapshot?: any
}

export function InspirationCanvas({ boardId, userId, initialSnapshot }: InspirationCanvasProps) {
    const [debugLog, setDebugLog] = useState<string[]>([])
    const [renderCount, setRenderCount] = useState(0)
    const [isUnmounted, setIsUnmounted] = useState(false)
    const editorRef = useRef<Editor | null>(null)
    const supabaseRef = useRef(createClient())
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const storeListenerRef = useRef<(() => void) | null>(null)
    const mountTimeRef = useRef(Date.now())

    const log = useCallback((msg: string) => {
        const elapsed = ((Date.now() - mountTimeRef.current) / 1000).toFixed(1)
        setDebugLog(prev => [...prev.slice(-15), `[${elapsed}s] ${msg}`])
    }, [])

    // Track render count
    useEffect(() => {
        setRenderCount(c => c + 1)
    })

    // Track unmount
    useEffect(() => {
        log('Component MOUNTED')
        return () => {
            log('Component UNMOUNTING!')
            setIsUnmounted(true)
        }
    }, [log])

    // Create store ONCE, outside of React's render cycle
    const [store] = useState(() => {
        const s = createTLStore()
        if (initialSnapshot) {
            try {
                loadSnapshot(s, initialSnapshot)
            } catch (e) {
                console.error('Snapshot load failed:', e)
            }
        }
        return s
    })

    // Client-side mount guard
    const [ready, setReady] = useState(false)
    useEffect(() => {
        log('Setting ready=true')
        setReady(true)
    }, [log])

    const handleMount = useCallback((editor: Editor) => {
        log('Tldraw onMount fired')
        editorRef.current = editor

        // Image upload handler
        editor.registerExternalAssetHandler('file', async ({ file }) => {
            try {
                const ext = file.name.split('.').pop() ?? 'png'
                const path = `${userId}/${boardId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
                const { error } = await supabaseRef.current.storage
                    .from('inspiration_assets').upload(path, file)
                if (error) throw error
                const { data: { publicUrl } } = supabaseRef.current.storage
                    .from('inspiration_assets').getPublicUrl(path)
                return {
                    id: `asset:${crypto.randomUUID()}` as TLAssetId,
                    type: 'image' as const,
                    typeName: 'asset' as const,
                    props: { name: file.name, src: publicUrl, w: 800, h: 600, isAnimated: false, mimeType: file.type },
                    meta: {},
                }
            } catch (err) {
                toast.error('Image upload failed')
                throw err
            }
        })

        // Auto-save — only on user-initiated document changes, with long debounce
        if (storeListenerRef.current) storeListenerRef.current()
        storeListenerRef.current = editor.store.listen(
            () => {
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
                saveTimerRef.current = setTimeout(async () => {
                    try {
                        const snap = getSnapshot(editor.store)
                        await supabaseRef.current
                            .from('inspiration_boards')
                            .update({
                                canvas_state: { store: snap },
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', boardId)
                        log('Auto-saved OK')
                    } catch (err) {
                        log('Auto-save FAILED: ' + String(err))
                    }
                }, 3000)
            },
            { source: 'user', scope: 'document' }
        )
    }, [boardId, userId, log])

    // Cleanup
    useEffect(() => {
        return () => {
            storeListenerRef.current?.()
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [])

    if (!ready) {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                <p style={{ fontFamily: 'monospace', color: '#999' }}>Initializing canvas...</p>
            </div>
        )
    }

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            {/* DEBUG HUD - visible on Vercel */}
            <div
                id="canvas-debug-hud"
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 99999,
                    background: 'rgba(0,0,0,0.85)',
                    color: '#0f0',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    maxWidth: 320,
                    maxHeight: 200,
                    overflow: 'auto',
                    pointerEvents: 'none',
                    lineHeight: 1.4,
                }}
            >
                <div style={{ color: '#ff0', marginBottom: 4 }}>
                    CANVAS DEBUG | Renders: {renderCount} | {isUnmounted ? '❌ UNMOUNTED' : '✅ ALIVE'}
                </div>
                {debugLog.map((line, i) => (
                    <div key={i} style={{ color: line.includes('FAIL') || line.includes('UNMOUNT') ? '#f44' : '#0f0' }}>
                        {line}
                    </div>
                ))}
            </div>

            {/* TLDRAW — uses pre-created store, no snapshot prop */}
            <Tldraw
                store={store}
                onMount={handleMount}
                autoFocus
            />
        </div>
    )
}
