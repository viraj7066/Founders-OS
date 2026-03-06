'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { createClient } from '@/lib/supabase/client'

interface InspirationCanvasProps {
    boardId: string
    userId: string
    initialSnapshot?: any
}

export function InspirationCanvas({ boardId, userId, initialSnapshot }: InspirationCanvasProps) {
    const supabaseRef = useRef(createClient())
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const mountedRef = useRef(true)

    // Translate the database snapshot to Excalidraw format.
    // Since Excalidraw uses a completely different format than Tldraw,
    // if the existing snapshot is a Tldraw format, we simply start with a blank canvas.
    const [excalidrawInitialData] = useState(() => {
        if (!initialSnapshot) return null;

        // Excalidraw format typically has 'elements' array
        if (Array.isArray(initialSnapshot.elements)) {
            return {
                elements: initialSnapshot.elements,
                appState: initialSnapshot.appState,
                files: initialSnapshot.files
            }
        }

        // Return null to start fresh if it's the old invalid format
        return null;
    })

    const handleChange = useCallback((elements: any, appState: any, files: any) => {
        if (!mountedRef.current) return
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

        // Excalidraw's appState has lots of ephemeral UI state (like scroll position).
        // To save space and network bandwidth, we only really need to save elements and files.
        saveTimerRef.current = setTimeout(async () => {
            if (!mountedRef.current) return
            try {
                // To keep database size reasonable, only save necessary fields
                const canvasState = {
                    elements,
                    files
                }

                await supabaseRef.current
                    .from('inspiration_boards')
                    .update({
                        canvas_state: canvasState,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', boardId)
            } catch (err) {
                console.error('[Canvas] Auto-save error:', err)
            }
        }, 3000)
    }, [boardId])

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [])

    return (
        <div
            className="excalidraw-wrapper"
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 0,
            }}
        >
            {/* 
                COMPREHENSIVE TAILWIND PREFLIGHT RESET
                Tailwind globally breaks third-party UI libraries by aggressively styled:
                - svgs (massively scaled up)
                - buttons (removes backgrounds/borders)
                - box-sizing
                We must forcefully revert these inside the Excalidraw container.
            */}
            <style>{`
                /* 1. Fix massive SVG icons */
                .excalidraw-wrapper .excalidraw svg {
                    display: inline-block !important;
                    vertical-align: baseline !important;
                    max-width: none !important;
                    height: auto !important;
                }
                
                /* 2. Fix transparent/invisible buttons and inputs */
                .excalidraw-wrapper .excalidraw button,
                .excalidraw-wrapper .excalidraw input,
                .excalidraw-wrapper .excalidraw select {
                    background-color: transparent;
                    border-width: auto;
                    border-style: solid;
                    border-color: initial;
                    padding: initial;
                }

                /* 3. Ensure panels compute correct heights */
                .excalidraw-wrapper .excalidraw * {
                    box-sizing: border-box;
                }

                /* 4. Force white background so it doesn't inherit dark mode transparents */
                .excalidraw-wrapper .excalidraw-container {
                    background-color: #ffffff !important;
                    color: #1a1a1a !important;
                }
            `}</style>

            <Excalidraw
                initialData={excalidrawInitialData || undefined}
                onChange={handleChange}
                theme="light"
            />
        </div>
    )
}
