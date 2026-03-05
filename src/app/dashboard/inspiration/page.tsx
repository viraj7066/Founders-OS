'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DocumentFolders, DocumentFolder } from '@/components/documents/document-folders'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, LayoutGrid, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

// Dynamically import the heavyweight canvas — avoids SSR issues with Tldraw CSS
const InspirationCanvas = dynamic(
    () => import('@/components/inspiration/inspiration-canvas').then(m => m.InspirationCanvas),
    { ssr: false, loading: () => null }
)

interface Board {
    id: string
    name: string
    folder_id: string
    updated_at: string
}

export const dynamic_param = 'force-dynamic'

export default function InspirationPage() {
    const supabase = createClient()
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [folders, setFolders] = useState<DocumentFolder[]>([])
    const [boards, setBoards] = useState<Board[]>([])
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
    const [activeBoard, setActiveBoard] = useState<Board | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [newBoardName, setNewBoardName] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setIsLoading(false); return }
            setUserId(user.id)

            const [foldersRes, boardsRes] = await Promise.all([
                supabase.from('document_folders').select('*').eq('user_id', user.id).eq('type', 'inspiration').order('created_at', { ascending: false }),
                supabase.from('inspiration_boards').select('id, name, folder_id, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false })
            ])

            if (foldersRes.data) setFolders(foldersRes.data)
            if (boardsRes.data) setBoards(boardsRes.data)
            setIsLoading(false)
        }
        fetchData()

        // Listen for auth sign-out so we redirect gracefully instead of
        // the middleware silently kicking the user while on the canvas
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') router.push('/login')
        })
        return () => subscription.unsubscribe()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleCreateFolder = async (name: string) => {
        const { data, error } = await supabase.from('document_folders').insert({ user_id: userId, name, type: 'inspiration' }).select().single()
        if (error) { toast.error('Failed to create folder'); return }
        if (data) { setFolders([data, ...folders]); toast.success('Folder created!') }
    }

    const handleDeleteFolder = async (folderId: string) => {
        const { error } = await supabase.from('document_folders').delete().eq('id', folderId)
        if (error) { toast.error('Failed to delete folder'); return }
        setFolders(folders.filter(f => f.id !== folderId))
        toast.success('Folder deleted')
    }

    const handleRenameFolder = async (folderId: string, newName: string) => {
        const { error } = await supabase.from('document_folders').update({ name: newName }).eq('id', folderId)
        if (error) { toast.error('Failed to rename folder'); return }
        setFolders(folders.map(f => f.id === folderId ? { ...f, name: newName } : f))
        toast.success('Folder renamed')
    }

    const handleCreateBoard = async () => {
        if (!newBoardName.trim() || !activeFolderId) return
        const targetFolderId = activeFolderId === 'all' ? null : activeFolderId

        const { data, error } = await supabase.from('inspiration_boards').insert({
            user_id: userId, folder_id: targetFolderId, name: newBoardName.trim()
        }).select('id, name, folder_id, updated_at').single()

        if (error) { toast.error('Failed to create board'); return }
        if (data) { setBoards([data, ...boards]); setNewBoardName(''); toast.success('Board created!') }
    }

    const handleDeleteBoard = async (e: React.MouseEvent, boardId: string) => {
        e.stopPropagation()
        const { error } = await supabase.from('inspiration_boards').delete().eq('id', boardId)
        if (error) { toast.error('Failed to delete board'); return }
        setBoards(boards.filter(b => b.id !== boardId))
        if (activeBoard?.id === boardId) setActiveBoard(null)
        toast.success('Board deleted')
    }

    const getItemCount = (folderId: string) => boards.filter(b => b.folder_id === folderId).length
    const displayedBoards = activeFolderId === 'all' ? boards : activeFolderId ? boards.filter(b => b.folder_id === activeFolderId) : []
    const activeFolderName = activeFolderId === 'all' ? 'All Boards' : folders.find(f => f.id === activeFolderId)?.name

    return (
        <>
            {/*
             * ── Canvas overlay ────────────────────────────────────────────────────────────
             * CRITICAL: We mount this ONCE and KEEP it mounted at all times using CSS.
             * Hiding it via display:none / display:block instead of conditional rendering
             * ensures Tldraw's internal DOM and React tree are never destroyed.
             */}
            {activeBoard && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Board header */}
                    <div className="h-14 border-b border-border/50 bg-background/90 backdrop-blur flex items-center gap-3 px-4 shrink-0 z-10">
                        <Button variant="ghost" size="icon" onClick={() => setActiveBoard(null)} className="h-8 w-8">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <span className="font-semibold text-foreground">{activeBoard.name}</span>
                    </div>

                    {/* Canvas — takes all remaining height */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        {userId && (
                            <InspirationCanvas boardId={activeBoard.id} userId={userId} />
                        )}
                    </div>
                </div>
            )}

            {/* ── Standard page layout (always rendered, scrollable) ── */}
            <DashboardLayout>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            {activeFolderId ? activeFolderName : 'Inspiration Boards'}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {activeFolderId
                                ? 'Infinite canvas for your ideas, moodboards, and wireframes.'
                                : 'Organize your creative vision into folders.'}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="animate-pulse flex gap-4">
                            <div className="w-32 h-32 bg-secondary rounded-xl" />
                            <div className="w-32 h-32 bg-secondary rounded-xl" />
                        </div>
                    ) : !activeFolderId ? (
                        <DocumentFolders
                            folders={folders}
                            type="inspiration"
                            onFolderClick={setActiveFolderId}
                            onCreateFolder={handleCreateFolder}
                            getItemCount={getItemCount}
                            onDeleteFolder={handleDeleteFolder}
                            onRenameFolder={handleRenameFolder}
                        />
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => setActiveFolderId(null)}>
                                    <ChevronLeft className="w-4 h-4" /> Back to Folders
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="New board name..."
                                        value={newBoardName}
                                        onChange={e => setNewBoardName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCreateBoard()}
                                        className="w-48 h-9"
                                    />
                                    <Button onClick={handleCreateBoard} disabled={!newBoardName.trim()} className="h-9 gap-2">
                                        <Plus className="w-4 h-4" /> Create Board
                                    </Button>
                                </div>
                            </div>

                            {displayedBoards.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-secondary/20">
                                    <LayoutGrid className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium">No boards here</h3>
                                    <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
                                        Create a board to start dropping inspiration and ideas.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {displayedBoards.map(board => (
                                        <div
                                            key={board.id}
                                            onClick={() => setActiveBoard(board)}
                                            className="group cursor-pointer relative bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col aspect-video justify-between"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                                    <LayoutGrid className="w-5 h-5" />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => handleDeleteBoard(e, board.id)}
                                                    className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-foreground truncate">{board.name}</h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Updated {new Date(board.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </>
    )
}
