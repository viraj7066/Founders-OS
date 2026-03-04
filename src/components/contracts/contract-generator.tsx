'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Download, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { retryQuery } from '@/lib/supabase/retry'
import { format, parseISO } from 'date-fns'
import jsPDF from 'jspdf'
import { FileEdit, FileSignature, Settings as SettingsIcon, Image as ImageIcon } from 'lucide-react'

interface Client { id: string; name: string }
interface ContractTerm { title: string; desc: string }
interface Contract {
    id: string; client_id_or_name: string; title: string; date: string; status: string;
    project_scope: string; terms_json: ContractTerm[]; amount: number; folder_id?: string;
}

interface Props { contracts: Contract[]; clients: Client[]; userId: string; activeFolderId?: string }

export function ContractGenerator({ contracts: initialContracts, clients, userId, activeFolderId }: Props) {
    const supabase = createClient()
    const [contracts, setContracts] = useState<Contract[]>(initialContracts)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [deleteContractTarget, setDeleteContractTarget] = useState<Contract | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [customClient, setCustomClient] = useState('')
    const [selectedClient, setSelectedClient] = useState(clients[0]?.id || '')
    const [title, setTitle] = useState('Service Agreement')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [amount, setAmount] = useState(15000)
    const [scope, setScope] = useState('We will provide strategic growth consulting and asset generation over the designated 30-day sprint.')
    const [terms, setTerms] = useState<ContractTerm[]>([
        { title: 'Payment Terms', desc: '50% advance before project commencement, 50% upon final delivery.' },
        { title: 'Revisions', desc: 'Up to 2 rounds of minor revisions are included. Additional work will be billed hourly.' },
        { title: 'Confidentiality', desc: 'Both parties agree to keep all proprietary business information completely confidential.' }
    ])

    // Logo & Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [logoBase64, setLogoBase64] = useState<string | null>(null)

    React.useEffect(() => {
        const fetchLogo = async () => {
            const { data } = await supabase.from('agency_settings').select('logo_base64').eq('user_id', userId).single()
            if (data?.logo_base64) setLogoBase64(data.logo_base64)
        }
        fetchLogo()
    }, [userId, supabase])

    const generatePDF = (cont: Contract, isPreview = false) => {
        const doc = new jsPDF()
        const clientName = clients.find(c => c.id === cont.client_id_or_name)?.name || cont.client_id_or_name

        // --- Branding & Header ---
        if (logoBase64) {
            try { doc.addImage(logoBase64, 'JPEG', 14, 15, 30, 15) } catch { /* Ignore malformed image */ }
        } else {
            doc.setFillColor(0, 0, 0)
            doc.rect(14, 15, 12, 12, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(22)
            doc.text('SECOND', 30, 20)
            doc.setFontSize(16)
            doc.text('LENS Studio', 30, 26)
        }

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`CTR-${cont.id.substring(0, 6).toUpperCase()}`, 170, 20)

        // TITLE
        doc.setFontSize(36)
        doc.setFont('helvetica', 'bold')
        doc.text('CONTRACT', 14, 50)
        doc.setFontSize(14)
        doc.text(cont.title, 14, 60)

        // --- Meta data ---
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Date: ', 14, 75)
        doc.setFont('helvetica', 'normal')
        doc.text(format(parseISO(cont.date), 'dd MMMM yyyy'), 26, 75)

        doc.setFont('helvetica', 'bold')
        doc.text('Between:', 14, 90)
        doc.setFont('helvetica', 'normal')
        doc.text('Second Lens Studio (Provider)', 14, 96)
        doc.text('and', 14, 102)
        doc.setFont('helvetica', 'bold')
        doc.text(`${clientName} (Client)`, 14, 108)

        // --- Scope of Work ---
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('1. Scope of Work', 14, 125)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        const splitScope = doc.splitTextToSize(cont.project_scope, 180)
        doc.text(splitScope, 14, 132)

        let cursorY = 132 + (splitScope.length * 5) + 10

        // --- Terms ---
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('2. Terms & Conditions', 14, cursorY)
        cursorY += 8

        cont.terms_json.forEach(term => {
            if (cursorY > 250) { doc.addPage(); cursorY = 20 }
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text(`• ${term.title}:`, 14, cursorY)

            doc.setFont('helvetica', 'normal')
            const splitDesc = doc.splitTextToSize(term.desc, 180)
            doc.text(splitDesc, 18, cursorY + 5)
            cursorY += (splitDesc.length * 5) + 8
        })

        if (cursorY > 220) { doc.addPage(); cursorY = 20 }

        // --- Project Value ---
        cursorY += 5
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('3. Project Value', 14, cursorY)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`The total agreed compensation for this project is Rs. ${cont.amount.toLocaleString()}.`, 14, cursorY + 7)

        // --- Signature Block ---
        cursorY += 30
        if (cursorY > 250) { doc.addPage(); cursorY = 30 }

        doc.setDrawColor(150)
        doc.line(14, cursorY, 80, cursorY)
        doc.line(110, cursorY, 196, cursorY)

        doc.setFont('helvetica', 'bold')
        doc.text('Provider Signature', 14, cursorY + 6)
        doc.text('Client Signature', 110, cursorY + 6)

        doc.setFont('helvetica', 'normal')
        doc.text('Second Lens Studio', 14, cursorY + 12)
        doc.text(clientName, 110, cursorY + 12)

        // --- Footer Wave ---
        doc.setFillColor(220, 220, 220)
        doc.rect(0, 280, 210, 20, 'F')

        if (!isPreview) {
            doc.save(`Contract_${clientName.replace(/\s+/g, '_')}_${format(parseISO(cont.date), 'MMM_yyyy')}.pdf`)
        }
    }

    const handleGenerate = async () => {
        const clientId = customClient.trim() ? customClient.trim() : selectedClient
        if (!clientId) { toast.error('Select or create a client'); return }
        if (!title.trim() || !scope.trim()) { toast.error('Title and Scope are required'); return }

        setIsSaving(true)
        const payload: any = {
            user_id: userId,
            client_id_or_name: clientId,
            title,
            date,
            status: 'Draft',
            project_scope: scope,
            terms_json: terms,
            amount
        }
        if (activeFolderId) payload.folder_id = activeFolderId

        if (editingId) {
            const { data, error } = await retryQuery(() => supabase.from('contracts').update(payload).eq('id', editingId).select().single())
            if (!error && data) {
                setContracts(prev => prev.map(c => c.id === editingId ? data : c))
                setIsCreateOpen(false)
                generatePDF(data)
                toast.success('Contract updated & downloaded!')
                resetForm()
            } else toast.error(error?.message || 'Failed to update contract')
        } else {
            const { data, error } = await retryQuery(() => supabase.from('contracts').insert(payload).select().single())
            if (!error && data) {
                setContracts([data, ...contracts])
                setIsCreateOpen(false)
                generatePDF(data)
                toast.success('Contract drafted & downloaded!')
                resetForm()
            } else toast.error(error?.message || 'Failed to generate contract')
        }
        setIsSaving(false)
    }

    const resetForm = () => {
        setEditingId(null)
        setCustomClient('')
        setTitle('Service Agreement')
        setAmount(15000)
    }

    const handleEdit = (cont: Contract) => {
        setEditingId(cont.id)
        if (clients.find(c => c.id === cont.client_id_or_name)) {
            setSelectedClient(cont.client_id_or_name)
            setCustomClient('')
        } else {
            setCustomClient(cont.client_id_or_name)
            setSelectedClient('')
        }
        setDate(cont.date)
        setTitle(cont.title)
        setAmount(cont.amount)
        setScope(cont.project_scope)
        setTerms(cont.terms_json)
        setIsCreateOpen(true)
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64String = reader.result as string
            setLogoBase64(base64String)
            await retryQuery(() => supabase.from('agency_settings').upsert({ user_id: userId, logo_base64: base64String }))
            toast.success('Logo saved successfully!')
            setIsSettingsOpen(false)
        }
        reader.readAsDataURL(file)
    }

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await retryQuery(() => supabase.from('contracts').update({ status: newStatus }).eq('id', id))
        if (!error) {
            setContracts(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
            toast.success('Status updated')
        }
    }

    const handleDeleteContract = async () => {
        if (!deleteContractTarget) return
        setIsDeleting(true)
        const { error } = await retryQuery(() => supabase.from('contracts').delete().eq('id', deleteContractTarget.id))
        if (!error) {
            setContracts(prev => prev.filter(c => c.id !== deleteContractTarget.id))
            toast.success('Contract deleted')
        } else toast.error(error.message || 'Failed to delete contract')
        setIsDeleting(false)
        setDeleteContractTarget(null)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    <Card className="bg-card">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Contracts</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{contracts.length}</p></CardContent>
                    </Card>
                    <Card className="bg-card">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Signed</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold text-emerald-400">{contracts.filter(c => c.status === 'Signed').length}</p></CardContent>
                    </Card>
                </div>

                <div className="flex items-center gap-3">
                    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" title="Contract Settings">
                                <SettingsIcon className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader><DialogTitle>Contract Settings</DialogTitle></DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Custom Logo</Label>
                                    <div className="flex gap-4 items-center">
                                        {logoBase64 ? (
                                            <div className="w-16 h-16 rounded-md border flex items-center justify-center overflow-hidden bg-white">
                                                <img src={logoBase64} alt="Logo" className="max-w-full max-h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-md border border-dashed flex items-center justify-center bg-secondary/50">
                                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <Input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleLogoUpload} />
                                            <p className="text-xs text-muted-foreground mt-1">PNG or JPG. Will replace "Second Lens Studio" text.</p>
                                        </div>
                                    </div>
                                    {logoBase64 && (
                                        <Button variant="ghost" size="sm" className="text-destructive mt-2 w-full" onClick={async () => {
                                            setLogoBase64(null)
                                            await supabase.from('agency_settings').upsert({ user_id: userId, logo_base64: null })
                                            toast.success('Logo removed')
                                        }}>Remove Logo</Button>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isCreateOpen} onOpenChange={(open) => {
                        setIsCreateOpen(open);
                        if (!open) resetForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button className="font-bold gap-2"><Plus className="w-4 h-4" /> Draft Contract</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'Draft'} Contract</DialogTitle></DialogHeader>

                            <div className="grid gap-6 py-4">
                                {/* Client & Date */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Client</Label>
                                        <Select disabled={!!customClient} value={selectedClient || "none"} onValueChange={(val: string) => setSelectedClient(val === "none" ? "" : val)}>
                                            <SelectTrigger className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                                <SelectValue placeholder="-- Select Client --" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card">
                                                <SelectItem value="none">-- Select Client --</SelectItem>
                                                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Input placeholder="Or type a custom client name" value={customClient} onChange={e => setCustomClient(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contract Date</Label>
                                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Document Title</Label>
                                        <Input value={title} onChange={e => setTitle(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Total Value (&#8377;)</Label>
                                        <Input type="number" value={amount} onChange={e => setAmount(parseInt(e.target.value) || 0)} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Scope of Work</Label>
                                    <Textarea className="h-24 bg-secondary/50" value={scope} onChange={e => setScope(e.target.value)} />
                                </div>

                                {/* Terms */}
                                <div className="space-y-2">
                                    <Label>Terms &amp; Conditions</Label>
                                    {terms.map((term, idx) => (
                                        <div key={idx} className="flex gap-2 items-start border p-3 rounded-md bg-secondary/20">
                                            <div className="flex-1 space-y-2">
                                                <Input placeholder="Term Title" value={term.title} onChange={e => {
                                                    const newTerms = [...terms]; newTerms[idx].title = e.target.value; setTerms(newTerms)
                                                }} />
                                                <Textarea placeholder="Description" className="h-16 text-sm" value={term.desc} onChange={e => {
                                                    const newTerms = [...terms]; newTerms[idx].desc = e.target.value; setTerms(newTerms)
                                                }} />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => setTerms(terms.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={() => setTerms([...terms, { title: '', desc: '' }])}>+ Add Term</Button>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button onClick={handleGenerate} disabled={isSaving} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                                    {isSaving ? 'Generating...' : <><FileSignature className="w-4 h-4" /> {editingId ? 'Update' : 'Generate'} &amp; Download PDF</>}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* List */}
            <Card className="bg-card">
                <CardHeader><CardTitle>Contract Registry</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {contracts.length === 0 ? (
                            <p className="text-muted-foreground text-sm italic py-4 text-center">No contracts drafted yet.</p>
                        ) : (
                            contracts.map(cont => {
                                const clientName = clients.find(c => c.id === cont.client_id_or_name)?.name || cont.client_id_or_name
                                return (
                                    <div key={cont.id} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20 hover:bg-secondary/50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{clientName}</span>
                                                <span className="text-xs text-muted-foreground">{cont.title}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                {format(parseISO(cont.date), 'MMM d, yyyy')} &bull; &#8377;{cont.amount.toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Select value={cont.status} onValueChange={(val: string) => updateStatus(cont.id, val)}>
                                                <SelectTrigger className={`h-8 border border-white/10 text-xs font-bold px-2 py-1 rounded-full outline-none w-[110px] ${cont.status === 'Signed' ? 'bg-emerald-500/20 text-emerald-400' : cont.status === 'Sent' ? 'bg-blue-500/20 text-blue-400' : 'bg-secondary text-foreground'}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card">
                                                    <SelectItem value="Draft" className="text-xs font-medium">Draft</SelectItem>
                                                    <SelectItem value="Sent" className="text-xs font-medium text-blue-400">Sent</SelectItem>
                                                    <SelectItem value="Signed" className="text-xs font-medium text-emerald-400">Signed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(cont)}>
                                                <FileEdit className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteContractTarget(cont)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => generatePDF(cont)} className="gap-2 shrink-0">
                                                <Download className="w-3 h-3" /> PDF
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteContractTarget} onOpenChange={open => { if (!open) setDeleteContractTarget(null) }}>
                <DialogContent className="sm:max-w-[380px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <AlertTriangle className="w-4 h-4 text-red-500" /> Delete Contract?
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground pt-1">
                            Delete <strong>{deleteContractTarget?.title}</strong> for <strong>{clients.find(c => c.id === deleteContractTarget?.client_id_or_name)?.name || deleteContractTarget?.client_id_or_name}</strong>? This cannot be undone.
                        </p>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setDeleteContractTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteContract} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}