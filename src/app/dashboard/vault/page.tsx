'use client'

import React, { useState, useEffect, useRef } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DocumentFolders } from '@/components/documents/document-folders'
import { IPVaultDashboard } from '@/components/vault/ip-vault-dashboard'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    ChevronLeft, Upload, Search, FileText, FileImage,
    File, Download, Trash2, Plus, Grid3X3, List
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

type FileFilter = 'all' | 'images' | 'pdfs' | 'documents' | 'other'

export const dynamic = 'force-dynamic'

export default function VaultPage() {
    useEffect(() => { document.title = 'IP & Asset Vault' }, [])

    const supabase = createClient()
    const [userId, setUserId] = useState<string | null>(null)
    const [folders, setFolders] = useState<any[]>([])
    // fileCounts: map of folderId -> count, used in the folder grid view
    const [fileCounts, setFileCounts] = useState<Record<string, number>>({})
    // files shown inside an open folder
    const [folderFiles, setFolderFiles] = useState<any[]>([])
    const [prompts, setPrompts] = useState<any[]>([])

    const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [fileFilter, setFileFilter] = useState<FileFilter>('all')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // ── Initial data load ──
    useEffect(() => {
        const init = async () => {
            setIsLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            const uid = user?.id
            if (!uid) { setIsLoading(false); return }
            setUserId(uid)

            const [foldersRes, promptsRes] = await Promise.all([
                supabase.from('asset_folders').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
                supabase.from('ai_prompts').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
            ])

            const loadedFolders = foldersRes.data || []
            setFolders(loadedFolders)
            if (promptsRes.data) setPrompts(promptsRes.data)

            // Load file counts for each folder
            if (loadedFolders.length > 0) {
                const counts: Record<string, number> = {}
                await Promise.all(
                    loadedFolders.map(async (f: any) => {
                        const { count } = await supabase
                            .from('asset_files')
                            .select('id', { count: 'exact', head: true })
                            .eq('folder_id', f.id)
                        counts[f.id] = count || 0
                    })
                )
                setFileCounts(counts)
            }

            setIsLoading(false)
        }
        init()
    }, [])

    // ── Folder CRUD ──
    const handleCreateFolder = async (name: string) => {
        const { data, error } = await supabase
            .from('asset_folders')
            .insert({ user_id: userId, name })
            .select().single()
        if (error) { toast.error(error.message || 'Failed to create folder'); return }
        if (data) {
            setFolders(prev => [data, ...prev])
            setFileCounts(prev => ({ ...prev, [data.id]: 0 }))
            toast.success('Folder created!')
        }
    }

    const handleDeleteFolder = async (folderId: string) => {
        const { error } = await supabase.from('asset_folders').delete().eq('id', folderId)
        if (error) { toast.error(error.message || 'Failed to delete folder'); return }
        setFolders(prev => prev.filter(f => f.id !== folderId))
        setFileCounts(prev => { const n = { ...prev }; delete n[folderId]; return n })
        toast.success('Folder deleted')
    }

    const handleRenameFolder = async (folderId: string, newName: string) => {
        const { error } = await supabase.from('asset_folders').update({ name: newName }).eq('id', folderId)
        if (error) { toast.error(error.message || 'Failed to rename'); return }
        setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f))
        toast.success('Folder renamed')
    }

    // ── Open a folder ──
    const openFolder = async (folderId: string) => {
        setActiveFolderId(folderId)
        setSearchQuery('')
        setFileFilter('all')
        const query = folderId === 'all'
            ? supabase.from('asset_files').select('*').eq('user_id', userId!).order('created_at', { ascending: false })
            : supabase.from('asset_files').select('*').eq('folder_id', folderId).order('created_at', { ascending: false })
        const { data } = await query
        setFolderFiles(data || [])
    }

    // ── File Upload ──
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeFolderId || !userId) return
        const targetFolderId = activeFolderId === 'all' ? folders[0]?.id : activeFolderId
        if (!targetFolderId) { toast.error('No folder selected'); return }

        setIsUploading(true)
        const path = `vault/${userId}/${targetFolderId}/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage.from('assets').upload(path, file, { upsert: true })
        if (uploadError) {
            toast.error('Upload failed: ' + uploadError.message)
            setIsUploading(false)
            return
        }

        const { data: urlData } = supabase.storage.from('assets').getPublicUrl(path)
        const { data: fileRow, error: dbError } = await supabase
            .from('asset_files')
            .insert({ user_id: userId, folder_id: targetFolderId, name: file.name, size: file.size, type: file.type, url: urlData.publicUrl })
            .select().single()

        if (!dbError && fileRow) {
            setFolderFiles(prev => [fileRow, ...prev])
            setFileCounts(prev => ({ ...prev, [targetFolderId]: (prev[targetFolderId] || 0) + 1 }))
            toast.success('File uploaded!')
        } else {
            toast.error(dbError?.message || 'Failed to record file')
        }
        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleDeleteFile = async (fileId: string, folderId: string) => {
        const { error } = await supabase.from('asset_files').delete().eq('id', fileId)
        if (!error) {
            setFolderFiles(prev => prev.filter(f => f.id !== fileId))
            setFileCounts(prev => ({ ...prev, [folderId]: Math.max((prev[folderId] || 1) - 1, 0) }))
            toast.success('File deleted')
        }
    }

    // ── Helpers ──
    const getFileIcon = (type: string) => {
        if (type?.startsWith('image/')) return <FileImage className="w-6 h-6 text-sky-400" />
        if (type === 'application/pdf') return <FileText className="w-6 h-6 text-red-400" />
        if (type?.includes('word') || type?.includes('document')) return <FileText className="w-6 h-6 text-blue-400" />
        return <File className="w-6 h-6 text-muted-foreground" />
    }

    const filteredFiles = folderFiles.filter(file => {
        const matchesSearch = file.name?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter =
            fileFilter === 'all' ? true :
            fileFilter === 'images' ? file.type?.startsWith('image/') :
            fileFilter === 'pdfs' ? file.type === 'application/pdf' :
            fileFilter === 'documents' ? (file.type?.includes('word') || file.type?.includes('sheet') || file.type?.includes('document')) :
            (!file.type?.startsWith('image/') && file.type !== 'application/pdf' && !file.type?.includes('word'))
        return matchesSearch && matchesFilter
    })

    const activeFolderName = activeFolderId === 'all' ? 'All Files' : folders.find(f => f.id === activeFolderId)?.name

    // Map asset_folders → DocumentFolder shape (add required type field)
    const documentFolders = folders.map(f => ({ ...f, type: 'asset' as const }))

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {activeFolderId ? activeFolderName : 'IP & Asset Vault'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {activeFolderId
                            ? 'Manage your uploaded assets within this folder.'
                            : 'Store your AI prompts, brand assets, SOPs, and creative files.'}
                    </p>
                </div>

                {isLoading ? (
                    <div className="animate-pulse flex gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="w-36 h-36 bg-secondary rounded-xl" />)}
                    </div>

                ) : !activeFolderId ? (
                    /* ─── FOLDER GRID VIEW ─── */
                    <div className="space-y-10">
                        <DocumentFolders
                            folders={documentFolders}
                            type="asset"
                            onFolderClick={openFolder}
                            onCreateFolder={handleCreateFolder}
                            getItemCount={(folderId) => folderId === 'all' ? 0 : (fileCounts[folderId] || 0)}
                            onDeleteFolder={handleDeleteFolder}
                            onRenameFolder={handleRenameFolder}
                        />

                        {/* AI Prompt Library divider */}
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-px flex-1 bg-border/50" />
                                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    AI Prompt Library
                                </span>
                                <div className="h-px flex-1 bg-border/50" />
                            </div>
                            {userId && <IPVaultDashboard initialPrompts={prompts} userId={userId} />}
                        </div>
                    </div>

                ) : (
                    /* ─── FOLDER CONTENT VIEW ─── */
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">

                        {/* Top bar: Back + Upload button */}
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                                onClick={() => setActiveFolderId(null)}
                            >
                                <ChevronLeft className="w-4 h-4" /> Back to Folders
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button
                                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    <Upload className="w-4 h-4" />
                                    {isUploading ? 'Uploading...' : 'Upload File'}
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    accept="image/*,.pdf,.docx,.xlsx,.pptx,.zip,.mp4,.mov"
                                />
                            </div>
                        </div>

                        {/* Search + Filter + View Toggle */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative flex-1 min-w-[200px] max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search files..."
                                    className="pl-9 bg-secondary/30 border-border"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Type filter tabs */}
                            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/50">
                                {(['all', 'images', 'pdfs', 'documents', 'other'] as FileFilter[]).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFileFilter(f)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                                            fileFilter === f
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>

                            {/* View toggle */}
                            <div className="flex items-center gap-1 ml-auto">
                                <Button size="icon" variant={viewMode === 'grid' ? 'secondary' : 'ghost'} className="w-8 h-8" onClick={() => setViewMode('grid')}>
                                    <Grid3X3 className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant={viewMode === 'list' ? 'secondary' : 'ghost'} className="w-8 h-8" onClick={() => setViewMode('list')}>
                                    <List className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* ─── Empty State ─── */}
                        {filteredFiles.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-border/40 rounded-2xl bg-secondary/10 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-12 h-12 text-muted-foreground mb-3 opacity-40" />
                                <h3 className="text-base font-semibold text-foreground">
                                    {searchQuery || fileFilter !== 'all' ? 'No files match your filter' : 'Drop files here or click to upload'}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {searchQuery || fileFilter !== 'all' ? 'Try changing your search or filter' : 'PDF, PNG, JPG, DOCX, XLSX, ZIP, MP4 and more'}
                                </p>
                            </div>

                        ) : viewMode === 'grid' ? (
                            /* ─── Grid View ─── */
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {filteredFiles.map(file => (
                                    <div
                                        key={file.id}
                                        className="group relative flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:bg-secondary/50 hover:border-border transition-all"
                                    >
                                        {/* Thumbnail or type icon */}
                                        <div className="w-full aspect-square flex items-center justify-center rounded-lg bg-secondary/50 overflow-hidden">
                                            {file.type?.startsWith('image/') ? (
                                                <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1.5 p-2">
                                                    {getFileIcon(file.type)}
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        {file.name?.split('.').pop() || 'FILE'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-[11px] font-medium text-foreground truncate w-full text-center px-1" title={file.name}>
                                            {file.name}
                                        </p>
                                        {file.size && (
                                            <p className="text-[10px] text-muted-foreground -mt-1">
                                                {(file.size / 1024).toFixed(0)} KB
                                            </p>
                                        )}

                                        {/* Hover actions */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 rounded-md bg-background/95 shadow border border-border text-foreground hover:text-primary transition-colors"
                                                onClick={e => e.stopPropagation()}
                                                title="Download / Open"
                                            >
                                                <Download className="w-3 h-3" />
                                            </a>
                                            <button
                                                onClick={() => handleDeleteFile(file.id, file.folder_id)}
                                                className="p-1.5 rounded-md bg-background/95 shadow border border-border text-foreground hover:text-destructive transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Upload tile */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border/30 bg-secondary/10 hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[120px]"
                                >
                                    <Plus className="w-6 h-6 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Upload</span>
                                </button>
                            </div>

                        ) : (
                            /* ─── List View ─── */
                            <div className="space-y-1.5">
                                {filteredFiles.map(file => (
                                    <div
                                        key={file.id}
                                        className="group flex items-center justify-between px-4 py-3 rounded-xl border border-border/50 bg-card hover:bg-secondary/40 transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {getFileIcon(file.type)}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                                                    {file.created_at ? ` · ${format(new Date(file.created_at), 'MMM d, yyyy')}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant="outline" className="text-[10px] uppercase hidden sm:flex">
                                                {file.name?.split('.').pop() || 'file'}
                                            </Badge>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => handleDeleteFile(file.id, file.folder_id)}
                                                className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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
