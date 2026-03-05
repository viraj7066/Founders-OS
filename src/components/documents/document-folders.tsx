'use client'

import React, { useState } from 'react'
import { Plus, Folder as FolderIcon, FileText, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'

export interface DocumentFolder {
    id: string
    name: string
    type: 'invoice' | 'contract' | 'inspiration'
    created_at: string
}

interface DocumentFoldersProps {
    folders: DocumentFolder[]
    type: 'invoice' | 'contract' | 'inspiration'
    onFolderClick: (folderId: string) => void
    onCreateFolder: (name: string) => Promise<void>
    getItemCount: (folderId: string) => number
    onDeleteFolder?: (folderId: string) => Promise<void>
    onRenameFolder?: (folderId: string, newName: string) => Promise<void>
}

// Framer Motion Variants for Orchestrated Animation
const folderContainerVar = {
    idle: { y: 0 },
    hover: { y: -8, transition: { type: 'spring', stiffness: 300, damping: 20 } }
} as const

const frontFlapVar = {
    idle: { rotateX: 0 },
    hover: {
        rotateX: -15,
        transition: { type: 'spring', stiffness: 350, damping: 25 }
    }
} as const

const paper1Var = {
    idle: { y: 4, x: -10, rotate: -4 },
    hover: {
        y: -4, x: -12, rotate: -6,
        transition: { type: 'spring', stiffness: 350, damping: 25 }
    }
} as const

const paper2Var = {
    idle: { y: 2, x: 5, rotate: 2 },
    hover: {
        y: -10, x: 8, rotate: 5,
        transition: { type: 'spring', stiffness: 350, damping: 25 }
    }
} as const

export function DocumentFolders({ folders, type, onFolderClick, onCreateFolder, getItemCount, onDeleteFolder, onRenameFolder }: DocumentFoldersProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Rename Dialog State
    const [isRenameOpen, setIsRenameOpen] = useState(false)
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
    const [editingFolderName, setEditingFolderName] = useState('')

    const handleCreate = async () => {
        if (!newFolderName.trim()) return
        setIsSaving(true)
        await onCreateFolder(newFolderName.trim())
        setNewFolderName('')
        setIsCreateOpen(false)
        setIsSaving(false)
    }

    const handleRename = async () => {
        if (!editingFolderName.trim() || !editingFolderId || !onRenameFolder) return
        setIsSaving(true)
        await onRenameFolder(editingFolderId, editingFolderName.trim())
        setIsRenameOpen(false)
        setEditingFolderId(null)
        setEditingFolderName('')
        setIsSaving(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Folders</h2>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2 bg-secondary/50 border-border text-foreground hover:bg-secondary">
                            <Plus className="w-4 h-4" /> New Folder
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle>Create New {type === 'invoice' ? 'Invoice' : type === 'contract' ? 'Contract' : 'Inspiration'} Folder</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Folder Name</Label>
                                <Input
                                    placeholder="e.g. 2024 Retainers"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={isSaving || !newFolderName.trim()} className="bg-primary hover:bg-primary/90">
                                {isSaving ? 'Creating...' : 'Create Folder'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-secondary/20 fade-in">
                    <FolderIcon className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">No folders yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4 text-center max-w-sm">
                        Create your first folder to start organizing your {type}s by client, project, or date.
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="gap-2">
                        <Plus className="w-4 h-4" /> Create Folder
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* "All Documents" Default Folder */}
                    <div
                        onClick={() => onFolderClick('all')}
                        className="group cursor-pointer flex flex-col items-center gap-3 fade-in"
                        style={{ animationDelay: '0ms' }}
                    >
                        <motion.div
                            className="relative w-full aspect-[1.25] max-w-[200px] mx-auto [perspective:1000px] mt-2 filter drop-shadow-md"
                            variants={folderContainerVar}
                            initial="idle"
                            whileHover="hover"
                        >
                            {/* Back Folder Container */}
                            <div className="absolute inset-x-0 bottom-0 h-[80%] bg-[#242528] rounded-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />

                            {/* Papers */}
                            <div className="absolute inset-x-0 bottom-[10%] h-[75%] flex justify-center items-end opacity-90 transition-opacity group-hover:opacity-100">
                                <motion.div
                                    variants={paper1Var}
                                    className="absolute bottom-0 w-[55%] h-full bg-white rounded-lg shadow border border-gray-100 p-2.5 flex flex-col pt-3"
                                    style={{ transformOrigin: 'bottom left' }}
                                >
                                    <div className="w-[80%] h-1.5 bg-gray-200 rounded-full mb-1.5" />
                                    <div className="w-[60%] h-1.5 bg-gray-200 rounded-full" />
                                </motion.div>
                                <motion.div
                                    variants={paper2Var}
                                    className="absolute bottom-0 w-[55%] h-full bg-[#f8f9fa] rounded-lg shadow-md border border-gray-100 p-2.5 flex flex-col pt-3"
                                    style={{ transformOrigin: 'bottom right' }}
                                >
                                    <div className="flex justify-end mb-2">
                                        <div className="bg-[#1A1A1D] text-white text-[7px] font-bold px-1 py-0.5 rounded shadow-sm">PDF</div>
                                    </div>
                                    <div className="w-[85%] h-1.5 bg-gray-200 rounded-full mb-1.5" />
                                    <div className="w-[90%] h-1.5 bg-gray-200 rounded-full mb-1.5" />
                                    <div className="w-[45%] h-1.5 bg-gray-200 rounded-full" />
                                </motion.div>
                            </div>

                            {/* Front Flap */}
                            <motion.div
                                variants={frontFlapVar}
                                className="absolute inset-x-0 bottom-0 h-[80%] origin-bottom z-10 drop-shadow-xl"
                            >
                                <svg viewBox="0 0 200 130" className="w-full h-full text-[#303136] transition-colors group-hover:text-[#34353A]" preserveAspectRatio="none">
                                    <path fill="currentColor" d="M 0 130 L 0 12 Q 0 0 12 0 L 70 0 C 85 0 90 28 110 28 L 188 28 Q 200 28 200 40 L 200 130 Z" />
                                    <path fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" d="M 1 129 L 1 12 Q 1 1 12 1 L 70 1 C 85 1 90 29 110 29 L 188 29 Q 199 29 199 40" />
                                </svg>

                                <div className="absolute bottom-3 left-4 flex -space-x-1.5">
                                    <div className="w-5 h-5 rounded-full bg-white border border-[#303136] flex items-center justify-center overflow-hidden z-20 shadow-sm relative">
                                        <div className="absolute w-full h-full bg-gradient-to-br from-green-400 via-yellow-400 to-blue-500 opacity-20" />
                                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm transform rotate-45 relative z-10" />
                                    </div>
                                    <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center z-10 shadow-sm">
                                        <span className="text-foreground text-[7px] font-bold tracking-tighter">ALL</span>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                        <div className="text-center">
                            <h3 className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors">Everything</h3>
                            <p className="text-xs text-muted-foreground font-medium">View All</p>
                        </div>
                    </div>

                    {folders.map((folder, idx) => {
                        const count = getItemCount(folder.id)
                        return (
                            <div
                                key={folder.id}
                                onClick={() => onFolderClick(folder.id)}
                                className="group cursor-pointer flex flex-col items-center gap-3 fade-in"
                                style={{ animationDelay: `${(idx + 1) * 50}ms` }}
                            >
                                <motion.div
                                    className="relative w-full aspect-[1.25] max-w-[200px] mx-auto [perspective:1000px] mt-2 filter drop-shadow-md"
                                    variants={folderContainerVar}
                                    initial="idle"
                                    whileHover="hover"
                                >
                                    {/* Back Folder Container */}
                                    <div className="absolute inset-x-0 bottom-0 h-[80%] bg-secondary rounded-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />

                                    {/* Simulated Paper Peeking (Only shows if there are files) */}
                                    {count > 0 && (
                                        <div className="absolute inset-x-0 bottom-[10%] h-[75%] flex justify-center items-end opacity-90 transition-opacity group-hover:opacity-100">
                                            <motion.div
                                                variants={paper1Var}
                                                className="absolute bottom-0 w-[55%] h-full bg-white rounded-lg shadow border border-gray-100 p-2.5 flex flex-col pt-3"
                                                style={{ transformOrigin: 'bottom left' }}
                                            >
                                                <div className="w-[80%] h-1.5 bg-gray-200 rounded-full mb-1.5" />
                                                <div className="w-[60%] h-1.5 bg-gray-200 rounded-full" />
                                            </motion.div>
                                            <motion.div
                                                variants={paper2Var}
                                                className="absolute bottom-0 w-[55%] h-full bg-[#f8f9fa] rounded-lg shadow-md border border-gray-100 p-2.5 flex flex-col pt-3"
                                                style={{ transformOrigin: 'bottom right' }}
                                            >
                                                <div className="flex justify-end mb-2">
                                                    <div className="bg-foreground text-background text-[7px] font-bold px-1 py-0.5 rounded shadow-sm">PDF</div>
                                                </div>
                                                <div className="w-[85%] h-1.5 bg-gray-200 rounded-full mb-1.5" />
                                                <div className="w-[90%] h-1.5 bg-gray-200 rounded-full mb-1.5" />
                                                <div className="w-[45%] h-1.5 bg-gray-200 rounded-full" />
                                            </motion.div>
                                        </div>
                                    )}

                                    {/* Front Flap */}
                                    <motion.div
                                        variants={frontFlapVar}
                                        className="absolute inset-x-0 bottom-0 h-[80%] origin-bottom z-10 drop-shadow-xl"
                                    >
                                        <svg viewBox="0 0 200 130" className="w-full h-full text-[#303136] transition-colors group-hover:text-[#34353A]" preserveAspectRatio="none">
                                            <path fill="currentColor" d="M 0 130 L 0 12 Q 0 0 12 0 L 70 0 C 85 0 90 28 110 28 L 188 28 Q 200 28 200 40 L 200 130 Z" />
                                            <path fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" d="M 1 129 L 1 12 Q 1 1 12 1 L 70 1 C 85 1 90 29 110 29 L 188 29 Q 199 29 199 40" />
                                        </svg>

                                        {count > 0 && (
                                            <div className="absolute bottom-3 left-4 flex -space-x-1.5">
                                                <div className="w-5 h-5 rounded-full bg-[#f8f9fa] border border-[#303136] flex items-center justify-center overflow-hidden z-20 shadow-sm text-blue-600">
                                                    <FileText className="w-2.5 h-2.5" />
                                                </div>
                                                {count > 1 && (
                                                    <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center z-10 shadow-sm text-foreground">
                                                        <span className="text-[7px] font-bold">+{count - 1}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>

                                    {/* Actions Hover (Rename/Delete) */}
                                    {(onDeleteFolder || onRenameFolder) && (
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-50">
                                            {onRenameFolder && (
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="w-6 h-6 rounded bg-foreground/70 hover:bg-foreground text-background hover:text-background border-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setEditingFolderId(folder.id)
                                                        setEditingFolderName(folder.name)
                                                        setIsRenameOpen(true)
                                                    }}
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                            {onDeleteFolder && (
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="w-6 h-6 rounded bg-foreground/70 hover:bg-destructive text-background hover:text-background border-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (confirm(`Are you sure you want to delete the folder "${folder.name}"? This action cannot be undone.`)) {
                                                            onDeleteFolder(folder.id)
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                </motion.div>
                                <div className="text-center">
                                    <h3 className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors truncate max-w-[200px] px-2">{folder.name}</h3>
                                    <p className="text-xs text-muted-foreground font-medium">{count} {count === 1 ? 'File' : 'Files'}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Rename Modal */}
            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Rename Folder</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>New Folder Name</Label>
                            <Input
                                value={editingFolderName}
                                onChange={e => setEditingFolderName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleRename()}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRenameOpen(false)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={isSaving || !editingFolderName.trim()} className="bg-primary hover:bg-primary/90">
                            {isSaving ? 'Saving...' : 'Save Name'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
