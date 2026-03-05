'use client'

import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react'
import { Tldraw, getSnapshot, loadSnapshot, Editor, TLAssetId, createTLStore, defaultShapeUtils } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ─── Error Boundary ────────────────────────────────────────────────────────────
class CanvasErrorBoundary extends Component<
    { children: ReactNode },
    { hasError: boolean; message: string }
> {
    state = { hasError: false, message: '' }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, message: error?.message ?? 'Unknown error' }
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[CanvasErrorBoundary]', error, info)
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background text-foreground p-8 gap-4">
                    <p className="text-destructive font-semibold">Canvas Error</p>
                    <p className="text-xs text-muted-foreground text-center max-w-xs">{this.state.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                    >
                        Reload
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}

// ─── Main Component ─────────────────────────────────────────────────────────────────
export function InspirationCanvas({ boardId, userId }: { boardId: string; userId: string }) {
    // ⚡ Store created SYNCHRONOUSLY — never changes reference after mount.
    // This means Tldraw never receives a new store prop, preventing mid-session crashes.
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }))
    const [isLoadingData, setIsLoadingData] = useState(true)

    const supabaseRef = useRef(createClient())
    const editorRef = useRef<Editor | null>(null)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const storeListenerRef = useRef<(() => void) | null>(null)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    // Load saved canvas data into the already-created store
    useEffect(() => {
        let cancelled = false

        async function loadData() {
            try {
                const { data } = await supabaseRef.current
                    .from('inspiration_boards')
                    .select('canvas_state')
                    .eq('id', boardId)
                    .single()

                if (cancelled) return

                if (data?.canvas_state?.store) {
                    try {
                        // Load into existing store — no store reference change, no Tldraw remount
                        loadSnapshot(store, data.canvas_state.store)
                    } catch {
                        console.warn('[InspirationCanvas] Bad snapshot, using empty board.')
                    }
                }
            } catch (err) {
                console.error('[InspirationCanvas] Load error:', err)
            } finally {
                if (!cancelled && mountedRef.current) {
                    setIsLoadingData(false)
                }
            }
        }

        loadData()
        return () => { cancelled = true }
    }, [boardId, store])

    function handleMount(editor: Editor) {
        editorRef.current = editor

        // Clean up previous listener if any
        if (storeListenerRef.current) {
            storeListenerRef.current()
        }

        // Debounced auto-save — purely imperative, zero React state mutations
        storeListenerRef.current = editor.store.listen(() => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            saveTimerRef.current = setTimeout(async () => {
                if (!editorRef.current || !mountedRef.current) return
                try {
                    const snap = getSnapshot(editorRef.current.store)
                    await supabaseRef.current
                        .from('inspiration_boards')
                        .update({
                            canvas_state: { store: snap },
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', boardId)
                } catch (err) {
                    console.error('[InspirationCanvas] Auto-save failed:', err)
                }
            }, 1500)
        }, { scope: 'document' })

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
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            storeListenerRef.current?.()
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [])

    return (
        <div className="absolute inset-0">
            <CanvasErrorBoundary>
                {/*
                 * Tldraw is ALWAYS mounted from the first render.
                 * The store reference never changes — we mutate the store's data
                 * (via loadSnapshot) without ever changing the React prop.
                 * This prevents Tldraw from unmounting on Vercel when async data loads.
                 */}
                <Tldraw store={store} onMount={handleMount} autoFocus />
            </CanvasErrorBoundary>

            {/* Loading overlay sits ON TOP of Tldraw while data fetches — no unmount/remount */}
            {isLoadingData && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-background z-[100]"
                    style={{ pointerEvents: 'all' }}
                >
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-xs font-medium text-muted-foreground">Preparing canvas…</p>
                </div>
            )}
        </div>
    )
}
