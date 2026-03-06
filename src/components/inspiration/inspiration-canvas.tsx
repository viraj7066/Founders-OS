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
    const supabaseRef = useRef(createClient())
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const storeListenerRef = useRef<(() => void) | null>(null)

    // Create store ONCE on first render, outside React lifecycle
    const [store] = useState(() => {
        const s = createTLStore()
        if (initialSnapshot) {
            try {
                loadSnapshot(s, initialSnapshot)
            } catch (e) {
                console.error('Failed to load snapshot:', e)
            }
        }
        return s
    })

    // Client-side mount guard
    const [ready, setReady] = useState(false)
    useEffect(() => { setReady(true) }, [])

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

        // Auto-save on user document changes only, 3s debounce
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
                    } catch (err) {
                        console.error('[Canvas] Auto-save error:', err)
                    }
                }, 3000)
            },
            { source: 'user', scope: 'document' }
        )
    }, [boardId, userId])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            storeListenerRef.current?.()
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [])

    if (!ready) return null

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <Tldraw
                store={store}
                onMount={handleMount}
                autoFocus
            />
        </div>
    )
}
