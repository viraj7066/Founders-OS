export type OutreachPlatform = 'linkedin' | 'email' | 'whatsapp' | 'instagram'
export type ScriptCategory = 'cold' | 'follow-up' | 'inbound'
export type CampaignStatus = 'active' | 'paused' | 'completed'
export type CommType = 'email' | 'linkedin' | 'call' | 'meeting'
export type CommDirection = 'inbound' | 'outbound'

export interface OutreachScript {
    id: string
    userId: string
    title: string
    platform: OutreachPlatform
    content: string
    category: ScriptCategory
    createdAt: string
    updatedAt: string
}

export interface Campaign {
    id: string
    userId: string
    name: string
    status: CampaignStatus
    targetAudience?: string
    createdAt: string
    updatedAt: string
}

export interface Communication {
    id: string
    userId: string
    leadId?: string
    type: CommType
    direction: CommDirection
    content?: string
    scheduledAt?: string
    completedAt?: string
    createdAt: string
}
