'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Tldraw, getSnapshot, Editor, TLAssetId } from 'tldraw'
import 'tldraw/tldraw.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const TLDRAW_VERSION = '4.4.0'
const ASSET_URLS = {
    fonts: {
        monospace: `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/fonts/IBMPlexMono-Medium.woff2`,
        sansSerif: `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/fonts/IBMPlexSans-Medium.woff2`,
        serif: `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/fonts/IBMPlexSerif-Medium.woff2`,
        draw: `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/fonts/ShantellSans-Normal-SemiBold.woff2`,
    },
    icons: {
        'align-bottom': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/align-bottom.svg`,
        'align-center-horizontal': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/align-center-horizontal.svg`,
        'align-center-vertical': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/align-center-vertical.svg`,
        'align-left': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/align-left.svg`,
        'align-right': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/align-right.svg`,
        'align-top': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/align-top.svg`,
        'arrow-left': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/arrow-left.svg`,
        'arrow-up': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/arrow-up.svg`,
        'back': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/back.svg`,
        'check': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/check.svg`,
        'chevron-down': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/chevron-down.svg`,
        'chevron-left': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/chevron-left.svg`,
        'chevron-right': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/chevron-right.svg`,
        'chevron-up': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/chevron-up.svg`,
        'close': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/close.svg`,
        'col-2': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/col-2.svg`,
        'copy': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/copy.svg`,
        'crosshair': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/crosshair.svg`,
        'cursor': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/cursor.svg`,
        'dag': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/dag.svg`,
        'device-desktop': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/device-desktop.svg`,
        'device-mobile': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/device-mobile.svg`,
        'device-tablet': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/device-tablet.svg`,
        'distribute-horizontal': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/distribute-horizontal.svg`,
        'distribute-vertical': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/distribute-vertical.svg`,
        'dot': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/dot.svg`,
        'download': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/download.svg`,
        'duplicate': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/duplicate.svg`,
        'edit': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/edit.svg`,
        'external-link': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/external-link.svg`,
        'eye-closed': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/eye-closed.svg`,
        'eye-open': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/eye-open.svg`,
        'file': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/file.svg`,
        'fill': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/fill.svg`,
        'folder': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/folder.svg`,
        'follow': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/follow.svg`,
        'following': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/following.svg`,
        'freeze': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/freeze.svg`,
        'geo-arrow-down': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/geo-arrow-down.svg`,
        'geo-arrow-left': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/geo-arrow-left.svg`,
        'geo-arrow-right': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/geo-arrow-right.svg`,
        'geo-arrow-up': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/geo-arrow-up.svg`,
        'grid': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/grid.svg`,
        'group': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/group.svg`,
        'help': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/help.svg`,
        'image': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/image.svg`,
        'info': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/info.svg`,
        'layers': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/layers.svg`,
        'line': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/line.svg`,
        'lock': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/lock.svg`,
        'menu': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/menu.svg`,
        'minus': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/minus.svg`,
        'more': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/more.svg`,
        'move': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/move.svg`,
        'page': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/page.svg`,
        'plus': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/plus.svg`,
        'question': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/question.svg`,
        'redo': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/redo.svg`,
        'reset': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/reset.svg`,
        'rotate-ccw': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/rotate-ccw.svg`,
        'rotate-cw': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/rotate-cw.svg`,
        'save': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/save.svg`,
        'search': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/search.svg`,
        'send': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/send.svg`,
        'settings': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/settings.svg`,
        'share': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/share.svg`,
        'trash': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/trash.svg`,
        'undo': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/undo.svg`,
        'ungroup': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/ungroup.svg`,
        'unlock': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/unlock.svg`,
        'zoom-in': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/zoom-in.svg`,
        'zoom-out': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/icons/icon/zoom-out.svg`,
    },
    animations: {
        'background': `https://unpkg.com/@tldraw/assets@${TLDRAW_VERSION}/animations/background.webp`,
    }
}

interface InspirationCanvasProps {
    boardId: string
    userId: string
    initialSnapshot?: any
}

export function InspirationCanvas({ boardId, userId, initialSnapshot }: InspirationCanvasProps) {
    const supabaseRef = useRef(createClient())
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const storeListenerRef = useRef<(() => void) | null>(null)

    // STRICT CLIENT RENDER GUARD - Prevent hydration mismatch errors and Vercel dual-pass glitches
    const [isMounted, setIsMounted] = useState(false)
    // Freeze the snapshot reference so Next.js re-renders don't trigger a full Tldraw store reboot!
    const [frozenSnapshot] = useState(initialSnapshot)

    useEffect(() => { setIsMounted(true) }, [])

    function handleMount(editor: Editor) {
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

        // Auto-save logic
        if (storeListenerRef.current) storeListenerRef.current()
        storeListenerRef.current = editor.store.listen(() => {
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
                    console.error('[InspirationCanvas] Auto-save error:', err)
                }
            }, 1000)
        }, { scope: 'document' })
    }

    useEffect(() => {
        return () => {
            storeListenerRef.current?.()
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [])

    if (!isMounted) return null

    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <Tldraw
                snapshot={frozenSnapshot}
                onMount={handleMount}
                autoFocus
                assetUrls={ASSET_URLS}
            />
        </div>
    )
}
