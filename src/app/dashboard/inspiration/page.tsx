'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DocumentFolders, DocumentFolder } from '@/components/documents/document-folders'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, LayoutGrid, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { InspirationCanvas } from '@/components/inspiration/inspiration-canvas'

interface Board {
    id: string
    name: string
    folder_id: string
    updated_at: string
}

export const dynamic = 'force-dynamic'

export default function InspirationPage() {
    const supabase = createClient()
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
            if (!user) {
                setIsLoading(false)
                return
            }
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
    }, [])

    const handleCreateFolder = async (name: string) => {
        const { data, error } = await supabase.from('document_folders').insert({
            user_id: userId,
            name,
            type: 'inspiration'
        }).select().single()

        if (error) { toast.error('Failed to create folder'); return }
        if (data) {
            setFolders([data, ...folders])
            toast.success('Folder created successfully!')
        }
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
        if (!newBoardName.trim() || (!activeFolderId && activeFolderId !== 'all')) return
        const targetFolderId = activeFolderId === 'all' ? null : activeFolderId

        const { data, error } = await supabase.from('inspiration_boards').insert({
            user_id: userId,
            folder_id: targetFolderId,
            name: newBoardName.trim()
        }).select('id, name, folder_id, updated_at').single()

        if (error) { toast.error('Failed to create board'); return }
        if (data) {
            setBoards([data, ...boards])
            setNewBoardName('')
            toast.success('Board created!')
        }
    }

    const handleDeleteBoard = async (e: React.MouseEvent, boardId: string) => {
        e.stopPropagation()
        const { error } = await supabase.from('inspiration_boards').delete().eq('id', boardId)
        if (error) { toast.error('Failed to delete board'); return }
        setBoards(boards.filter(b => b.id !== boardId))
        toast.success('Board deleted')
    }

    const getItemCount = (folderId: string) => boards.filter(b => b.folder_id === folderId).length

    const displayedBoards = activeFolderId === 'all'
        ? boards
        : activeFolderId ? boards.filter(b => b.folder_id === activeFolderId) : []

    const activeFolderName = activeFolderId === 'all' ? 'All Boards' : folders.find(f => f.id === activeFolderId)?.name

    // If a board is active, render full-screen canvas (hide standard dashboard layout padding if possible, but keep layout)
    if (activeBoard) {
        return (
            <div className="h-screen w-full flex flex-col pt-16 md:pt-0 bg-[#F9FAFB] dark:bg-[#121212]">
                {/* Header for board */}
                <div className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 z-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setActiveBoard(null)} className="h-8 w-8 hover:bg-secondary">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div className="font-semibold">{activeBoard.name}</div>
                    </div>
                </div>
                {/* Canvas Area */}
                <div className="flex-1 w-full relative">
                    <InspirationCanvas boardId={activeBoard.id} userId={userId || ''} />
                </div>
            </div>
        )
    }

    return (
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
                    <div className="animate-pulse flex gap-4"><div className="w-32 h-32 bg-secondary rounded-xl" /><div className="w-32 h-32 bg-secondary rounded-xl" /></div>
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
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-secondary/20 fade-in">
                                <LayoutGrid className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                                <h3 className="text-lg font-medium">No boards here</h3>
                                <p className="text-sm text-muted-foreground mt-1 mb-4 text-center max-w-sm">
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
                                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
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
