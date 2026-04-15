export type ClientStatus = 'active' | 'at-risk' | 'churned'

export interface Client {
    id: string
    name: string
    company: string
    status: ClientStatus
    healthScore: number // 0-100
    mrr: number
    onboardedAt: string
    email?: string
    phone?: string
    notes?: string
    service?: string
}

export interface Deliverable {
    id: string
    clientId: string
    title: string
    status: 'pending' | 'in-progress' | 'completed'
    dueDate: string
}
