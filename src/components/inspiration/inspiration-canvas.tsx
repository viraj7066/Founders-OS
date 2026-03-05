'use client'

import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react'
import { Tldraw, getSnapshot, loadSnapshot, Editor, TLAssetId, createTLStore, defaultShapeUtils, TLStore } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ─── Error Boundary ────────────────────────────────────────────────────────────
class CanvasErrorBoundary extends Component<
    { children: ReactNode },
    { hasError: boolean; error: Error | null }
> {
    state = { hasError: false, error: null }
    static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
    componentDidCatch(error: Error, info: ErrorInfo) { console.error('[CanvasErrorBoundary]', error, info) }
    render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background text-foreground p-8">
                    <p className="text-destructive font-semibold mb-2">Canvas Error</p>
                    <p className="text-xs text-muted-foreground mb-4 text-center max-w-xs">
                        {((this.state.error as unknown) as Error)?.message ?? 'Unknown error'}
                    </p>
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

// ─── Canvas Component ───────────────────────────────────────────────────────────
export function InspirationCanvas({ boardId, userId }: { boardId: string; userId: string }) {
    // Single stable supabase client — created once, stored in ref
    const supabaseRef = useRef(createClient())

    const [store, setStore] = useState<TLStore | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Track whether component is still mounted to avoid setState on unmounted component
    const mountedRef = useRef(true)
    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    // Load initial state once — no supabase in deps to prevent loops
    useEffect(() => {
        async function init() {
            const supabase = supabaseRef.current
            const freshStore = createTLStore({ shapeUtils: defaultShapeUtils })

            try {
                const { data } = await supabase
                    .from('inspiration_boards')
                    .select('canvas_state')
                    .eq('id', boardId)
                    .single()

                if (data?.canvas_state?.store) {
                    try {
                        loadSnapshot(freshStore, data.canvas_state.store)
                    } catch {
                        console.warn('[InspirationCanvas] Corrupted snapshot, starting fresh.')
                    }
                }
            } catch (err) {
                console.error('[InspirationCanvas] Load error:', err)
            }

            // Only update state if still mounted
            if (mountedRef.current) {
                setStore(freshStore)
                setIsLoading(false)
            }
        }

        init()
        // boardId is stable per-render of this component; only re-init if it changes
    }, [boardId])

    // onMount: called by Tldraw once after editor initialises
    // Must NOT return a cleanup function — Tldraw ignores it and it confuses the hook
    const editorRef = useRef<Editor | null>(null)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const storeListenerRef = useRef<(() => void) | null>(null)

    function handleMount(editor: Editor) {
        editorRef.current = editor

        // Clean up any previous listener (safety net)
        if (storeListenerRef.current) {
            storeListenerRef.current()
            storeListenerRef.current = null
        }

        // Debounced auto-save — no React state, no re-renders
        storeListenerRef.current = editor.store.listen(() => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            saveTimerRef.current = setTimeout(async () => {
                if (!editorRef.current) return
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

        // Image drag-and-drop upload
        editor.registerExternalAssetHandler('file', async ({ file }) => {
            try {
                const ext = file.name.split('.').pop() ?? 'png'
                const path = `${userId}/${boardId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
                const { error } = await supabaseRef.current.storage.from('inspiration_assets').upload(path, file)
                if (error) throw error
                const { data: { publicUrl } } = supabaseRef.current.storage.from('inspiration_assets').getPublicUrl(path)
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

    // Cleanup store listener when component unmounts
    useEffect(() => {
        return () => {
            storeListenerRef.current?.()
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [])

    if (isLoading || !store) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F9FAFB] dark:bg-[#121212]">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-medium text-muted-foreground">Preparing canvas…</p>
            </div>
        )
    }

    return (
        <div className="absolute inset-0">
            <CanvasErrorBoundary>
                <Tldraw store={store} onMount={handleMount} autoFocus />
            </CanvasErrorBoundary>
        </div>
    )
}
