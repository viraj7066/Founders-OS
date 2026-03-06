// SERVER COMPONENT — reads auth from cookies, passes userId to client canvas
import { createClient } from '@/lib/supabase/server'
import { BoardCanvas } from './board-canvas'
import { redirect } from 'next/navigation'

interface Props {
    params: Promise<{ boardId: string }>
}

export default async function BoardPage({ params }: Props) {
    const { boardId } = await params

    let debugReason = ''

    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
            debugReason = `AUTH_ERROR: ${authError.message}`
        } else if (!user) {
            debugReason = 'NO_USER: session not found'
            redirect('/login')
        } else {
            const { data: board, error: boardError } = await supabase
                .from('inspiration_boards')
                .select('name, canvas_state')
                .eq('id', boardId)
                .eq('user_id', user.id)
                .single()

            if (boardError) {
                debugReason = `BOARD_ERROR: ${boardError.message} (code: ${boardError.code})`
            } else if (!board) {
                debugReason = `BOARD_NOT_FOUND: boardId=${boardId} userId=${user.id}`
            } else {
                // SUCCESS — render canvas
                return (
                    <BoardCanvas
                        boardId={boardId}
                        userId={user.id}
                        boardName={board.name}
                        initialSnapshot={board.canvas_state?.store || null}
                    />
                )
            }
        }
    } catch (e: unknown) {
        debugReason = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`
    }

    // If we get here, something went wrong — show debug screen
    return (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'monospace', zIndex: 9999 }}>
            <h1 style={{ fontSize: 24, marginBottom: 16, color: '#ff4444' }}>⚠ Canvas Load Debug</h1>
            <p style={{ fontSize: 14, marginBottom: 8, color: '#aaa' }}>boardId: {boardId}</p>
            <div style={{ background: '#1a1a1a', padding: 16, borderRadius: 8, maxWidth: 600, width: '100%', marginBottom: 24 }}>
                <p style={{ fontSize: 14, color: '#ff8800', wordBreak: 'break-all' }}>{debugReason || 'Unknown failure reason'}</p>
            </div>
            <a href="/dashboard/inspiration" style={{ padding: '8px 16px', background: '#333', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
                ← Back to Boards
            </a>
        </div>
    )
}
