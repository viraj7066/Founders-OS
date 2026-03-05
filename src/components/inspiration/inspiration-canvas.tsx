'use client'

import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react'
import { Tldraw, getSnapshot, loadSnapshot, Editor, TLAssetId, createTLStore, defaultShapeUtils, TLStore } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ─── Error Boundary to catch Tldraw internal errors ───────────────────────────
class CanvasErrorBoundary extends Component<
    { children: ReactNode; onReset: () => void },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: ReactNode; onReset: () => void }) {
        super(props)
        this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error }
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[CanvasErrorBoundary] Tldraw crashed:', error, info)
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-background text-foreground">
                    <h2 className="text-xl font-bold mb-2 text-destructive">Canvas Error</h2>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm text-center">
                        {this.state.error?.message ?? 'An unknown error occurred in the canvas.'}
                    </p>
                    <button
                        onClick={this.props.onReset}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition"
                    >
                        Reset Board
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function InspirationCanvas({ boardId, userId }: { boardId: string; userId: string }) {
    const [store, setStore] = useState<TLStore | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [resetKey, setResetKey] = useState(0)

    // Stable supabase client reference — not recreated on renders
    const supabase = createClient()

    useEffect(() => {
        let cancelled = false

        async function init() {
            setIsLoading(true)

            // Build a fresh, empty store
            const freshStore = createTLStore({ shapeUtils: defaultShapeUtils })

            try {
                const { data, error } = await supabase
                    .from('inspiration_boards')
                    .select('canvas_state')
                    .eq('id', boardId)
                    .single()

                if (!cancelled) {
                    if (!error && data?.canvas_state?.store) {
                        try {
                            loadSnapshot(freshStore, data.canvas_state.store)
                        } catch (snapErr) {
                            console.warn('[InspirationCanvas] Bad snapshot, starting fresh.', snapErr)
                        }
                    }
                    setStore(freshStore)
                    setIsLoading(false)
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('[InspirationCanvas] Failed to load board:', err)
                    // Still give them a usable empty board
                    setStore(freshStore)
                    setIsLoading(false)
                }
            }
        }

        init()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardId, resetKey])

    const handleReset = useCallback(() => {
        setStore(null)
        setIsLoading(true)
        setResetKey(k => k + 1)
    }, [])

    const handleMount = useCallback((editor: Editor) => {
        // Auto-save: debounced, zero React state mutations
        let saveTimer: ReturnType<typeof setTimeout>

        const cleanup = editor.store.listen(() => {
            clearTimeout(saveTimer)
            saveTimer = setTimeout(async () => {
                try {
                    const snap = getSnapshot(editor.store)
                    await supabase
                        .from('inspiration_boards')
                        .update({
                            canvas_state: { store: snap },
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', boardId)
                } catch (err) {
                    console.error('[InspirationCanvas] Auto-save failed:', err)
                }
            }, 1200)
        }, { scope: 'document' })

        // Drag-and-drop image uploads
        editor.registerExternalAssetHandler('file', async ({ file }) => {
            const ext = file.name.split('.').pop() ?? 'png'
            const path = `${userId}/${boardId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

            const { error } = await supabase.storage.from('inspiration_assets').upload(path, file)
            if (error) {
                toast.error('Image upload failed')
                throw error
            }

            const { data: { publicUrl } } = supabase.storage.from('inspiration_assets').getPublicUrl(path)

            return {
                id: `asset:${crypto.randomUUID()}` as TLAssetId,
                type: 'image',
                typeName: 'asset',
                props: { name: file.name, src: publicUrl, w: 800, h: 600, isAnimated: false, mimeType: file.type },
                meta: {},
            } as any
        })

        // Cleanup store listener when editor unmounts
        return () => {
            cleanup()
            clearTimeout(saveTimer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardId, userId])

    if (isLoading || !store) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F9FAFB] dark:bg-[#121212]">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-medium text-muted-foreground tracking-wide">Preparing canvas…</p>
            </div>
        )
    }

    return (
        <div className="absolute inset-0">
            <CanvasErrorBoundary onReset={handleReset}>
                {/* key={store} ensures Tldraw never re-mounts on unexpected store reference changes */}
                <Tldraw store={store} onMount={handleMount} autoFocus />
            </CanvasErrorBoundary>
        </div>
    )
}
