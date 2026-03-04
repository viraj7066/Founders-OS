'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ContractGenerator } from '@/components/contracts/contract-generator'
import { DocumentFolders, DocumentFolder } from '@/components/documents/document-folders'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'
export default function ContractsPage() {
    const supabase = createClient()
    const userId = '00000000-0000-0000-0000-000000000000'

    const [folders, setFolders] = useState<DocumentFolder[]>([])
    const [contracts, setContracts] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])

    const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            const [foldersRes, contractsRes, clientsRes] = await Promise.all([
                supabase.from('document_folders').select('*').eq('user_id', userId).eq('type', 'contract').order('created_at', { ascending: false }),
                supabase.from('contracts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                supabase.from('clients').select('id, name').eq('user_id', userId).order('name')
            ])

            if (foldersRes.data) setFolders(foldersRes.data)
            if (contractsRes.data) setContracts(contractsRes.data)
            if (clientsRes.data) setClients(clientsRes.data)
            setIsLoading(false)
        }
        fetchData()
    }, [supabase])

    const handleCreateFolder = async (name: string) => {
        const { data, error } = await supabase.from('document_folders').insert({
            user_id: userId,
            name,
            type: 'contract'
        }).select().single()

        if (error) {
            toast.error(error.message || 'Failed to create folder')
            return
        }
        if (data) {
            setFolders([data, ...folders])
            toast.success('Folder created successfully!')
        }
    }

    const getItemCount = (folderId: string) => contracts.filter(c => c.folder_id === folderId).length

    const handleDeleteFolder = async (folderId: string) => {
        const { error } = await supabase.from('document_folders').delete().eq('id', folderId)
        if (error) { toast.error(error.message || 'Failed to delete folder'); return }
        setFolders(folders.filter(f => f.id !== folderId))
        toast.success('Folder deleted')
    }

    const handleRenameFolder = async (folderId: string, newName: string) => {
        const { error } = await supabase.from('document_folders').update({ name: newName }).eq('id', folderId)
        if (error) { toast.error(error.message || 'Failed to rename folder'); return }
        setFolders(folders.map(f => f.id === folderId ? { ...f, name: newName } : f))
        toast.success('Folder renamed')
    }

    const displayedContracts = activeFolderId === 'all'
        ? contracts
        : activeFolderId
            ? contracts.filter(c => c.folder_id === activeFolderId)
            : []

    const activeFolderName = activeFolderId === 'all' ? 'All Contracts' : folders.find(f => f.id === activeFolderId)?.name

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {activeFolderId ? activeFolderName : 'Contract Folders'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {activeFolderId
                            ? 'Manage your project agreements within this folder.'
                            : 'Organize your contracts securely.'}
                    </p>
                </div>

                {isLoading ? (
                    <div className="animate-pulse flex gap-4"><div className="w-32 h-32 bg-secondary rounded-xl" /><div className="w-32 h-32 bg-secondary rounded-xl" /></div>
                ) : !activeFolderId ? (
                    <DocumentFolders
                        folders={folders}
                        type="contract"
                        onFolderClick={setActiveFolderId}
                        onCreateFolder={handleCreateFolder}
                        getItemCount={getItemCount}
                        onDeleteFolder={handleDeleteFolder}
                        onRenameFolder={handleRenameFolder}
                    />
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => setActiveFolderId(null)}>
                            <ChevronLeft className="w-4 h-4" /> Back to Folders
                        </Button>
                        <ContractGenerator
                            contracts={displayedContracts}
                            clients={clients}
                            userId={userId}
                            activeFolderId={activeFolderId !== 'all' ? activeFolderId : undefined}
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
