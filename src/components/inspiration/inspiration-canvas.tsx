'use client'

import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react'
import { Tldraw, getSnapshot, loadSnapshot, Editor, TLAssetId, createTLStore, defaultShapeUtils, TLStore } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props)
        this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
    componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Tldraw crashed:", error, errorInfo) }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-black text-white">
                    <h2 className="text-xl font-bold mb-4 text-red-500">Board Data Corrupted</h2>
                    <p className="text-sm text-gray-400 mb-6">The visual data for this board contains an invalid schema.</p>
                    <pre className="text-xs bg-gray-900 p-4 rounded overflow-auto max-w-full text-left mb-6">
                        {this.state.error?.message}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                        Reload Board
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}

export function InspirationCanvas({ boardId, userId }: { boardId: string; userId: string }) {
    const supabase = createClient()
    const [store, setStore] = useState<TLStore | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // 1. Fetch data and initialize the Tldraw Store externally BEFORE mounting Tldraw
    useEffect(() => {
        let isMounted = true

        const initializeStore = async () => {
            setIsLoading(true)

            // Create a fresh store instance
            const newStore = createTLStore({ shapeUtils: defaultShapeUtils })

            try {
                const { data, error } = await supabase
                    .from('inspiration_boards')
                    .select('canvas_state')
                    .eq('id', boardId)
                    .single()

                if (error) throw error

                // Robust schema validation to prevent canvas crashes from old/buggy snapshots
                if (data && data.canvas_state && data.canvas_state.store) {
                    const snapshot = data.canvas_state.store
                    // A valid v3 snapshot must have either document and session, or be a raw record map
                    if (snapshot.document || snapshot['document:document']) {
                        try {
                            loadSnapshot(newStore, snapshot)
                        } catch (loadErr) {
                            console.error("Board has corrupted data, starting fresh.", loadErr)
                            toast.error("Recovered from corrupted board data.")
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch board state:", err)
                if (isMounted) toast.error('Failed to load board state')
            }

            if (isMounted) {
                setStore(newStore)
                setIsLoading(false)
            }
        }

        initializeStore()

        return () => { isMounted = false }
    }, [boardId]) // supabase reference removed from dependencies to ensure absolute 0 looping

    const handleMount = useCallback((editor: Editor) => {
        // 2. Setup Auto-Save Listener
        let timeoutId: NodeJS.Timeout

        editor.store.listen(() => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(async () => {
                try {
                    const snapshot = getSnapshot(editor.store)
                    await supabase
                        .from('inspiration_boards')
                        .update({
                            canvas_state: { store: snapshot },
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', boardId)
                } catch (saveError) {
                    console.error("Failed to sync board to cloud:", saveError)
                }
            }, 1000)
        }, { scope: 'document' })

        // 3. Register External Assets (Drag & Drop)
        editor.registerExternalAssetHandler('file', async ({ file }) => {
            try {
                const fileExt = file.name.split('.').pop() || 'png'
                const fileName = `${userId}/${boardId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('inspiration_assets')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('inspiration_assets')
                    .getPublicUrl(fileName)

                return {
                    id: `asset:${Date.now()}` as TLAssetId,
                    type: 'image',
                    typeName: 'asset',
                    props: {
                        name: file.name,
                        src: publicUrl,
                        w: 100,
                        h: 100,
                        isAnimated: false,
                        mimeType: file.type,
                    },
                    meta: {}
                } as any
            } catch (error) {
                console.error('Asset upload error:', error)
                toast.error('Failed to upload image')
                throw error
            }
        })
    }, [boardId, supabase, userId])

    if (isLoading || !store) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center fade-in bg-[#F9FAFB] dark:bg-[#121212]">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading Canvas...</p>
            </div>
        )
    }

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <CanvasErrorBoundary>
                <Tldraw
                    store={store}
                    onMount={handleMount}
                />
            </CanvasErrorBoundary>
        </div>
    )
}
