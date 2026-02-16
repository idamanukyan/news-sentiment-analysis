export interface Article {
  id: number
  sourceId: number
  sourceName: string
  title: string
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

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}
