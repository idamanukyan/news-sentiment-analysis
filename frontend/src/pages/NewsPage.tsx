import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { articlesApi, topicsApi, sourcesApi, narrativesApi, bookmarksApi } from '../services/api'
import { useDateRangeStore } from '../contexts/dateRangeStore'
import { useWebSocket } from '../hooks/useWebSocket'
import type { ArticleFilterParams } from '../services/api'
import type { Article, Topic, PageResponse } from '../types'
import { formatDistanceToNow, subHours, subDays, startOfDay } from 'date-fns'
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Newspaper,
  Radio,
  Globe,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Power,
  Trash2,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Wifi,
  WifiOff,
  Facebook,
} from 'lucide-react'

const SENTIMENTS = [
  { value: '', labelKey: 'filters.allSentiments' },
  { value: 'POSITIVE', labelKey: 'filters.positive' },
  { value: 'NEGATIVE', labelKey: 'filters.negative' },
  { value: 'NEUTRAL', labelKey: 'filters.neutral' },
]

const LANGUAGES = [
  { value: '', labelKey: 'filters.allLanguages' },
  { value: 'ARMENIAN', labelKey: 'filters.armenian' },
  { value: 'RUSSIAN', labelKey: 'filters.russian' },
  { value: 'ENGLISH', labelKey: 'filters.english' },
]

const SOURCE_TYPES = [
  { value: '', labelKey: 'filters.allTypes' },
  { value: 'RSS', labelKey: 'filters.rssFeeds' },
  { value: 'TELEGRAM', labelKey: 'filters.telegram' },
  { value: 'FACEBOOK', labelKey: 'filters.facebook' },
  { value: 'WEB_SCRAPE', labelKey: 'filters.webScrape' },
]

const DATE_PRESETS = [
  { value: '', labelKey: 'dateRanges.allTime' },
  { value: '24h', labelKey: 'dateRanges.last24Hours' },
  { value: '7d', labelKey: 'dateRanges.last7Days' },
  { value: '30d', labelKey: 'dateRanges.last30Days' },
  { value: 'today', labelKey: 'dateRanges.today' },
]

const SUGGESTED_CHANNELS = [
  { handle: '@armabordarj', name: 'Armenian Border Info', language: 'ARMENIAN' },
  { handle: '@news_arm', name: 'News Armenia', language: 'ARMENIAN' },
  { handle: '@factor_tv', name: 'Factor TV', language: 'ARMENIAN' },
  { handle: '@ArmLur', name: 'ArmLur News', language: 'ARMENIAN' },
  { handle: '@civilnet_tv', name: 'CivilNet', language: 'ARMENIAN' },
  { handle: '@azabordarj', name: 'Azerbaijan Border Info', language: 'RUSSIAN' },
]

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function ArticleCardSkeleton() {
  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-5 w-14 rounded-full" />
      </div>
      <div className="skeleton h-6 w-3/4 mb-2" />
      <div className="skeleton h-4 w-full mb-1" />
      <div className="skeleton h-4 w-2/3 mb-3" />
      <div className="flex gap-3">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-3 w-16" />
      </div>
    </div>
  )
}

function SentimentBadge({ sentiment, confidence }: { sentiment?: string; confidence?: number }) {
  if (!sentiment) return <span className="badge badge-gray">Pending</span>

  const badges: Record<string, string> = {
    POSITIVE: 'badge-green',
    NEGATIVE: 'badge-red',
    NEUTRAL: 'badge-gray',
  }

  return (
    <span className={`badge ${badges[sentiment] || 'badge-gray'}`}>
      {sentiment.charAt(0) + sentiment.slice(1).toLowerCase()}
      {confidence !== undefined && <span className="ml-1 opacity-60">({Math.round(confidence * 100)}%)</span>}
    </span>
  )
}

