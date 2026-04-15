'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Download, FileText, CheckCircle2, AlertTriangle, FolderOpen } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
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
    advance_received?: boolean; advance_amount?: number; invoice_number?: string;
    advance_collected?: boolean;  // true = advance button was clicked, prevents double-count
}

interface Props { invoices: Invoice[]; clients: Client[]; userId: string; activeFolderId?: string; folders?: any[] }

export function InvoiceGenerator({ invoices: initialInvoices, clients, userId, activeFolderId, folders = [] }: Props) {
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
    const [advanceReceived, setAdvanceReceived] = useState(false)
    const [advanceAmountInput, setAdvanceAmountInput] = useState(0)
    const [selectedFolderId, setSelectedFolderId] = useState<string>(activeFolderId || '')

    // Logo & Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [logoBase64, setLogoBase64] = useState<string | null>(null)

    // Sync selectedClient when clients prop arrives
    React.useEffect(() => {
        if (!selectedClient && clients && clients.length > 0) {
            setSelectedClient(clients[0].id)
        }
    }, [clients, selectedClient])

    React.useEffect(() => {
        if (!userId || userId === 'placeholder') return
        const fetchLogo = async () => {
            const { data } = await supabase.from('agency_settings').select('logo_base64').eq('user_id', userId).single()
            if (data?.logo_base64) setLogoBase64(data.logo_base64)
        }
        fetchLogo()
    }, [userId, supabase])

    const grandTotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0)

    // Generate YYYYDDMM invoice number with suffix for same-day invoices
    const generateInvoiceNumber = (dateStr: string, existingInvoices: Invoice[]): string => {
        const d = new Date(dateStr)
        const yyyy = d.getFullYear()
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const base = `${yyyy}${dd}${mm}`
        // Count how many invoices already use this base on the same date
        const sameDayCount = existingInvoices.filter(inv => inv.date === dateStr).length
        return sameDayCount === 0 ? base : `${base}-${sameDayCount}`
    }

    const generatePDF = (inv: Invoice, isPreview = false) => {
        const doc = new jsPDF()
        const PAGE_W = 210
        const MARGIN = 14
        const RIGHT = PAGE_W - MARGIN  // 196
        const clientName = clients.find(c => c.id === inv.client_id_or_name)?.name || inv.client_id_or_name
        const invNum = inv.invoice_number || `INV-${inv.id.substring(0, 6).toUpperCase()}`
        const invDate = format(parseISO(inv.date), 'dd MMMM yyyy')

        // ── 1. TOP HEADER BAR (dark) ─────────────────────────────
        doc.setFillColor(18, 18, 20)          // near-black
        doc.rect(0, 0, PAGE_W, 38, 'F')

        // Logo / Brand (left side)
        if (logoBase64) {
            try { doc.addImage(logoBase64, 'JPEG', MARGIN, 8, 28, 14) } catch {}
        } else {
            doc.setFillColor(255, 140, 50)    // orange accent square
            doc.roundedRect(MARGIN, 9, 12, 12, 2, 2, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7)
            doc.text('SLS', MARGIN + 6, 16.5, { align: 'center' })

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(13)
            doc.setTextColor(255, 255, 255)
            doc.text('Second Lens Studio', MARGIN + 16, 17)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(180, 180, 180)
            doc.text('Photography & Visual Agency', MARGIN + 16, 22)
        }

        // Invoice label + number (right side)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(255, 140, 50)        // orange
        doc.text('INVOICE', RIGHT, 16, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(200, 200, 200)
        doc.text(invNum, RIGHT, 22, { align: 'right' })
        doc.text(invDate, RIGHT, 28, { align: 'right' })

        // ── 2. INVOICE TITLE ────────────────────────────────────
        doc.setTextColor(18, 18, 20)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(28)
        doc.text('INVOICE', MARGIN, 56)

        // thin accent underline
        doc.setDrawColor(255, 140, 50)
        doc.setLineWidth(0.8)
        doc.line(MARGIN, 59, 68, 59)
        doc.setLineWidth(0.2)

        // ── 3. BILLED TO / FROM block ────────────────────────────
        const billY = 70
        // Left column — Billed To
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(140, 140, 140)
        doc.text('BILLED TO', MARGIN, billY)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(18, 18, 20)
        doc.text(clientName, MARGIN, billY + 7)

        // Right column — From (right-aligned)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(140, 140, 140)
        doc.text('FROM', RIGHT, billY, { align: 'right' })

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(18, 18, 20)
        doc.text('Second Lens Studio', RIGHT, billY + 7, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(80, 80, 80)
        doc.text('Dhule, Maharashtra', RIGHT, billY + 13, { align: 'right' })
        doc.text('secondlensstudio@gmail.com', RIGHT, billY + 19, { align: 'right' })

        // horizontal rule
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.3)
        doc.line(MARGIN, billY + 27, RIGHT, billY + 27)
        doc.setLineWidth(0.2)

        // ── 4. LINE ITEMS TABLE ───────────────────────────────────
        const tableData = inv.items_json.map(item => [
            item.desc,
            item.qty.toString(),
            `Rs. ${Number(item.price).toLocaleString('en-IN')}`,
            `Rs. ${Number(item.qty * item.price).toLocaleString('en-IN')}`
        ])

        autoTable(doc, {
            startY: billY + 32,
            head: [['Description', 'Qty', 'Unit Price', 'Amount']],
            body: tableData,
            theme: 'plain',
            styles: {
                font: 'helvetica',
                fontSize: 9,
                cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
                textColor: [30, 30, 30],
                lineColor: [235, 235, 235],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: [245, 245, 247],
                textColor: [100, 100, 100],
                fontStyle: 'bold',
                fontSize: 7.5,
                cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
            },
            columnStyles: {
                0: { cellWidth: 90 },                      // Description — widest
                1: { cellWidth: 20, halign: 'center' },    // Qty — centered
                2: { cellWidth: 36, halign: 'right' },     // Unit Price — right
                3: { cellWidth: 36, halign: 'right' },     // Amount — right
            },
            margin: { left: MARGIN, right: MARGIN },
            alternateRowStyles: { fillColor: [250, 250, 252] },
        })

        const tableEndY = doc.lastAutoTable.finalY || 160

        // ── 5. TOTALS BLOCK (right-aligned) ──────────────────────
        const totalAmount = inv.amount
        const advanceAmt = inv.payment_details_json?.advance || 0
        const balance = totalAmount - advanceAmt

        let totY = tableEndY + 6
        const totLabelX = 145
        const totValueX = RIGHT

        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.3)
        doc.line(totLabelX, totY, RIGHT, totY)

        totY += 7
        // Subtotal row
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(80, 80, 80)
        doc.text('Subtotal', totLabelX, totY)
        doc.text(`Rs. ${Number(totalAmount).toLocaleString('en-IN')}`, totValueX, totY, { align: 'right' })

        if (advanceAmt > 0) {
            totY += 6
            doc.text('Advance Received', totLabelX, totY)
            doc.setTextColor(34, 160, 100)    // green for advance
            doc.text(`- Rs. ${Number(advanceAmt).toLocaleString('en-IN')}`, totValueX, totY, { align: 'right' })
        }

        totY += 5
        doc.setDrawColor(18, 18, 20)
        doc.setLineWidth(0.4)
        doc.line(totLabelX, totY, RIGHT, totY)
        totY += 7

        // Grand Total / Balance Due
        doc.setFillColor(18, 18, 20)
        doc.roundedRect(totLabelX - 2, totY - 5, RIGHT - totLabelX + 4, 10, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(255, 255, 255)
        doc.text(advanceAmt > 0 ? 'BALANCE DUE' : 'TOTAL DUE', totLabelX + 2, totY + 2)
        doc.text(
            `Rs. ${Number(advanceAmt > 0 ? balance : totalAmount).toLocaleString('en-IN')}`,
            totValueX - 2, totY + 2, { align: 'right' }
        )

        // ── 6. PAYMENT INFO SECTION ────────────────────────────────
        const payY = totY + 18
        doc.setDrawColor(235, 235, 235)
        doc.setLineWidth(0.3)
        doc.line(MARGIN, payY - 4, RIGHT, payY - 4)

        // Left: Payment Terms
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(120, 120, 120)
        doc.text('PAYMENT TERMS', MARGIN, payY)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(30, 30, 30)
        const termsText = inv.payment_details_json?.terms || ''
        doc.text(termsText, MARGIN, payY + 6, { maxWidth: 85 })

        // Right: Payment Details (UPI / PhonePe)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(120, 120, 120)
        doc.text('PAYMENT DETAILS', 110, payY)

        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text('UPI:', 110, payY + 6)
        doc.setFont('helvetica', 'normal')
        doc.text(inv.payment_details_json?.upi || '', 122, payY + 6)

        doc.setFont('helvetica', 'bold')
        doc.text('PhonePe:', 110, payY + 12)
        doc.setFont('helvetica', 'normal')
        doc.text(inv.payment_details_json?.phonepe || '', 128, payY + 12)

        // ── 7. NOTE ───────────────────────────────────────────────
        if (inv.notes) {
            const noteY = payY + 26
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7.5)
            doc.setTextColor(120, 120, 120)
            doc.text('NOTE', MARGIN, noteY)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8.5)
            doc.setTextColor(60, 60, 60)
            doc.text(inv.notes, MARGIN, noteY + 6, { maxWidth: PAGE_W - MARGIN * 2 })
        }

        // ── 8. FOOTER BAR ─────────────────────────────────────────
        const footerY = 272
        doc.setFillColor(18, 18, 20)
        doc.rect(0, footerY, PAGE_W, 25, 'F')

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(140, 140, 140)
        doc.text('Thank you for your business!', MARGIN, footerY + 9)
        doc.text('Second Lens Studio  ·  secondlensstudio@gmail.com  ·  +91 7066498198', MARGIN, footerY + 15)

        // Page number right side
        doc.setTextColor(80, 80, 80)
        doc.text('Page 1', RIGHT, footerY + 12, { align: 'right' })

        if (!isPreview) {
            doc.save(`Invoice_${clientName.replace(/\s+/g, '_')}_${format(parseISO(inv.date), 'MMM_yyyy')}.pdf`)
        }
    }


    const handleGenerate = async () => {
        const clientId = customClient.trim() ? customClient.trim() : selectedClient
        if (!clientId) { toast.error('Select or create a client'); return }
        if (items.length === 0 || !items[0].desc) { toast.error('Add at least one item'); return }

        setIsSaving(true)
        const invoiceNumber = generateInvoiceNumber(date, invoices)
        const payload: any = {
            user_id: userId,
            client_id_or_name: clientId,
            amount: grandTotal,
            date: date,
            status: 'Sent',
            items_json: items,
            payment_details_json: { advance, terms, upi, phonepe },
            notes: notes,
            folder_id: selectedFolderId || null,
            advance_received: advanceReceived,
            advance_amount: advanceAmountInput,
            invoice_number: editingId ? undefined : invoiceNumber
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

    // Clicking "Advance Received" sets advance_collected = true
    // This adds the advance amount to Paid Revenue without marking full invoice as Paid
    const handleCollectAdvance = async (inv: Invoice) => {
        const advanceAmt = inv.advance_amount || inv.payment_details_json?.advance || 0
        if (!advanceAmt) { toast.error('No advance amount set on this invoice'); return }

        const { data, error } = await supabase
            .from('invoices')
            .update({ advance_collected: true, advance_received: true })
            .eq('id', inv.id)
            .select()
            .single()

        if (!error && data) {
            setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, advance_collected: true, advance_received: true } : i))
            toast.success(`Advance of ₹${advanceAmt.toLocaleString()} recorded in Paid Revenue`)
        } else {
            toast.error('Failed to record advance')
        }
    }

    // Changing status to Paid adds the remaining balance (total - advance) to Paid Revenue
    const handleStatusChange = async (inv: Invoice, newStatus: string) => {
        const { error } = await retryQuery(() =>
            supabase.from('invoices').update({ status: newStatus }).eq('id', inv.id)
        )
        if (!error) {
            setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: newStatus } : i))
            if (newStatus === 'Paid') {
                const advanceAlreadyCounted = inv.advance_collected
                    ? (inv.advance_amount || inv.payment_details_json?.advance || 0)
                    : 0
                const remaining = inv.amount - advanceAlreadyCounted
                toast.success(
                    advanceAlreadyCounted > 0
                        ? `Marked as Paid — remaining ₹${remaining.toLocaleString()} added to revenue`
                        : `Marked as Paid — ₹${inv.amount.toLocaleString()} added to revenue`
                )
            } else {
                toast.success('Status updated to Sent')
            }
        } else {
            toast.error('Failed to update status')
        }
    }

    const resetForm = () => {
        setEditingId(null)
        setCustomClient('')
        setItems([{ desc: 'Service / Item', qty: 1, price: 5000 }])
        setAdvance(0)
        setAdvanceReceived(false)
        setAdvanceAmountInput(0)
        setSelectedFolderId(activeFolderId || '')
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
        setAdvanceReceived(inv.advance_received || false)
        setAdvanceAmountInput(inv.advance_amount || 0)
        setSelectedFolderId(inv.folder_id || '')
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
                        <CardContent>
                            <p className="text-2xl font-bold text-emerald-400">&#8377;{
                                invoices.reduce((s, i) => {
                                    if (i.status === 'Paid') {
                                        // Full amount — advance already included
                                        return s + i.amount
                                    }
                                    if (i.advance_collected) {
                                        // Only advance portion collected so far
                                        return s + (i.advance_amount || i.payment_details_json?.advance || 0)
                                    }
                                    return s
                                }, 0).toLocaleString()
                            }</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                Pending: &#8377;{
                                    invoices.filter(i => i.status !== 'Paid').reduce((s, i) => {
                                        const adv = i.advance_collected ? (i.advance_amount || i.payment_details_json?.advance || 0) : 0
                                        return s + (i.amount - adv)
                                    }, 0).toLocaleString()
                                }
                            </p>
                        </CardContent>
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
                                    <div className="space-y-2 col-span-2">
                                        <Label>Select Folder</Label>
                                        <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                                            <SelectTrigger><SelectValue placeholder="No Folder" /></SelectTrigger>
                                            <SelectContent className="bg-card">
                                                <SelectItem value="none">No Folder</SelectItem>
                                                {folders.map(f => (
                                                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="advance_rec" checked={advanceReceived} onCheckedChange={(checked) => setAdvanceReceived(!!checked)} />
                                            <Label htmlFor="advance_rec" className="text-sm font-medium leading-none cursor-pointer">Advance Received?</Label>
                                        </div>
                                        {advanceReceived && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <Label>Advance Amount (&#8377;)</Label>
                                                <Input type="number" value={advanceAmountInput} onChange={e => setAdvanceAmountInput(parseInt(e.target.value) || 0)} />
                                            </div>
                                        )}
                                    </div>
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
                                                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full border">{inv.invoice_number || `INV-${inv.id.substring(0, 6).toUpperCase()}`}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-sm text-muted-foreground">{format(parseISO(inv.date), 'MMM d, yyyy')} &bull; &#8377;{inv.amount.toLocaleString()}</span>
                                                {inv.advance_received && (
                                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">Advance: &#8377;{inv.advance_amount?.toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Advance Received button — shows exact advance, disables after clicked */}
                                            {(() => {
                                                const advAmt = inv.advance_amount || inv.payment_details_json?.advance || 0
                                                if (inv.status === 'Paid' || !advAmt) return null
                                                return (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={!!inv.advance_collected}
                                                        className={`h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 hidden sm:flex transition-all ${
                                                            inv.advance_collected
                                                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 opacity-60 cursor-not-allowed'
                                                                : 'border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-500'
                                                        }`}
                                                        onClick={() => !inv.advance_collected && handleCollectAdvance(inv)}
                                                    >
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {inv.advance_collected
                                                            ? `Advance ₹${advAmt.toLocaleString()} ✓`
                                                            : `Advance Received: ₹${advAmt.toLocaleString()}`
                                                        }
                                                    </Button>
                                                )
                                            })()}

                                            {/* Status dropdown — Sent → Paid triggers balance revenue */}
                                            <Select value={inv.status} onValueChange={(val: string) => handleStatusChange(inv, val)}>
                                                <SelectTrigger className={`h-8 border border-white/10 text-xs font-bold px-2 py-1 rounded-full outline-none w-[100px] ${
                                                    inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
                                                }`}>
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