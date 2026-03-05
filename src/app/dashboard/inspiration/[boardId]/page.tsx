// SERVER COMPONENT — reads auth from cookies, passes userId to client canvas
// No 'use client' — this runs on the server before anything reaches the browser
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoardCanvas } from './board-canvas'

interface Props {
    params: Promise<{ boardId: string }>
}

export default async function BoardPage({ params }: Props) {
    const { boardId } = await params

    // Validate session server-side using cookies — zero client-side timing issues
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch board name server-side too
    const { data: board } = await supabase
        .from('inspiration_boards')
        .select('name')
        .eq('id', boardId)
        .eq('user_id', user.id)
        .single()

    if (!board) {
        redirect('/dashboard/inspiration')
    }

    // Pass stable, server-validated data to the client canvas component
    return (
        <BoardCanvas
            boardId={boardId}
            userId={user.id}
            boardName={board.name}
        />
    )
}