function SourceTypeBadge({ sourceType }: { sourceType?: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
    RSS: { className: 'badge-blue', icon: <Newspaper size={12} />, label: 'RSS' },
    WEB_SCRAPE: { className: 'badge-green', icon: <Globe size={12} />, label: 'Web' },
    TELEGRAM: { className: 'bg-sky-100 text-sky-700', icon: <Radio size={12} />, label: 'Telegram' },
    FACEBOOK: { className: 'bg-blue-100 text-blue-700', icon: <Facebook size={12} />, label: 'Facebook' },
  }

  const { className, icon, label } = config[sourceType || ''] || { className: 'badge-gray', icon: <FileText size={12} />, label: 'News' }

  return (
    <span className={`badge ${className} flex items-center gap-1`}>
      {icon}
      {label}
    </span>
  )
}

function LanguageBadge({ language }: { language?: string }) {
  if (!language) return null

  const flags: Record<string, string> = {
    ARMENIAN: '🇦🇲',
    RUSSIAN: '🇷🇺',
    ENGLISH: '🇬🇧',
  }

  return (
    <span className="text-sm" title={language}>
      {flags[language] || '🌍'}
    </span>
  )
}

function CredibilityDot({ score }: { score?: number }) {
  if (score === undefined || score === null) return null

  const getConfig = (s: number) => {
    if (s >= 0.7) return { color: 'bg-green-500', label: 'High reliability' }
    if (s >= 0.4) return { color: 'bg-yellow-500', label: 'Medium reliability' }
    return { color: 'bg-red-500', label: 'Low reliability' }
  }

  const config = getConfig(score)

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${config.color}`}
      title={`${config.label} (${Math.round(score * 100)}%)`}
    />
  )
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return dateString
  }
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>

  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function getDateFromPreset(preset: string): string | undefined {
  const now = new Date()
  switch (preset) {
    case '24h':
      return subHours(now, 24).toISOString()
    case '7d':
      return subDays(now, 7).toISOString()
    case '30d':
      return subDays(now, 30).toISOString()
    case 'today':
      return startOfDay(now).toISOString()
    default:
      return undefined
  }
}

interface Source {
  id: number
  name: string
  type: string
  url: string
  language: string
  active: boolean
  lastFetched?: string
  lastSuccess?: string
  articleCount?: number
  credibilityScore?: number
}

interface Narrative {
  id: number
  name: string
  threatLevel: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function NewsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'content' | 'telegram'>('content')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 -mx-4 sm:mx-0 px-4 sm:px-0">
        <nav className="flex gap-4 sm:gap-8">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'content'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Newspaper size={16} />
            <span className="hidden sm:inline">{t('news.tabs.allContent')}</span>
            <span className="sm:hidden">{t('news.tabs.content')}</span>
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'telegram'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Radio size={16} />
            <span className="hidden sm:inline">{t('news.tabs.telegramChannels')}</span>
            <span className="sm:hidden">{t('news.tabs.telegram')}</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'content' ? <ContentFeedTab /> : <TelegramChannelsTab />}
    </div>
  )
}

// ============================================================================
// CONTENT FEED TAB
// ============================================================================

function ContentFeedTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { dateRange, getDateRange } = useDateRangeStore()

  // WebSocket for real-time article updates
  const onArticleUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['news-articles'] })
  }, [queryClient])

  const { isConnected } = useWebSocket({
    onArticle: onArticleUpdate,
    showToasts: false, // Don't show toasts for new articles, just refresh the list
  })

  const [filters, setFilters] = useState({
    topicId: '',
    sourceIds: [] as number[],
    narrativeId: '',
    sentiment: '',
    language: '',
    sourceType: '',
    datePreset: '', // Keep for local custom range override
    fromDate: '',
    toDate: '',
    q: '',
    searchContent: false,
    page: 0,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSourcesDropdown, setShowSourcesDropdown] = useState(false)
  const sourcesDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sourcesDropdownRef.current && !sourcesDropdownRef.current.contains(event.target as Node)) {
        setShowSourcesDropdown(false)
      }
    }
    if (showSourcesDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSourcesDropdown])

  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await topicsApi.getAll()
      return res.data as Topic[]
    },
  })

  const { data: sources } = useQuery({
    queryKey: ['sources-list'],
    queryFn: async () => {
      const res = await sourcesApi.getAll({ active: true })
      return res.data as Source[]
    },
  })

  const { data: narrativesData } = useQuery({
    queryKey: ['narratives-list'],
    queryFn: async () => {
      const res = await narrativesApi.getAll()
      return res.data
    },
  })

  const narratives = narrativesData?.content || []

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['news-articles', filters, dateRange],
    queryFn: async () => {
      const params: ArticleFilterParams = {
        page: filters.page,
        size: 20,
      }
      if (filters.topicId) params.topicId = Number(filters.topicId)
      if (filters.sourceIds.length > 0) params.sourceIds = filters.sourceIds
      if (filters.narrativeId) params.narrativeId = Number(filters.narrativeId)
      if (filters.sentiment) params.sentiment = filters.sentiment
      if (filters.language) params.language = filters.language
      if (filters.sourceType) params.sourceType = filters.sourceType
      if (filters.q) params.q = filters.q
      if (filters.searchContent) params.searchContent = true

      // Custom date range takes priority over preset, then global date range
      if (filters.fromDate) {
        params.from = new Date(filters.fromDate).toISOString()
      } else if (filters.datePreset) {
        const fromDate = getDateFromPreset(filters.datePreset)
        if (fromDate) params.from = fromDate
      } else {
        // Use global date range from header
        const globalRange = getDateRange()
        if (globalRange.from) params.from = globalRange.from.toISOString()
        if (globalRange.to) params.to = globalRange.to.toISOString()
      }
      if (filters.toDate) {
        // Set to end of day for the to date
        const endDate = new Date(filters.toDate)
        endDate.setHours(23, 59, 59, 999)
        params.to = endDate.toISOString()
      }

      const res = await articlesApi.getAll(params)
      return res.data as PageResponse<Article>
    },
  })

  // Query for bookmark status of current articles
  const { data: bookmarkedIds = new Set<number>() } = useQuery({
    queryKey: ['bookmarked-ids', articlesData?.content?.map(a => a.id)],
    queryFn: async () => {
      if (!articlesData?.content?.length) return new Set<number>()
      const ids = articlesData.content.map(a => a.id)
      const res = await bookmarksApi.checkBatch(ids)
      return new Set(res.data)
    },
    enabled: !!articlesData?.content?.length,
  })

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async ({ articleId, isBookmarked }: { articleId: number; isBookmarked: boolean }) => {
      if (isBookmarked) {
        await bookmarksApi.remove(articleId)
      } else {
        await bookmarksApi.add(articleId)
      }
      return { articleId, wasBookmarked: isBookmarked }
    },
    onSuccess: ({ wasBookmarked }) => {
      queryClient.invalidateQueries({ queryKey: ['bookmarked-ids'] })
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      toast.success(wasBookmarked ? 'Bookmark removed' : 'Article bookmarked')
    },
  })

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters({ ...filters, [key]: value, page: 0 })
  }

  const clearFilters = () => {
    setFilters({
      topicId: '',
      sourceIds: [],
      narrativeId: '',
      sentiment: '',
      language: '',
      sourceType: '',
      datePreset: '',
      fromDate: '',
      toDate: '',
      q: '',
      searchContent: false,
      page: 0,
    })
  }

  const hasActiveFilters = filters.topicId || filters.sourceIds.length > 0 || filters.narrativeId ||
    filters.sentiment || filters.language || filters.sourceType || filters.datePreset ||
    filters.fromDate || filters.toDate || filters.q

  const activeFilterCount = [
    filters.topicId, filters.sourceIds.length > 0, filters.narrativeId,
    filters.sentiment, filters.language, filters.sourceType,
    filters.datePreset || filters.fromDate, filters.toDate
  ].filter(Boolean).length

  const toggleSourceSelection = (sourceId: number) => {
    const newSourceIds = filters.sourceIds.includes(sourceId)
      ? filters.sourceIds.filter(id => id !== sourceId)
      : [...filters.sourceIds, sourceId]
    setFilters({ ...filters, sourceIds: newSourceIds, page: 0 })
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      {articlesData && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{articlesData.totalElements.toLocaleString()}</span> articles found
              {hasActiveFilters && ' with current filters'}
            </p>
            {/* Real-time connection indicator */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
              isConnected
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'
            }`}>
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Filters Card */}
      <div className="card">
        <div className="p-4 space-y-4">
          {/* Primary Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search */}
            <div className="md:col-span-5">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={filters.q}
                  onChange={(e) => handleFilterChange('q', e.target.value)}
                  className="input pl-10 pr-10"
                />
                {filters.q && (
                  <button
                    onClick={() => handleFilterChange('q', '')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Sentiment */}
            <div className="md:col-span-2">
              <select
                value={filters.sentiment}
                onChange={(e) => handleFilterChange('sentiment', e.target.value)}
                className="input"
              >
                {SENTIMENTS.map((s) => (
                  <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
                ))}
              </select>
            </div>

            {/* Date - Preset or Custom */}
            <div className="md:col-span-2">
              {!filters.fromDate && !filters.toDate ? (
                <div className="relative">
                  <select
                    value={filters.datePreset}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        // Switch to custom mode by setting fromDate
                        const today = new Date().toISOString().split('T')[0]
                        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        setFilters({ ...filters, datePreset: '', fromDate: weekAgo, toDate: today, page: 0 })
                      } else {
                        handleFilterChange('datePreset', e.target.value)
                      }
                    }}
                    className="input"
                  >
                    {DATE_PRESETS.map((d) => (
                      <option key={d.value} value={d.value}>{t(d.labelKey)}</option>
                    ))}
                    <option value="custom">{t('dateRanges.customRange')}</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value, datePreset: '', page: 0 })}
                    className="input text-sm flex-1"
                  />
                  <span className="text-gray-400 text-sm">{t('common.to')}</span>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value, datePreset: '', page: 0 })}
                    className="input text-sm flex-1"
                  />
                  <button
                    onClick={() => setFilters({ ...filters, fromDate: '', toDate: '', page: 0 })}
                    className="text-gray-400 hover:text-gray-600"
                    title="Clear date range"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Source Type */}
            <div className="md:col-span-2">
              <select
                value={filters.sourceType}
                onChange={(e) => handleFilterChange('sourceType', e.target.value)}
                className="input"
              >
                {SOURCE_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>{t(st.labelKey)}</option>
                ))}
              </select>
            </div>

            {/* Toggle Advanced */}
            <div className="md:col-span-1">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`btn btn-secondary w-full justify-center ${activeFilterCount > 0 ? 'border-primary-300 bg-primary-50' : ''}`}
                title={showAdvanced ? 'Hide filters' : 'More filters'}
              >
                <Filter size={16} />
                {activeFilterCount > 0 && (
                  <span className="bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100 animate-fade-in">
              {/* Sources - Multi-Select */}
              <div className="relative" ref={sourcesDropdownRef}>
                <label className="label">Sources</label>
                <button
                  type="button"
                  onClick={() => setShowSourcesDropdown(!showSourcesDropdown)}
                  className="input w-full text-left flex items-center justify-between"
                >
                  <span className={filters.sourceIds.length === 0 ? 'text-gray-500' : ''}>
                    {filters.sourceIds.length === 0
                      ? 'All Sources'
                      : `${filters.sourceIds.length} selected`}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showSourcesDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Multi-select dropdown */}
                {showSourcesDropdown && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {/* Select All / Clear */}
                    <div className="p-2 border-b border-gray-100 dark:border-slate-700 flex justify-between">
                      <button
                        onClick={() => {
                          if (sources) setFilters({ ...filters, sourceIds: sources.map(s => s.id), page: 0 })
                        }}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setFilters({ ...filters, sourceIds: [], page: 0 })}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    </div>
                    {/* Source list */}
                    <div className="p-1">
                      {sources?.map((source) => (
                        <label
                          key={source.id}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={filters.sourceIds.includes(source.id)}
                            onChange={() => toggleSourceSelection(source.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                            {source.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {source.type}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected sources tags */}
                {filters.sourceIds.length > 0 && filters.sourceIds.length <= 3 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {filters.sourceIds.map(id => {
                      const source = sources?.find(s => s.id === id)
                      return source ? (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs"
                        >
                          {source.name.length > 15 ? source.name.slice(0, 15) + '...' : source.name}
                          <button
                            onClick={() => toggleSourceSelection(id)}
                            className="hover:text-primary-900"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>

              {/* Topic */}
              <div>
                <label className="label">Topic</label>
                <select
                  value={filters.topicId}
                  onChange={(e) => handleFilterChange('topicId', e.target.value)}
                  className="input"
                >
                  <option value="">All Topics</option>
                  {topics?.map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
              </div>

              {/* Narrative */}
              <div>
                <label className="label">Narrative</label>
                <select
                  value={filters.narrativeId}
                  onChange={(e) => handleFilterChange('narrativeId', e.target.value)}
                  className="input"
                >
                  <option value="">All Narratives</option>
                  {narratives.map((n: Narrative) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="label">{t('language.armenian').split(' ')[0] === t('language.armenian') ? 'Language' : t('filters.allLanguages').replace('All ', '')}</label>
                <select
                  value={filters.language}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                  className="input"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{t(l.labelKey)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Search options */}
          <div className="flex items-center pt-2">
            <label className="flex items-center text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.searchContent}
                onChange={(e) => handleFilterChange('searchContent', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-2"
              />
              {t('filters.searchInContent')}
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        {isLoading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : articlesData?.content?.length === 0 ? (
          <div className="empty-state py-16">
            <Newspaper className="empty-state-icon" />
            <p className="empty-state-title">No articles found</p>
            <p className="empty-state-description">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results'
                : 'Articles will appear here once sources start fetching content'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn btn-secondary mt-4">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Article List */}
            <div className="divide-y divide-gray-100">
              {articlesData?.content?.map((article) => (
                <article key={article.id} className="p-4 hover:bg-gray-50 transition-colors">
                  {/* Top row: badges */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SourceTypeBadge sourceType={article.sourceType} />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      {article.sourceName || 'Unknown Source'}
                      <CredibilityDot score={sources?.find(s => s.id === article.sourceId)?.credibilityScore} />
                    </span>
                    <LanguageBadge language={article.language} />
                    <span className="text-gray-300">|</span>
                    <SentimentBadge sentiment={article.sentiment} confidence={article.confidence} />
                    {article.topicName && (
                      <span className="badge badge-purple">{article.topicName}</span>
                    )}
                  </div>

                  {/* Title */}
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2"
                  >
                    <h3 className="text-base font-medium text-gray-900 group-hover:text-primary-600 line-clamp-2 transition-colors">
                      <HighlightedText text={article.title} query={filters.q} />
                    </h3>
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-primary-600 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>

                  {/* Snippet */}
                  {article.snippet && (
                    <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">
                      <HighlightedText text={article.snippet} query={filters.q} />
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500 gap-3">
                      {article.author && <span>By {article.author}</span>}
                      {article.publishedAt && (
                        <span title={new Date(article.publishedAt).toLocaleString()}>
                          {formatRelativeTime(article.publishedAt)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        bookmarkMutation.mutate({
                          articleId: article.id,
                          isBookmarked: bookmarkedIds.has(article.id)
                        })
                      }}
                      disabled={bookmarkMutation.isPending}
                      className={`p-1.5 rounded-lg transition-colors ${
                        bookmarkedIds.has(article.id)
                          ? 'text-amber-500 hover:bg-amber-50'
                          : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                      }`}
                      title={bookmarkedIds.has(article.id) ? 'Remove bookmark' : 'Bookmark article'}
                    >
                      {bookmarkedIds.has(article.id) ? (
                        <BookmarkCheck size={18} />
                      ) : (
                        <Bookmark size={18} />
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {articlesData && articlesData.totalPages > 1 && (
              <div className="px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  <span className="hidden sm:inline">Showing </span>
                  <span className="font-medium">{articlesData.number * articlesData.size + 1}</span>
                  <span className="hidden sm:inline"> to </span>
                  <span className="sm:hidden">-</span>
                  <span className="font-medium">{Math.min((articlesData.number + 1) * articlesData.size, articlesData.totalElements)}</span>
                  <span className="hidden sm:inline"> of </span>
                  <span className="sm:hidden"> / </span>
                  <span className="font-medium">{articlesData.totalElements.toLocaleString()}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    disabled={filters.page === 0}
                    className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg">
                    {filters.page + 1} / {articlesData.totalPages}
                  </span>
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    disabled={filters.page >= articlesData.totalPages - 1}
                    className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TELEGRAM CHANNELS TAB
// ============================================================================

interface TelegramSource {
  id: number
  name: string
  url: string
  type: string
  language: string
  active: boolean
  lastFetched?: string
  lastSuccess?: string
  articleCount?: number
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function ConnectionStatus({ source }: { source: TelegramSource }) {
  if (!source.active) {
    return (
      <div className="flex items-center text-gray-600">
        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
        Disabled
      </div>
    )
  }

  const hasError = source.lastFetched && source.lastSuccess &&
    new Date(source.lastFetched) > new Date(source.lastSuccess)

  if (hasError) {
    return (
      <div className="flex items-center text-red-600">
        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
        Error fetching
      </div>
    )
  }

  if (!source.lastFetched) {
    return (
      <div className="flex items-center text-amber-600">
        <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
        Pending first fetch
      </div>
    )
  }

  const isRecent = (Date.now() - new Date(source.lastFetched).getTime()) < 3600000
  return (
    <div className={`flex items-center ${isRecent ? 'text-green-600' : 'text-amber-600'}`}>
      <span className={`w-2 h-2 ${isRecent ? 'bg-green-500 animate-pulse' : 'bg-amber-500'} rounded-full mr-2`}></span>
      {isRecent ? 'Connected' : 'Delayed'}
    </div>
  )
}

function TelegramChannelsTab() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newChannel, setNewChannel] = useState({ handle: '', name: '', language: 'ARMENIAN' })
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const { data: telegramSources = [], isLoading } = useQuery({
    queryKey: ['telegram-sources'],
    queryFn: async () => {
      const res = await sourcesApi.getAll({ type: 'TELEGRAM' })
      return res.data as TelegramSource[]
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; url: string; type: string; language: string }) =>
      sourcesApi.create({ ...data, active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-sources'] })
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast.success('Channel added successfully')
      setShowAddModal(false)
      setNewChannel({ handle: '', name: '', language: 'ARMENIAN' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => sourcesApi.toggleActive(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['telegram-sources'] })
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      const source = telegramSources.find(s => s.id === id)
      toast.success(source?.active ? 'Channel paused' : 'Channel resumed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sourcesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-sources'] })
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast.success('Channel removed')
      setDeleteConfirm(null)
    },
  })

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault()
    const handle = newChannel.handle.startsWith('@') ? newChannel.handle : `@${newChannel.handle}`
    const url = `https://t.me/${handle.slice(1)}`

    createMutation.mutate({
      name: newChannel.name || handle,
      url,
      type: 'TELEGRAM',
      language: newChannel.language,
    })
  }

  const handleQuickAdd = (channel: typeof SUGGESTED_CHANNELS[0]) => {
    const url = `https://t.me/${channel.handle.slice(1)}`
    createMutation.mutate({
      name: channel.name,
      url,
      type: 'TELEGRAM',
      language: channel.language,
    })
  }

  const existingHandles = telegramSources.map(s => {
    const match = s.url.match(/t\.me\/(.+)/)
    return match ? `@${match[1]}` : ''
  })

  const availableSuggestions = SUGGESTED_CHANNELS.filter(c => !existingHandles.includes(c.handle))

  const stats = {
    total: telegramSources.length,
    active: telegramSources.filter(s => s.active).length,
    totalMessages: telegramSources.reduce((sum, s) => sum + (s.articleCount || 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm sm:text-base text-gray-600">
          Monitor Telegram channels for news and narratives
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary w-full sm:w-auto justify-center"
        >
          <Plus size={16} />
          Add Channel
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Total</p>
          <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.total}</p>
        </div>
        <div className="card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Active</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Messages</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalMessages.toLocaleString()}</p>
        </div>
      </div>

      {/* Quick Add Suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h3 className="font-medium text-purple-900 mb-3">Suggested Channels</h3>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map(channel => (
              <button
                key={channel.handle}
                onClick={() => handleQuickAdd(channel)}
                disabled={createMutation.isPending}
                className="px-3 py-1.5 bg-white border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-100 disabled:opacity-50"
              >
                + {channel.handle}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Channels List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">Loading channels...</div>
        ) : telegramSources.length === 0 ? (
          <div className="empty-state py-16">
            <Radio className="empty-state-icon" />
            <p className="empty-state-title">No channels yet</p>
            <p className="empty-state-description">Add Telegram channels to start monitoring messages</p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary mt-4">
              <Plus size={16} />
              Add Channel
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {telegramSources.map(source => (
              <div key={source.id} className="p-4 hover:bg-gray-50">
                {/* Desktop layout */}
                <div className="hidden md:flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Radio size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{source.name}</div>
                      <div className="text-sm text-gray-600">
                        {source.url.replace('https://t.me/', '@')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Messages</div>
                      <div className="font-medium">{source.articleCount?.toLocaleString() || 0}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-600">Last Fetch</div>
                      <div className="font-medium">{formatTimeAgo(source.lastFetched)}</div>
                    </div>

                    <div className="w-32">
                      <ConnectionStatus source={source} />
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleMutation.mutate(source.id)}
                        disabled={toggleMutation.isPending}
                        className={`p-2 rounded-lg transition-colors ${
                          source.active
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={source.active ? 'Pause' : 'Resume'}
                      >
                        <Power size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(source.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile layout */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Radio size={18} className="text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{source.name}</div>
                        <div className="text-xs text-gray-600">
                          {source.url.replace('https://t.me/', '@')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleMutation.mutate(source.id)}
                        disabled={toggleMutation.isPending}
                        className={`p-2 rounded-lg transition-colors ${
                          source.active
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        <Power size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(source.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">{source.articleCount?.toLocaleString() || 0} msgs</span>
                      <span className="text-gray-600">{formatTimeAgo(source.lastFetched)}</span>
                    </div>
                    <ConnectionStatus source={source} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-2">Telegram Integration</h3>
        <p className="text-sm text-blue-700">
          Channels are monitored through the Telegram API. Public channels can be added directly.
          For private channels, ensure the bot has been added as an administrator.
          Messages are fetched every 5 minutes and analyzed for sentiment and narratives.
        </p>
      </div>

      {/* Add Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="card p-6 max-w-md w-full animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Add Telegram Channel</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleAddChannel} className="space-y-4">
              <div>
                <label className="label">Channel Handle</label>
                <input
                  type="text"
                  value={newChannel.handle}
                  onChange={e => setNewChannel({ ...newChannel, handle: e.target.value })}
                  className="input"
                  placeholder="@channelname"
                  required
                />
                <p className="mt-1 text-xs text-gray-600">Enter the channel username (with or without @)</p>
              </div>

              <div>
                <label className="label">Display Name (optional)</label>
                <input
                  type="text"
                  value={newChannel.name}
                  onChange={e => setNewChannel({ ...newChannel, name: e.target.value })}
                  className="input"
                  placeholder="Channel display name"
                />
              </div>

              <div>
                <label className="label">Primary Language</label>
                <select
                  value={newChannel.language}
                  onChange={e => setNewChannel({ ...newChannel, language: e.target.value })}
                  className="input"
                >
                  <option value="ARMENIAN">Armenian</option>
                  <option value="RUSSIAN">Russian</option>
                  <option value="ENGLISH">English</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newChannel.handle}
                  className="flex-1 btn btn-primary disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Adding...' : 'Add Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="card p-6 max-w-sm w-full animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Remove Channel?</h2>
            </div>
            <p className="text-gray-600 mb-6 text-sm">
              This will stop monitoring this channel. Collected messages will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="flex-1 btn btn-danger disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleteMutation.isPending ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
