'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Tldraw, useEditor, getSnapshot, loadSnapshot, Editor, TLAssetId } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Moved OUTSIDE to prevent React from recreating it on every render, which crashes Tldraw
const SyncState = ({ boardId, initialData }: { boardId: string, initialData: any }) => {
    const editor = useEditor()
    const [isSaving, setIsSaving] = useState(false)
    const supabase = createClient()
    const isLoadedRef = useRef(false)

    useEffect(() => {
        if (!editor) return

        if (!isLoadedRef.current) {
            isLoadedRef.current = true
            if (initialData && Object.keys(initialData).length > 0 && initialData.store) {
                try {
                    loadSnapshot(editor.store, initialData.store)
                } catch (e) {
                    console.error("Failed to load initial data snapshot:", e)
                }
            }
        }

        let timeoutId: NodeJS.Timeout

        const handleChange = () => {
            clearTimeout(timeoutId)
            setIsSaving(true)
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
                    console.error("Failed to save snapshot to Supabase:", saveError)
                } finally {
                    setIsSaving(false)
                }
            }, 1000)
        }

        const unlisten = editor.store.listen(handleChange, { scope: 'document' })

        return () => {
            unlisten()
            clearTimeout(timeoutId)
        }
    }, [editor, boardId, initialData, supabase])

    return (
        <div className="absolute bottom-4 right-4 z-[9999] pointer-events-none fade-in">
            {isSaving ? (
                <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground bg-background/80 px-2 flex py-1 rounded-md backdrop-blur shadow-sm items-center gap-1.5 border border-border/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> Saving...
                </span>
            ) : (
                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-500 bg-background/80 px-2 flex py-1 rounded-md backdrop-blur shadow-sm items-center gap-1.5 border border-border/50 opacity-50 duration-500 ease-in-out">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Saved
                </span>
            )}
        </div>
    )
}

export function InspirationCanvas({ boardId, userId }: { boardId: string; userId: string }) {
    const supabase = createClient()
    const [initialData, setInitialData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Fetch initial state
    useEffect(() => {
        const fetchBoard = async () => {
            const { data, error } = await supabase
                .from('inspiration_boards')
                .select('canvas_state')
                .eq('id', boardId)
                .single()

            if (error) {
                toast.error('Failed to load board')
            } else if (data && data.canvas_state && Object.keys(data.canvas_state).length > 0) {
                setInitialData(data.canvas_state)
            } else {
                setInitialData({})
            }
            setIsLoading(false)
        }
        fetchBoard()
    }, [boardId, supabase])

    const handleMount = (editor: Editor) => {
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

                // Return native asset object referencing the cloud URL
                return {
                    id: `asset:${Date.now()}` as TLAssetId,
                    type: 'image',
                    typeName: 'asset',
                    props: {
                        name: file.name,
                        src: publicUrl,
                        w: 100, // Tldraw will auto-calculate actual dimensions based on src
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
    }

    if (isLoading) return <div className="w-full h-full flex flex-col items-center justify-center fade-in bg-[#F9FAFB] dark:bg-[#121212]"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" /><p className="text-sm font-medium text-muted-foreground animate-pulse">Loading Canvas...</p></div>

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <Tldraw
                persistenceKey={undefined}
                onMount={handleMount}
                options={{ maxPages: 1 }}
                inferDarkMode
            >
                <SyncState boardId={boardId} initialData={initialData} />
            </Tldraw>
        </div>
    )
}
