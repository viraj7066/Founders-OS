'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Download, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { retryQuery } from '@/lib/supabase/retry'
import { format, parseISO } from 'date-fns'
import jsPDF from 'jspdf'
import { FileEdit, Settings as SettingsIcon, Image as ImageIcon } from 'lucide-react'
import autoTable from 'jspdf-autotable'

// Extends jsPDF definition for autotable
declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable: { finalY: number }
    }
}

interface Client { id: string; name: string }
interface InvoiceItem { desc: string; qty: number; price: number }
interface Invoice {
    id: string; client_id_or_name: string; amount: number; date: string; status: string;
    items_json: InvoiceItem[]; payment_details_json: any; notes?: string; folder_id?: string;
}

interface Props { invoices: Invoice[]; clients: Client[]; userId: string; activeFolderId?: string }

export function InvoiceGenerator({ invoices: initialInvoices, clients, userId, activeFolderId }: Props) {
    const supabase = createClient()
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState<Invoice | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [customClient, setCustomClient] = useState('')
    const [selectedClient, setSelectedClient] = useState(clients[0]?.id || '')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [items, setItems] = useState<InvoiceItem[]>([{ desc: 'Service / Item', qty: 1, price: 5000 }])
    const [advance, setAdvance] = useState(0)
    const [terms, setTerms] = useState('50% advance, 50% before project delivery')
    const [upi, setUpi] = useState('7066498198@ybl')
    const [phonepe, setPhonepe] = useState('7066498198')
    const [notes, setNotes] = useState('Thank you for choosing us!')

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

    const grandTotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0)

    const generatePDF = (inv: Invoice, isPreview = false) => {
        const doc = new jsPDF()
        const clientName = clients.find(c => c.id === inv.client_id_or_name)?.name || inv.client_id_or_name

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
        doc.text(`INV-${inv.id.substring(0, 6).toUpperCase()}`, 170, 20)

        // TITLE
        doc.setFontSize(40)
        doc.setFont('helvetica', 'bold')
        doc.text('INVOICE', 14, 50)

        // --- Meta data ---
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Date: ', 14, 65)
        doc.setFont('helvetica', 'normal')
        doc.text(format(parseISO(inv.date), 'dd MMMM yyyy'), 26, 65)

        // Billed To & From
        doc.setFont('helvetica', 'bold')
        doc.text('Billed to:', 14, 80)
        doc.setFont('helvetica', 'normal')
        doc.text(clientName, 14, 86)

        doc.setFont('helvetica', 'bold')
        doc.text('From:', 110, 80)
        doc.setFont('helvetica', 'normal')
        doc.text('Second Lens Studio\nDhule\nsecondlensstudio@gmail.com', 110, 86)

        // --- Table ---
        const tableData = inv.items_json.map(item => [
            item.desc,
            item.qty.toString(),
            `Rs. ${item.price.toLocaleString()}`,
            `Rs. ${(item.qty * item.price).toLocaleString()}`
        ])

        autoTable(doc, {
            startY: 110,
            head: [['Item', 'Quantity', 'Price', 'Amount']],
            body: tableData,
            theme: 'plain',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            bodyStyles: { textColor: [0, 0, 0] },
            alternateRowStyles: { fillColor: [255, 255, 255] },
            margin: { left: 14, right: 14 }
        })

        const finalY = doc.lastAutoTable.finalY || 150

        // --- Totals ---
        doc.setDrawColor(200)
        doc.line(14, finalY + 5, 196, finalY + 5)

        const totalAmount = inv.amount
        const advanceAmt = inv.payment_details_json.advance || 0

        doc.setFont('helvetica', 'bold')
        doc.text('GRAND TOTAL', 130, finalY + 13)
        doc.text(`Rs. ${totalAmount.toLocaleString()}`, 170, finalY + 13)

        if (advanceAmt > 0) {
            doc.text('ADVANCE PAYMENT', 130, finalY + 20)
            doc.text(`Rs. ${advanceAmt.toLocaleString()}`, 170, finalY + 20)
        }

        doc.line(14, finalY + 25, 196, finalY + 25)

        // --- Payment Info ---
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Payment Terms: ', 14, finalY + 35)
        doc.setFont('helvetica', 'normal')
        doc.text(inv.payment_details_json.terms, 45, finalY + 35)

        doc.setFont('helvetica', 'bold')
        doc.text('Payment Details:', 14, finalY + 45)
        doc.text('UPI: ', 14, finalY + 52)
        doc.setFont('helvetica', 'normal')
        doc.text(inv.payment_details_json.upi, 24, finalY + 52)

        doc.setFont('helvetica', 'bold')
        doc.text('PhonePe:', 14, finalY + 59)
        doc.setFont('helvetica', 'normal')
        doc.text(inv.payment_details_json.phonepe, 32, finalY + 59)

        // --- Footer Wave graphic & note ---
        doc.setFillColor(220, 220, 220)
        // Simple stylized wave polygon at the bottom for branding
        doc.rect(0, 260, 210, 40, 'F')

        doc.setFont('helvetica', 'bold')
        doc.text('Payment method: ', 14, 275)
        doc.setFont('helvetica', 'normal')
        doc.text('UPI', 46, 275)

        doc.setFont('helvetica', 'bold')
        doc.text('Note: ', 14, 282)
        doc.setFont('helvetica', 'normal')
        doc.text(inv.notes || '', 26, 282)

        if (!isPreview) {
            doc.save(`Invoice_${clientName.replace(/\s+/g, '_')}_${format(parseISO(inv.date), 'MMM_yyyy')}.pdf`)
        }
    }

    const handleGenerate = async () => {
        const clientId = customClient.trim() ? customClient.trim() : selectedClient
        if (!clientId) { toast.error('Select or create a client'); return }
        if (items.length === 0 || !items[0].desc) { toast.error('Add at least one item'); return }

        setIsSaving(true)
        const payload: any = {
            user_id: userId,
            client_id_or_name: clientId,
            amount: grandTotal,
            date: date,
            status: 'Sent',
            items_json: items,
            payment_details_json: { advance, terms, upi, phonepe },
            notes: notes
        }
        if (activeFolderId) payload.folder_id = activeFolderId

        if (editingId) {
            const { data, error } = await retryQuery(() => supabase.from('invoices').update(payload).eq('id', editingId).select().single())
            if (!error && data) {
                setInvoices(prev => prev.map(inv => inv.id === editingId ? data : inv))
                setIsCreateOpen(false)
                generatePDF(data)
                toast.success('Invoice updated & downloaded!')
                resetForm()
            } else toast.error(error?.message || 'Failed to update invoice')
        } else {
            const { data, error } = await retryQuery(() => supabase.from('invoices').insert(payload).select().single())
            if (!error && data) {
                setInvoices([data, ...invoices])
                setIsCreateOpen(false)
                generatePDF(data)
                toast.success('Invoice generated & downloaded!')
                resetForm()
            } else toast.error(error?.message || 'Failed to save invoice')
        }
        setIsSaving(false)
    }

    const resetForm = () => {
        setEditingId(null)
        setCustomClient('')
        setItems([{ desc: 'Service / Item', qty: 1, price: 5000 }])
        setAdvance(0)
    }

    const handleEdit = (inv: Invoice) => {
        setEditingId(inv.id)
        if (clients.find(c => c.id === inv.client_id_or_name)) {
            setSelectedClient(inv.client_id_or_name)
            setCustomClient('')
        } else {
            setCustomClient(inv.client_id_or_name)
            setSelectedClient('')
        }
        setDate(inv.date)
        setItems(inv.items_json)
        setAdvance(inv.payment_details_json.advance || 0)
        setTerms(inv.payment_details_json.terms || '')
        setUpi(inv.payment_details_json.upi || '')
        setPhonepe(inv.payment_details_json.phonepe || '')
        setNotes(inv.notes || '')
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
        const { error } = await retryQuery(() => supabase.from('invoices').update({ status: newStatus }).eq('id', id))
        if (!error) {
            setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv))
            toast.success('Status updated')
        }
    }

    const handleDeleteInvoice = async () => {
        if (!deleteInvoiceTarget) return
        setIsDeleting(true)
        const { error } = await retryQuery(() => supabase.from('invoices').delete().eq('id', deleteInvoiceTarget.id))
        if (!error) {
            setInvoices(prev => prev.filter(inv => inv.id !== deleteInvoiceTarget.id))
            toast.success('Invoice deleted')
        } else toast.error(error.message || 'Failed to delete invoice')
        setIsDeleting(false)
        setDeleteInvoiceTarget(null)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                    <Card className="bg-card">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Invoiced</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">&#8377;{invoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}</p></CardContent>
                    </Card>
                    <Card className="bg-card">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid Revenue</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold text-emerald-400">&#8377;{invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0).toLocaleString()}</p></CardContent>
                    </Card>
                </div>

                <div className="flex items-center gap-3">
                    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" title="Invoice Settings">
                                <SettingsIcon className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader><DialogTitle>Invoice Settings</DialogTitle></DialogHeader>
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
                            <Button className="font-bold gap-2"><Plus className="w-4 h-4" /> Create Invoice</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'Create'} Invoice</DialogTitle></DialogHeader>

                            <div className="grid gap-6 py-4">
                                {/* Client & Date */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Billed To (Client)</Label>
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
                                        <Label>Invoice Date</Label>
                                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="space-y-2">
                                    <Label>Line Items</Label>
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <Input placeholder="Description" value={item.desc} onChange={e => {
                                                const newItems = [...items]; newItems[idx].desc = e.target.value; setItems(newItems)
                                            }} className="flex-1" />
                                            <Input type="number" placeholder="Qty" value={item.qty} onChange={e => {
                                                const newItems = [...items]; newItems[idx].qty = parseInt(e.target.value) || 0; setItems(newItems)
                                            }} className="w-20" />
                                            <Input type="number" placeholder="Price" value={item.price} onChange={e => {
                                                const newItems = [...items]; newItems[idx].price = parseInt(e.target.value) || 0; setItems(newItems)
                                            }} className="w-28" />
                                            <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={() => setItems([...items, { desc: '', qty: 1, price: 0 }])}>+ Add Item</Button>
                                </div>

                                {/* Payment Dets */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div className="space-y-2"><Label>Advance Payment (&#8377;)</Label><Input type="number" value={advance} onChange={e => setAdvance(parseInt(e.target.value) || 0)} /></div>
                                    <div className="space-y-2"><Label>Grand Total Computed</Label><div className="h-10 px-3 py-2 border rounded-md bg-secondary/50 font-bold">&#8377;{grandTotal.toLocaleString()}</div></div>
                                </div>

                                <div className="space-y-2"><Label>Payment Terms</Label><Input value={terms} onChange={e => setTerms(e.target.value)} /></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>UPI ID</Label><Input value={upi} onChange={e => setUpi(e.target.value)} /></div>
                                    <div className="space-y-2"><Label>PhonePe Number</Label><Input value={phonepe} onChange={e => setPhonepe(e.target.value)} /></div>
                                </div>

                                <div className="space-y-2"><Label>Footer Note</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
                            </div>

                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button onClick={handleGenerate} disabled={isSaving} className="gap-2">
                                    {isSaving ? 'Generating...' : <><FileText className="w-4 h-4" /> {editingId ? 'Update' : 'Generate'} &amp; Download PDF</>}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Invoices List */}
            <Card className="bg-card">
                <CardHeader><CardTitle>Invoice History</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {invoices.length === 0 ? (
                            <p className="text-muted-foreground text-sm italic py-4 text-center">No invoices generated yet.</p>
                        ) : (
                            invoices.map(inv => {
                                const clientName = clients.find(c => c.id === inv.client_id_or_name)?.name || inv.client_id_or_name
                                return (
                                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20 hover:bg-secondary/50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{clientName}</span>
                                                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full border">INV-{inv.id.substring(0, 6).toUpperCase()}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">{format(parseISO(inv.date), 'MMM d, yyyy')} &bull; &#8377;{inv.amount.toLocaleString()}</div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Select value={inv.status} onValueChange={(val: string) => updateStatus(inv.id, val)}>
                                                <SelectTrigger className={`h-8 border border-white/10 text-xs font-bold px-2 py-1 rounded-full outline-none w-[100px] ${inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card">
                                                    <SelectItem value="Sent" className="text-xs font-medium text-orange-400">Sent</SelectItem>
                                                    <SelectItem value="Paid" className="text-xs font-medium text-emerald-400">Paid</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(inv)}>
                                                <FileEdit className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteInvoiceTarget(inv)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => generatePDF(inv)} className="gap-2 shrink-0">
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
            <Dialog open={!!deleteInvoiceTarget} onOpenChange={open => { if (!open) setDeleteInvoiceTarget(null) }}>
                <DialogContent className="sm:max-w-[380px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <AlertTriangle className="w-4 h-4 text-red-500" /> Delete Invoice?
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground pt-1">
                            Delete invoice for <strong>{clients.find(c => c.id === deleteInvoiceTarget?.client_id_or_name)?.name || deleteInvoiceTarget?.client_id_or_name}</strong> (&#8377;{(deleteInvoiceTarget?.amount || 0).toLocaleString()})? This cannot be undone.
                        </p>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setDeleteInvoiceTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteInvoice} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}