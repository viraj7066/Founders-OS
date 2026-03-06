'use client'

import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode, useMemo } from 'react'
import { Tldraw, getSnapshot, loadSnapshot, Editor, TLAssetId, createTLStore, defaultShapeUtils } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ─── Debug Logger ────────────────────────────────────────────────────────────
const LOGS: string[] = []
function debugLog(msg: string) {
    const time = new Date().toLocaleTimeString()
    console.log(`[CanvasDebug] ${time}: ${msg}`)
    LOGS.push(`${time}: ${msg}`)
    if (LOGS.length > 30) LOGS.shift()
}

// ─── Error Boundary ────────────────────────────────────────────────────────────
class CanvasErrorBoundary extends Component<
    { children: ReactNode; onCrash: (msg: string) => void },
    { hasError: boolean; message: string }
> {
    state = { hasError: false, message: '' }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, message: error?.message ?? 'Unknown crash' }
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        debugLog(`CRITICAL CRASH: ${error.message}`)
        this.props.onCrash(error.message)
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#1a0505', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>💥</div>
                    <h2 style={{ fontSize: 20, marginBottom: 8, color: '#ff4444' }}>Canvas Logic Crash</h2>
                    <p style={{ color: '#aaa', fontSize: 13, marginBottom: 24, maxWidth: 400, fontFamily: 'monospace' }}>{this.state.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ padding: '12px 24px', background: '#ff4444', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Force Restart Engine
                    </button>
                    <p style={{ marginTop: 24, fontSize: 12, color: '#555' }}>This error was caught by the emergency boundary.</p>
                </div>
            )
        }
        return this.props.children
    }
}

// ─── Main Component ─────────────────────────────────────────────────────────────────
interface InspirationCanvasProps {
    boardId: string
    userId: string
    initialSnapshot?: any
}

export function InspirationCanvas({ boardId, userId, initialSnapshot }: InspirationCanvasProps) {
    const [renderLogs, setRenderLogs] = useState<string[]>([])
    const [crashMessage, setCrashMessage] = useState<string | null>(null)
    const [isStrictlyClient, setIsStrictlyClient] = useState(false)
    const [renderCount, setRenderCount] = useState(0)

    const supabaseRef = useRef(createClient())
    const editorRef = useRef<Editor | null>(null)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const mountedRef = useRef(true)

    // Sync local logs to state for UI display
    useEffect(() => {
        const interval = setInterval(() => {
            setRenderLogs([...LOGS])
        }, 500)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        debugLog('Component mounted (Client-side)')
        setIsStrictlyClient(true)
        mountedRef.current = true
        return () => {
            debugLog('Component unmounting')
            mountedRef.current = false
        }
    }, [])

    useEffect(() => {
        setRenderCount(c => c + 1)
        debugLog(`Render #${renderCount + 1}`)
    }, [boardId, userId, initialSnapshot])

    // Fixed store creation — stable reference
    const store = useMemo(() => {
        if (typeof window === 'undefined') return null
        debugLog('Initializing TLStore...')
        try {
            const freshStore = createTLStore({ shapeUtils: defaultShapeUtils })
            if (initialSnapshot) {
                debugLog('Loading initial snapshot...')
                loadSnapshot(freshStore, initialSnapshot)
                debugLog('Snapshot loaded successfully')
            } else {
                debugLog('No snapshot found, using empty board')
            }
            return freshStore
        } catch (err: any) {
            debugLog(`STORE INIT ERROR: ${err.message}`)
            return null
        }
    }, [initialSnapshot])

    function handleMount(editor: Editor) {
        debugLog('Tldraw onMount triggered')
        editorRef.current = editor

        // Image upload handler
        editor.registerExternalAssetHandler('file', async ({ file }) => {
            debugLog(`Uploading file: ${file.name}`)
            try {
                const ext = file.name.split('.').pop() ?? 'png'
                const path = `${userId}/${boardId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
                const { error } = await supabaseRef.current.storage
                    .from('inspiration_assets').upload(path, file)
                if (error) throw error
                const { data: { publicUrl } } = supabaseRef.current.storage
                    .from('inspiration_assets').getPublicUrl(path)
                debugLog('Upload successful')
                return {
                    id: `asset:${crypto.randomUUID()}` as TLAssetId,
                    type: 'image' as const,
                    typeName: 'asset' as const,
                    props: { name: file.name, src: publicUrl, w: 800, h: 600, isAnimated: false, mimeType: file.type },
                    meta: {},
                }
            } catch (err: any) {
                debugLog(`UPLOAD ERROR: ${err.message}`)
                toast.error('Image upload failed')
                throw err
            }
        })

        // Auto-save logic
        editor.store.listen(() => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            saveTimerRef.current = setTimeout(async () => {
                if (!editorRef.current || !mountedRef.current) return
                try {
                    const snap = getSnapshot(editorRef.current.store)
                    const { error } = await supabaseRef.current
                        .from('inspiration_boards')
                        .update({
                            canvas_state: { store: snap },
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', boardId)
                    if (error) debugLog(`AUTO-SAVE ERROR: ${error.message}`)
                } catch (err: any) {
                    debugLog(`AUTO-SAVE EXCEPTION: ${err.message}`)
                }
            }, 2000)
        }, { scope: 'document' })
    }

    if (!isStrictlyClient) return null

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            background: '#ff0000', // DEBUG: If this red shows up, the container is visible
            overflow: 'hidden'
        }}>
            <CanvasErrorBoundary onCrash={setCrashMessage}>
                {store ? (
                    <Tldraw
                        store={store}
                        onMount={handleMount}
                        autoFocus
                        inferDarkMode
                    />
                ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff' }}>
                        <p>Store failed to initialize. Check logs below.</p>
                    </div>
                )}
            </CanvasErrorBoundary>

            {/* DEBUG HUD — This will show us EXACTLY what's happening on Vercel */}
            <div style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                width: 320,
                maxHeight: 250,
                background: 'rgba(0,0,0,0.85)',
                color: '#00ff00',
                padding: 12,
                borderRadius: 8,
                fontSize: 10,
                fontFamily: 'monospace',
                zIndex: 100000,
                border: '1px solid #333',
                overflowY: 'auto',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
                <div style={{ borderBottom: '1px solid #333', paddingBottom: 4, marginBottom: 8, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                    <span>CANVAS DEBUG HUD</span>
                    <span style={{ color: crashMessage ? '#ff4444' : '#00ff00' }}>
                        {crashMessage ? 'CRASHED' : 'HEALTHY'}
                    </span>
                </div>
                <div>ID: {boardId.slice(0, 8)}...</div>
                <div>User: {userId.slice(0, 8)}...</div>
                <div>Snapshot: {initialSnapshot ? 'YES' : 'NO'}</div>
                <div>Renders: {renderCount}</div>
                <div style={{ marginTop: 8, borderTop: '1px solid #222', paddingTop: 4 }}>
                    {renderLogs.map((log, i) => (
                        <div key={i} style={{ marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>

            {/* If crash occurred but boundary didn't show, show this overlay */}
            {crashMessage && (
                <div style={{ position: 'fixed', top: 60, left: 20, right: 20, background: '#ff4444', color: '#fff', padding: 12, borderRadius: 8, zIndex: 100001, fontSize: 13, fontWeight: 'bold' }}>
                    DETECTED CRASH: {crashMessage}
                </div>
            )}
        </div>
    )
}
