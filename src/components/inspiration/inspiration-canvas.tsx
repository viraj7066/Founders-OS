'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Tldraw, getSnapshot, Editor, TLAssetId } from 'tldraw'
import 'tldraw/tldraw.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface InspirationCanvasProps {
    boardId: string
    userId: string
    initialSnapshot?: any
}

export function InspirationCanvas({ boardId, userId, initialSnapshot }: InspirationCanvasProps) {
    const supabaseRef = useRef(createClient())
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const storeListenerRef = useRef<(() => void) | null>(null)
    const mountedRef = useRef(true)

    // Freeze snapshot reference to prevent Tldraw store recreation
    const [frozenSnapshot] = useState(() => initialSnapshot || undefined)

    const handleMount = useCallback((editor: Editor) => {
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

        // Auto-save — only fires on user-initiated document changes
        if (storeListenerRef.current) storeListenerRef.current()
        storeListenerRef.current = editor.store.listen(
            () => {
                if (!mountedRef.current) return
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
                saveTimerRef.current = setTimeout(async () => {
                    if (!mountedRef.current) return
                    try {
                        const snap = getSnapshot(editor.store)
                        await supabaseRef.current
                            .from('inspiration_boards')
                            .update({
                                canvas_state: { store: snap },
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', boardId)
                    } catch (err) {
                        console.error('[Canvas] Auto-save error:', err)
                    }
                }, 3000)
            },
            { source: 'user', scope: 'document' }
        )
    }, [boardId, userId])

    // Cleanup
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            storeListenerRef.current?.()
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [])

    return (
        <div style={{ position: 'absolute', inset: 0, background: '#ffffff' }}>
            <Tldraw
                snapshot={frozenSnapshot}
                onMount={handleMount}
                autoFocus
            />
        </div>
    )
}
