'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DocumentFolders, DocumentFolder } from '@/components/documents/document-folders'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, LayoutGrid, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Board {
    id: string
    name: string
    folder_id: string
    updated_at: string
}

export default function InspirationPage() {
    const router = useRouter()
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    const [userId, setUserId] = useState<string | null>(null)
    const [folders, setFolders] = useState<DocumentFolder[]>([])
    const [boards, setBoards] = useState<Board[]>([])
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [newBoardName, setNewBoardName] = useState('')

    useEffect(() => {
        let cancelled = false
        async function fetchData() {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                const uid = session?.user?.id
                if (!uid || cancelled) return

                setUserId(uid)

                const [foldersRes, boardsRes] = await Promise.all([
                    supabase.from('document_folders')
                        .select('*').eq('user_id', uid).eq('type', 'inspiration')
                        .order('created_at', { ascending: false }),
                    supabase.from('inspiration_boards')
                        .select('id, name, folder_id, updated_at').eq('user_id', uid)
                        .order('updated_at', { ascending: false })
                ])
                if (cancelled) return
                if (foldersRes.data) setFolders(foldersRes.data)
                if (boardsRes.data) setBoards(boardsRes.data)
            } catch (err) {
                console.error('[InspirationPage]', err)
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        fetchData()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleCreateFolder = async (name: string) => {
        const { data, error } = await supabase.from('document_folders')
            .insert({ user_id: userId, name, type: 'inspiration' }).select().single()
        if (error) { toast.error('Failed to create folder'); return }
        if (data) { setFolders(prev => [data, ...prev]); toast.success('Folder created!') }
    }

    const handleDeleteFolder = async (folderId: string) => {
        const { error } = await supabase.from('document_folders').delete().eq('id', folderId)
        if (error) { toast.error('Failed to delete folder'); return }
        setFolders(prev => prev.filter(f => f.id !== folderId))
        toast.success('Folder deleted')
    }

    const handleRenameFolder = async (folderId: string, newName: string) => {
        const { error } = await supabase.from('document_folders').update({ name: newName }).eq('id', folderId)
        if (error) { toast.error('Failed to rename folder'); return }
        setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f))
        toast.success('Folder renamed')
    }

    const handleCreateBoard = async () => {
        if (!newBoardName.trim() || !activeFolderId) return
        const targetFolderId = activeFolderId === 'all' ? null : activeFolderId
        const { data, error } = await supabase.from('inspiration_boards')
            .insert({ user_id: userId, folder_id: targetFolderId, name: newBoardName.trim() })
            .select('id, name, folder_id, updated_at').single()
        if (error) { toast.error('Failed to create board'); return }
        if (data) { setBoards(prev => [data, ...prev]); setNewBoardName(''); toast.success('Board created!') }
    }

    const handleDeleteBoard = async (e: React.MouseEvent, boardId: string) => {
        e.stopPropagation()
        const { error } = await supabase.from('inspiration_boards').delete().eq('id', boardId)
        if (error) { toast.error('Failed to delete board'); return }
        setBoards(prev => prev.filter(b => b.id !== boardId))
        toast.success('Board deleted')
    }

    // Open board on its own isolated route — no parent state changes can kill it
    const openBoard = (boardId: string) => {
        router.push(`/dashboard/inspiration/${boardId}`)
    }

    const getItemCount = (folderId: string) => boards.filter(b => b.folder_id === folderId).length
    const displayedBoards = activeFolderId === 'all'
        ? boards
        : activeFolderId ? boards.filter(b => b.folder_id === activeFolderId) : []
    const activeFolderName = activeFolderId === 'all'
        ? 'All Boards'
        : folders.find(f => f.id === activeFolderId)?.name

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {activeFolderId ? activeFolderName : 'Moodboards'}
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
                            <Button
                                variant="ghost"
                                className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                                onClick={() => setActiveFolderId(null)}
                            >
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
                                        onClick={() => openBoard(board.id)}
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
    )
}
