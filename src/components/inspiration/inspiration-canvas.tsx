'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
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
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                // Excalidraw requires the container to have layout context
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* 
                CRITICAL FIX FOR TAILWIND: 
                Tailwind's preflight forces `img, svg { display: block; vertical-align: middle; }` 
                and `svg { height: auto; max-width: 100%; }`
                This completely breaks Excalidraw's UI icons, making them massive.
                We must explicitly revert SVG styles within the Excalidraw wrapper.
            */}
            <style>{`
                .excalidraw-wrapper .excalidraw svg {
                    display: inline-block;
                    vertical-align: baseline;
                    max-width: none;
                    height: auto;
                }
                
                /* Some Excalidraw toolbars compute height dynamically,
                   Tailwind's max-width: 100% overrides their pixel widths */
                .excalidraw-wrapper .excalidraw * {
                    box-sizing: border-box;
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
