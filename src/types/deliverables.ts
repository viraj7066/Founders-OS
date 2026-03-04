export type DeliverableStatus = 'pending' | 'in-progress' | 'review' | 'completed'
export type Priority = 'low' | 'medium' | 'high'

export interface Deliverable {
    id: string
    clientId: string
    clientName: string // denormalized for easy display
    title: string
    status: DeliverableStatus
    priority: Priority
    dueDate: string
    assignedTo?: string
}
