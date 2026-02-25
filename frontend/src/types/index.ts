export interface Article {
  id: number
  sourceId: number
  sourceName: string
  sourceType?: 'RSS' | 'WEB_SCRAPE' | 'TELEGRAM'
  language?: 'ARMENIAN' | 'RUSSIAN' | 'ENGLISH'
  topicId?: number
  topicName?: string
  title: string
  snippet?: string
  url: string
  author?: string
  publishedAt: string
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  confidence?: number
}

export interface Source {
  id: number
  name: string
  url: string
  type: 'RSS' | 'WEB_SCRAPE' | 'TELEGRAM'
  language: 'ARMENIAN' | 'RUSSIAN' | 'ENGLISH'
  active: boolean
  lastFetched?: string
  lastSuccess?: string
}

export interface SentimentAggregate {
  group: string
  positive: number
  negative: number
  neutral: number
  total: number
}

export interface Topic {
  id: number
  name: string
  keywords: string[]
  sourceIds?: number[]
  createdAt: string
  globalSearch?: boolean
  language?: string
  searchIntervalMinutes?: number
  lastSearchedAt?: string
}

export interface Alert {
  id: number
  topicId?: number
  condition: {
    type: 'spike' | 'threshold'
    value: number
  }
  channel: 'EMAIL' | 'WEBHOOK'
  active: boolean
}

export interface CoordinationEvent {
  id: number
  narrativeId: number | null
  narrativeName: string | null
  detectedAt: string
  timeWindowHours: number
  sourceCount: number
  articleCount: number
  similarityScore: number
  coordinationType: 'TIMING' | 'CONTENT' | 'TIMING_AND_CONTENT'
  description: string | null
  sourcesInvolved: string[]
  articleIds: number[]
  status: 'ACTIVE' | 'REVIEWED' | 'DISMISSED'
  reviewedAt: string | null
  reviewedByName: string | null
  createdAt: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

// User Management Types
export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ANALYST' | 'VIEWER'

export interface Organization {
  id: number
  name: string
  slug: string
  description?: string
  tier: 'FREE' | 'STANDARD' | 'ENTERPRISE'
  active: boolean
  maxUsers: number
  maxSources: number
  maxNarratives: number
  currentUsers: number
  createdAt: string
}

export interface TeamMember {
  id: number
  email: string
  name: string
  role: UserRole
  organizationId: number
  organizationName?: string
  enabled: boolean
  createdAt: string
  lastLogin?: string
}

// Discussion Types
export type DiscussionType = 'GENERAL' | 'NARRATIVE' | 'ALERT'

export interface DiscussionThread {
  id: number
  title: string
  content: string
  pinned: boolean
  author: TeamMember
  replyCount: number
  discussionType: DiscussionType
  narrativeId?: number
  narrativeName?: string
  alertId?: number
  alertTitle?: string
  createdAt: string
  updatedAt?: string
}

export interface DiscussionReply {
  id: number
  content: string
  author: TeamMember
  createdAt: string
  updatedAt?: string
}

export interface ThreadDetail {
  thread: DiscussionThread
  replies: DiscussionReply[]
}

export interface Mention {
  id: number
  threadId: number
  threadTitle: string
  replyId?: number
  mentioner: TeamMember
  isRead: boolean
  createdAt: string
}

export interface ThreadCreateRequest {
  title: string
  content: string
  discussionType?: DiscussionType
  narrativeId?: number
  alertId?: number
}

export interface Bookmark {
  id: number
  articleId: number
  createdAt: string
}
