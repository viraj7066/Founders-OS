'use client'

import { useState, useMemo, useEffect } from 'react'
import { Client, ClientStatus } from '@/types/clients'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Search, Building2, Mail, Phone, Activity, Trash2, AlertTriangle, Download, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

interface ClientListProps {
    initialClients: Client[]
    userId: string
}

export function ClientList({ initialClients, userId }: ClientListProps) {
    const supabase = createClient()
    const [clients, setClients] = useState<Client[]>(initialClients)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isEditingClient, setIsEditingClient] = useState(false)
    const [editedClient, setEditedClient] = useState<Partial<Client>>({})
    const [isSaving, setIsSaving] = useState(false)
    const [deleteClientTarget, setDeleteClientTarget] = useState<Client | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    // Invoice tab state
    const [clientInvoices, setClientInvoices] = useState<any[]>([])
    const [invoicesLoading, setInvoicesLoading] = useState(false)
    const [activeDialogTab, setActiveDialogTab] = useState('deliverables')

    // New/Edit Client State
    const [isNewClientOpen, setIsNewClientOpen] = useState(false)
    const [newClient, setNewClient] = useState<Partial<Client>>({
        name: '', company: '', status: 'active', healthScore: 100, mrr: 0, onboardedAt: new Date().toISOString().split('T')[0], email: '', phone: ''
    })

    const filteredClients = useMemo(() => {
        return clients.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.company.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [clients, searchQuery])

    const activeClients = filteredClients.filter(c => c.status === 'active')
    const atRiskClients = filteredClients.filter(c => c.status === 'at-risk')
    const churnedClients = filteredClients.filter(c => c.status === 'churned')

    const getStatusStyle = (status: ClientStatus) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            case 'at-risk': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            case 'churned': return 'bg-red-500/10 text-red-500 border-red-500/20'
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
        }
    }

    const getHealthStyle = (score: number) => {
        if (score >= 80) return 'text-emerald-500'
        if (score >= 50) return 'text-amber-500'
        return 'text-red-500'
    }

    const handleClientClick = (client: Client) => {
        setSelectedClient(client)
        setEditedClient(client)
        setIsEditingClient(false)
        setActiveDialogTab('deliverables')
        setClientInvoices([])
        setIsDetailOpen(true)
    }

    const fetchClientInvoices = async (client: Client) => {
        setInvoicesLoading(true)
        const { data } = await supabase
            .from('invoices')
            .select('*')
            .or(`client_id_or_name.eq.${client.id},client_id_or_name.eq.${client.name}`)
            .order('date', { ascending: false })
        setClientInvoices(data || [])
        setInvoicesLoading(false)
    }

    const handleDeleteClient = async () => {
        if (!deleteClientTarget) return
        setIsDeleting(true)
        const { error } = await supabase.from('clients').delete().eq('id', deleteClientTarget.id)
        if (!error) {
            setClients(prev => prev.filter(c => c.id !== deleteClientTarget.id))
            setIsDetailOpen(false)
            setSelectedClient(null)
            router.refresh()
        } else {
            toast.error('Failed to delete client')
        }
        setIsDeleting(false)
        setDeleteClientTarget(null)
    }

    const handleSaveNewClient = async () => {
        if (!newClient.name || !newClient.company || !newClient.service) return
        setIsSaving(true)

        const clientData = {
            user_id: userId,
            name: newClient.name,
            company: newClient.company,
            status: newClient.status || 'active',
            health_score: newClient.healthScore || 100,
            mrr: newClient.mrr || 0,
            onboarded_at: newClient.onboardedAt || new Date().toISOString().split('T')[0],
            email: newClient.email,
            phone: newClient.phone,
            service: newClient.service
        }
        const { data, error } = await supabase
            .from('clients')
            .insert(clientData)
            .select('id')
            .single()

        if (!error && data) {
            const clientToAdd: Client = {
                id: data.id,
                name: newClient.name,
                company: newClient.company,
                status: newClient.status as ClientStatus || 'active',
                healthScore: newClient.healthScore || 100,
                mrr: newClient.mrr || 0,
                onboardedAt: newClient.onboardedAt || new Date().toISOString().split('T')[0],
                email: newClient.email,
                phone: newClient.phone,
                service: newClient.service
            }
            setClients([clientToAdd, ...clients])
            setNewClient({ name: '', company: '', status: 'active', healthScore: 100, mrr: 0, onboardedAt: new Date().toISOString().split('T')[0], email: '', phone: '', service: '' })
            setIsNewClientOpen(false)
            router.refresh()
        } else {
            console.error('Supabase Insert Error:', error)
        }
        setIsSaving(false)
    }

    const handleSaveEditClient = async () => {
        if (!selectedClient || !editedClient.name || !editedClient.company || !editedClient.service) return
        setIsSaving(true)

        const updateData = {
            name: editedClient.name,
            company: editedClient.company,
            status: editedClient.status,
            health_score: editedClient.healthScore,
            mrr: editedClient.mrr,
            email: editedClient.email,
            phone: editedClient.phone,
            service: editedClient.service
        }

        const { error } = await supabase.from('clients').update(updateData).eq('id', selectedClient.id)
        if (!error) {
            setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, ...editedClient } as Client : c))
            setSelectedClient({ ...selectedClient, ...editedClient } as Client)
            setIsEditingClient(false)
            router.refresh()
        } else {
            console.error('Update failed:', error)
        }
        setIsSaving(false)
    }

    const renderClientTable = (clientList: Client[]) => (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden mt-4">
            <Table>
                <TableHeader className="bg-secondary/30">
                    <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-muted-foreground font-semibold">Client</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Contact</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Health</TableHead>
                        <TableHead className="text-right text-muted-foreground font-semibold">MRR</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clientList.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No clients found.
                            </TableCell>
                        </TableRow>
                    ) : clientList.map((client) => (
                        <TableRow
                            key={client.id}
                            onClick={() => handleClientClick(client)}
                            className="border-border/50 hover:bg-secondary/40 cursor-pointer transition-colors group"
                        >
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{client.company}</span>
                                    <span className="text-sm text-muted-foreground flex items-center mt-0.5">
                                        <Building2 className="w-3 h-3 mr-1 opacity-70" />
                                        {client.name}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                    {client.email && (
                                        <span className="flex items-center"><Mail className="w-3 h-3 mr-1.5 opacity-70" /> {client.email}</span>
                                    )}
                                    {client.phone && (
                                        <span className="flex items-center"><Phone className="w-3 h-3 mr-1.5 opacity-70" /> {client.phone}</span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`font-semibold capitalize ${getStatusStyle(client.status)}`}>
                                    {client.status.replace('-', ' ')}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Activity className={`w-4 h-4 ${getHealthStyle(client.healthScore)}`} />
                                    <span className={`font-semibold ${getHealthStyle(client.healthScore)}`}>{client.healthScore}/100</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-foreground">
                                ₹{client.mrr.toLocaleString()}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-card border-border text-foreground focus:ring-primary transition-all"
                    />
                </div>
                <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="h-4 w-4 mr-2" /> Add Client
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-foreground">New Client Setup</DialogTitle>
                            <DialogDescription>Add a new active client to your command center database.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="company" className="text-foreground">Company Name</Label>
                                    <Input id="company" value={newClient.company} onChange={e => setNewClient({ ...newClient, company: e.target.value })} className="bg-secondary/50 border-border" placeholder="Acme Corp" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="text-foreground">Primary Contact</Label>
                                    <Input id="name" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className="bg-secondary/50 border-border" placeholder="John Doe" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="text-foreground">Email</Label>
                                    <Input id="email" type="email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} className="bg-secondary/50 border-border" placeholder="john@acme.com" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone" className="text-foreground">Phone</Label>
                                    <Input id="phone" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} className="bg-secondary/50 border-border" placeholder="+1..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="mrr" className="text-foreground">Monthly Retainer (₹)</Label>
                                    <Input id="mrr" type="number" value={newClient.mrr} onChange={e => setNewClient({ ...newClient, mrr: parseInt(e.target.value) || 0 })} className="bg-secondary/50 border-border" placeholder="2000" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="status" className="text-foreground">Status</Label>
                                    <Select value={newClient.status} onValueChange={(val: ClientStatus) => setNewClient({ ...newClient, status: val })}>
                                        <SelectTrigger className="bg-secondary/50 border-border text-foreground">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="active" className="focus:bg-primary/20 focus:text-primary">Active</SelectItem>
                                            <SelectItem value="at-risk" className="focus:bg-amber-500/20 focus:text-amber-500">At-Risk</SelectItem>
                                            <SelectItem value="churned" className="focus:bg-red-500/20 focus:text-red-500">Churned</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="service" className="text-foreground">Service <span className="text-red-500">*</span></Label>
                                <Select value={newClient.service?.startsWith('Custom:') ? 'Custom' : (newClient.service || '')} onValueChange={val => {
                                    if(val === 'Custom') setNewClient({...newClient, service: 'Custom: '})
                                    else setNewClient({...newClient, service: val})
                                }}>
                                    <SelectTrigger className="bg-secondary/50 border-border text-foreground">
                                        <SelectValue placeholder="Select a service" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="AI Automations">AI Automations</SelectItem>
                                        <SelectItem value="AI Shoot">AI Shoot</SelectItem>
                                        <SelectItem value="Websites">Websites</SelectItem>
                                        <SelectItem value="AI Powered Content">AI Powered Content</SelectItem>
                                        <SelectItem value="Custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                                {newClient.service?.startsWith('Custom:') && (
                                    <Input 
                                        value={newClient.service.replace('Custom: ', '')} 
                                        onChange={e => setNewClient({ ...newClient, service: 'Custom: ' + e.target.value })} 
                                        className="bg-secondary/50 border-border mt-1" 
                                        placeholder="Enter custom service" 
                                    />
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveNewClient} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                {isSaving ? 'Saving...' : 'Save Client'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-secondary/50 border border-border/50 p-1">
                    <TabsTrigger value="all" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">All Clients ({filteredClients.length})</TabsTrigger>
                    <TabsTrigger value="active" className="data-[state=active]:bg-card data-[state=active]:text-emerald-500 data-[state=active]:shadow-sm">Active ({activeClients.length})</TabsTrigger>
                    <TabsTrigger value="at-risk" className="data-[state=active]:bg-card data-[state=active]:text-amber-500 data-[state=active]:shadow-sm">At-Risk ({atRiskClients.length})</TabsTrigger>
                    <TabsTrigger value="churned" className="data-[state=active]:bg-card data-[state=active]:text-red-500 data-[state=active]:shadow-sm">Churned ({churnedClients.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4 outline-none">
                    {renderClientTable(filteredClients)}
                </TabsContent>
                <TabsContent value="active" className="mt-4 outline-none">
                    {renderClientTable(activeClients)}
                </TabsContent>
                <TabsContent value="at-risk" className="mt-4 outline-none">
                    {renderClientTable(atRiskClients)}
                </TabsContent>
                <TabsContent value="churned" className="mt-4 outline-none">
                    {renderClientTable(churnedClients)}
                </TabsContent>
            </Tabs>

            {/* Client Detail Modal */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="bg-card border-border sm:max-w-[700px] h-[80vh] flex flex-col p-0 overflow-hidden">
                    {selectedClient && (
                        <>
                            <DialogHeader className="p-6 pb-0">
                                <div className="flex items-start justify-between">
                                    {isEditingClient ? (
                                        <div className="w-full space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs">Company Name</Label>
                                                    <Input value={editedClient.company || ''} onChange={e => setEditedClient({ ...editedClient, company: e.target.value })} className="bg-secondary/50 mt-1" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Client Name</Label>
                                                    <Input value={editedClient.name || ''} onChange={e => setEditedClient({ ...editedClient, name: e.target.value })} className="bg-secondary/50 mt-1" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">{selectedClient.company}</DialogTitle>
                                            <DialogDescription className="mt-1 flex items-center gap-2">
                                                <span>{selectedClient.name}</span>
                                                <span>•</span>
                                                <span>Onboarded: {new Date(selectedClient.onboardedAt).toLocaleDateString()}</span>
                                            </DialogDescription>
                                        </div>
                                    )}
                                    {!isEditingClient && (
                                        <Badge variant="outline" className={`font-bold capitalize text-sm px-3 py-1 ${getStatusStyle(selectedClient.status)}`}>
                                            {selectedClient.status.replace('-', ' ')}
                                        </Badge>
                                    )}
                                </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-6 pt-6">
                                {isEditingClient ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs">Email</Label>
                                                <Input value={editedClient.email || ''} onChange={e => setEditedClient({ ...editedClient, email: e.target.value })} className="bg-secondary/50 mt-1" />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Phone</Label>
                                                <Input value={editedClient.phone || ''} onChange={e => setEditedClient({ ...editedClient, phone: e.target.value })} className="bg-secondary/50 mt-1" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-4">
                                            <div>
                                                <Label className="text-xs">MRR (₹)</Label>
                                                <Input type="number" value={editedClient.mrr || 0} onChange={e => setEditedClient({ ...editedClient, mrr: parseInt(e.target.value) || 0 })} className="bg-secondary/50 mt-1" />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Health Score (0-100)</Label>
                                                <Input type="number" max={100} min={0} value={editedClient.healthScore || 0} onChange={e => setEditedClient({ ...editedClient, healthScore: parseInt(e.target.value) || 0 })} className="bg-secondary/50 mt-1" />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Status</Label>
                                                <Select value={editedClient.status} onValueChange={(val: ClientStatus) => setEditedClient({ ...editedClient, status: val })}>
                                                    <SelectTrigger className="bg-secondary/50 border-border mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-card">
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="at-risk">At-Risk</SelectItem>
                                                        <SelectItem value="churned">Churned</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-3">
                                                <Label className="text-xs">Service <span className="text-red-500">*</span></Label>
                                                <Select value={editedClient.service?.startsWith('Custom:') ? 'Custom' : (editedClient.service || '')} onValueChange={val => {
                                                    if(val === 'Custom') setEditedClient({...editedClient, service: 'Custom: '})
                                                    else setEditedClient({...editedClient, service: val})
                                                }}>
                                                    <SelectTrigger className="bg-secondary/50 border-border mt-1">
                                                        <SelectValue placeholder="Select a service" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-card">
                                                        <SelectItem value="AI Automations">AI Automations</SelectItem>
                                                        <SelectItem value="AI Shoot">AI Shoot</SelectItem>
                                                        <SelectItem value="Websites">Websites</SelectItem>
                                                        <SelectItem value="AI Powered Content">AI Powered Content</SelectItem>
                                                        <SelectItem value="Custom">Custom</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {editedClient.service?.startsWith('Custom:') && (
                                                    <Input 
                                                        value={editedClient.service.replace('Custom: ', '')} 
                                                        onChange={e => setEditedClient({ ...editedClient, service: 'Custom: ' + e.target.value })} 
                                                        className="bg-secondary/50 mt-2" 
                                                        placeholder="Enter custom service" 
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                            <Card className="bg-secondary/30 border-border/50 shadow-none col-span-1">
                                                <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                                                    <p className="text-sm font-medium text-muted-foreground mb-1">Health Score</p>
                                                    <div className={`text-4xl font-bold ${getHealthStyle(selectedClient.healthScore)} mb-2 flex items-center`}>
                                                        <Activity className="w-8 h-8 mr-2" />
                                                        {selectedClient.healthScore}
                                                    </div>
                                                    <div className="w-full bg-secondary rounded-full h-2 mt-2">
                                                        <div className={`h-full rounded-full ${selectedClient.healthScore >= 80 ? 'bg-emerald-500' : selectedClient.healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${selectedClient.healthScore}%` }} />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-secondary/30 border-border/50 shadow-none col-span-2">
                                                <CardContent className="p-4 flex flex-col justify-center h-full space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-muted-foreground">Monthly Retainer (MRR)</span>
                                                        <span className="text-lg font-bold text-foreground">₹{selectedClient.mrr.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-muted-foreground">Primary Contact</span>
                                                        <div className="flex items-center gap-3">
                                                            {selectedClient.email && <span className="text-sm text-foreground flex items-center"><Mail className="w-3.5 h-3.5 mr-1" /> {selectedClient.email}</span>}
                                                            {selectedClient.phone && <span className="text-sm text-foreground flex items-center"><Phone className="w-3.5 h-3.5 mr-1" /> {selectedClient.phone}</span>}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        <Tabs value={activeDialogTab} onValueChange={(tab) => {
                                                setActiveDialogTab(tab)
                                                if (tab === 'invoices' && selectedClient) fetchClientInvoices(selectedClient)
                                            }} className="w-full">
                                            <TabsList className="bg-secondary/50 border border-border/50 w-full justify-start rounded-b-none border-b-0 pb-0 px-2 pt-2">
                                                <TabsTrigger value="deliverables" className="data-[state=active]:bg-card data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none rounded-t-md">Deliverables</TabsTrigger>
                                                <TabsTrigger value="notes" className="data-[state=active]:bg-card data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none rounded-t-md">Strategic Notes</TabsTrigger>
                                                <TabsTrigger value="invoices" className="data-[state=active]:bg-card data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none rounded-t-md">Invoices</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="deliverables" className="bg-card border-x border-b border-border/50 p-4 rounded-b-xl m-0 outline-none">
                                                <div className="space-y-3">
                                                    <div className="text-sm text-muted-foreground italic mb-2">View real-time deliverables in the Delivery Tracker module.</div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="notes" className="bg-card border-x border-b border-border/50 p-4 rounded-b-xl m-0 outline-none">
                                                <p className="text-sm text-muted-foreground italic mb-4">Add high-level strategic notes and retention triggers for this client.</p>
                                                <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-sm text-foreground mb-3">
                                                    Client wants to expand ad spend by 20% next quarter if ROAS stays above 3.5x. Follow up regarding dynamic creative testing.
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="invoices" className="bg-card border-x border-b border-border/50 p-4 rounded-b-xl m-0 outline-none">
                                                {invoicesLoading ? (
                                                    <div className="text-center py-6 text-sm text-muted-foreground">Loading invoices…</div>
                                                ) : clientInvoices.length === 0 ? (
                                                    <div className="text-center py-6 text-sm text-muted-foreground">No invoices found for this client</div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {clientInvoices.map((inv: any) => (
                                                            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                                                        <span className="text-sm font-semibold">{inv.invoice_number || `INV-${inv.id.substring(0, 6).toUpperCase()}`}</span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">{inv.date ? format(parseISO(inv.date), 'MMM d, yyyy') : '—'} • ₹{(inv.amount || 0).toLocaleString()}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className={`text-xs font-semibold ${inv.status === 'Paid' ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' : inv.status === 'Overdue' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 'text-amber-500 border-amber-500/30 bg-amber-500/10'}`}>{inv.status}</Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </TabsContent>
                                        </Tabs>
                                    </>
                                )}
                            </div>

                            <DialogFooter className="p-4 border-t border-border/50 bg-secondary/10 flex justify-between items-center">
                                {isEditingClient ? (
                                    <>
                                        <Button variant="ghost" onClick={() => setIsEditingClient(false)}>Cancel</Button>
                                        <Button onClick={handleSaveEditClient} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="ghost" onClick={() => setDeleteClientTarget(selectedClient)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete Client
                                        </Button>
                                        <div className="space-x-2">
                                            <Button variant="outline" onClick={() => setIsEditingClient(true)} className="border-border mr-2">Edit Client</Button>
                                            <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="border-border">Close</Button>
                                        </div>
                                    </>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteClientTarget} onOpenChange={open => { if (!open) setDeleteClientTarget(null) }}>
                <DialogContent className="sm:max-w-[380px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <AlertTriangle className="w-4 h-4 text-red-500" /> Delete Client?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteClientTarget?.name}</span> from <span className="font-semibold text-foreground">{deleteClientTarget?.company}</span>? All their data will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setDeleteClientTarget(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteClient} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
                            {isDeleting ? 'Deleting…' : 'Delete Client'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
