import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { narrativesApi, coordinationEventsApi } from '../services/api'
import { useAuthStore } from '../contexts/authStore'
import { formatDistanceToNow } from 'date-fns'
import {
  Plus,
  X,
  MessageSquare,
  AlertTriangle,
  Activity,
  FileText,
  ExternalLink,
  Newspaper,
  Radio,
  Globe,
  Clock,
  Users,
  TrendingUp,
  Network,
  CheckCircle,
  XCircle,
  Shield,
  Link,
  Trash2,
  Bot,
  Check,
} from 'lucide-react'

interface AiSummary {
  whyDetected: string
  spreadPattern: string
  threatSignal: 'none' | 'low' | 'medium' | 'high'
  suggestedTitle: string
  analystNote: string
}

interface Narrative {
  id: number
  name: string
  description: string
  keywords: string[]
  status: string
  threatLevel: string
  articleCount: number
  alertCount: number
  hasCoordinationEvents: boolean
  coordinationEventCount: number
  factCheckCount: number
  hasFactChecks: boolean
  firstSeen: string
  lastSeen: string
  createdAt: string
  aiSummary: AiSummary | null
}

interface FactCheck {
  id: number
  narrativeId: number
  narrativeName: string
  title: string
  url: string
  publisher: string
  verdict: string | null
  publishedAt: string | null
  addedAt: string
  addedBy: string
  notes: string | null
}

interface NarrativeArticle {
  id: number
  title: string
  snippet: string
  url: string
  publishedAt: string
  sourceName: string
  sourceType: string
  language: string
  sentiment: string
  confidence: number
}

interface CoordinationEvent {
  id: number
  narrativeId: number | null
  narrativeName: string | null
  detectedAt: string
  timeWindowHours: number
  sourceCount: number
  articleCount: number
  similarityScore: number
  coordinationType: string
  description: string | null
  sourcesInvolved: string[]
  articleIds: number[]
  status: string
  reviewedAt: string | null
  reviewedByName: string | null
  createdAt: string
}

// Skeleton Components
function NarrativeCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="skeleton h-6 w-3/4" />
        <div className="skeleton h-5 w-16 rounded" />
      </div>
      <div className="skeleton h-5 w-20 rounded mb-3" />
      <div className="flex gap-2 mb-4">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-14 rounded-full" />
      </div>
      <div className="skeleton h-4 w-24 mb-1" />
      <div className="skeleton h-3 w-32" />
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="skeleton h-4 w-20 mb-2" />
      <div className="skeleton h-8 w-12" />
    </div>
  )
}

function ThreatBadge({ level }: { level: string }) {
  const config: Record<string, string> = {
    CRITICAL: 'bg-purple-600 text-white',
    HIGH: 'bg-red-600 text-white',
    MEDIUM: 'bg-amber-500 text-white',
    LOW: 'bg-gray-500 text-white',
  }
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${config[level] || config.LOW}`}>
      {level}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    ACTIVE: 'badge-green',
    MONITORING: 'badge-yellow',
    RESOLVED: 'badge-gray',
    ARCHIVED: 'badge-gray',
    PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  }
  const displayName = status === 'PENDING_REVIEW' ? 'Pending Review' : status
  return (
    <span className={`badge ${config[status] || 'badge-gray'}`}>
      {displayName}
    </span>
  )
}

function ThreatSignalBadge({ signal }: { signal: string }) {
  const config: Record<string, { className: string; label: string }> = {
    none: { className: 'bg-gray-100 text-gray-600', label: 'No threat' },
    low: { className: 'bg-blue-100 text-blue-700', label: 'Low' },
    medium: { className: 'bg-amber-100 text-amber-700', label: 'Medium' },
    high: { className: 'bg-red-100 text-red-700', label: 'High' },
  }
  const { className, label } = config[signal] || config.none
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${className}`}>
      {label}
    </span>
  )
}

function SourceTypeBadge({ sourceType }: { sourceType?: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode }> = {
    RSS: { className: 'badge-blue', icon: <Newspaper size={12} /> },
    WEB_SCRAPE: { className: 'badge-green', icon: <Globe size={12} /> },
    TELEGRAM: { className: 'bg-sky-100 text-sky-700', icon: <Radio size={12} /> },
  }
  const { className, icon } = config[sourceType || ''] || { className: 'badge-gray', icon: <FileText size={12} /> }
  return (
    <span className={`badge ${className} flex items-center gap-1`}>
      {icon}
    </span>
  )
}

function SentimentDot({ sentiment }: { sentiment?: string }) {
  const colors: Record<string, string> = {
    POSITIVE: 'bg-green-500',
    NEGATIVE: 'bg-red-500',
    NEUTRAL: 'bg-gray-400',
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[sentiment || ''] || 'bg-gray-300'}`}
      title={sentiment || 'Unknown'}
    />
  )
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return dateString
  }
}

export default function NarrativesPage() {
  const canEditNarratives = useAuthStore((state) => state.canEditNarratives)
  const canEdit = canEditNarratives()
  const queryClient = useQueryClient()

  const [selectedNarrative, setSelectedNarrative] = useState<Narrative | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'high'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'active' | 'pending'>('active')
  const [editedTitles, setEditedTitles] = useState<Record<number, string>>({})

  // Query for active narratives (default view)
  const { data: narrativesData, isLoading } = useQuery({
    queryKey: ['narratives'],
    queryFn: async () => {
      const res = await narrativesApi.getAll()
      return res.data
    },
    enabled: viewMode === 'active',
  })

  // Query for pending narratives
  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: ['narratives-pending'],
    queryFn: async () => {
      const res = await narrativesApi.getPending()
      return res.data
    },
    enabled: viewMode === 'pending',
  })

  // Query for pending count (always fetch)
  const { data: pendingCountData } = useQuery({
    queryKey: ['narratives-pending-count'],
    queryFn: async () => {
      const res = await narrativesApi.getPendingCount()
      return res.data
    },
    refetchInterval: 60000, // Refresh every minute
  })

  const pendingCount = pendingCountData?.count || 0

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title?: string }) => narrativesApi.approve(id, title),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['narratives'] })
      queryClient.invalidateQueries({ queryKey: ['narratives-pending'] })
      queryClient.invalidateQueries({ queryKey: ['narratives-pending-count'] })
      // Clean up edited title
      setEditedTitles((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.success('Narrative approved and added to feed')
    },
    onError: () => {
      toast.error('Failed to approve narrative')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => narrativesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narratives'] })
      queryClient.invalidateQueries({ queryKey: ['narratives-pending'] })
      queryClient.invalidateQueries({ queryKey: ['narratives-pending-count'] })
      toast.success('Narrative dismissed')
    },
    onError: () => {
      toast.error('Failed to delete narrative')
    },
  })

  const narratives: Narrative[] = viewMode === 'active'
    ? (narrativesData?.content || [])
    : (pendingData?.content || [])

  const filteredNarratives = narratives.filter((n) => {
    if (filter === 'active') return n.status === 'ACTIVE'
    if (filter === 'high') return n.threatLevel === 'HIGH' || n.threatLevel === 'CRITICAL'
    return true
  })

  const activeCount = narratives.filter((n) => n.status === 'ACTIVE').length
  const highThreatCount = narratives.filter(
    (n) => n.threatLevel === 'HIGH' || n.threatLevel === 'CRITICAL'
  ).length
  const totalArticles = narratives.reduce((sum, n) => sum + (n.articleCount || 0), 0)

  const isCurrentlyLoading = viewMode === 'active' ? isLoading : isLoadingPending

  // Loading state with skeletons
  if (isCurrentlyLoading) {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Filter pills skeleton */}
        <div className="flex gap-2">
          <div className="skeleton h-10 w-24 rounded-lg" />
          <div className="skeleton h-10 w-28 rounded-lg" />
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <NarrativeCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Review Banner */}
      {pendingCount > 0 && viewMode === 'active' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Bot size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800">
                {pendingCount} AI-suggested narrative{pendingCount !== 1 ? 's' : ''} pending review
              </p>
              <p className="text-sm text-amber-600">
                Review and approve or dismiss auto-detected narratives
              </p>
            </div>
          </div>
          <button
            onClick={() => setViewMode('pending')}
            className="btn btn-sm bg-amber-600 text-white hover:bg-amber-700"
          >
            Review Now
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Narratives</p>
              <p className="text-2xl font-bold text-gray-900">{narratives.length}</p>
            </div>
            <div className="p-2.5 bg-gray-100 rounded-lg">
              <MessageSquare size={20} className="text-gray-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            </div>
            <div className="p-2.5 bg-green-100 rounded-lg">
              <Activity size={20} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Threat</p>
              <p className="text-2xl font-bold text-red-600">{highThreatCount}</p>
            </div>
            <div className="p-2.5 bg-red-100 rounded-lg">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Articles</p>
              <p className="text-2xl font-bold text-gray-900">{totalArticles.toLocaleString()}</p>
            </div>
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <FileText size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-4 border-b pb-4">
        <button
          onClick={() => setViewMode('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'active'
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Activity size={16} />
          Active Narratives
        </button>
        <button
          onClick={() => setViewMode('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'pending'
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Bot size={16} />
          Pending Review
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        {viewMode === 'active' ? (
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All ({narratives.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`btn btn-sm ${filter === 'high' ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-secondary'}`}
            >
              <AlertTriangle size={14} />
              High Threat ({highThreatCount})
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            AI-suggested narratives awaiting your review
          </div>
        )}

        {canEdit && viewMode === 'active' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Add Narrative
          </button>
        )}
      </div>

      {/* Narratives Grid */}
      {filteredNarratives.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNarratives.map((narrative) => {
            const isHighThreat = narrative.threatLevel === 'HIGH' || narrative.threatLevel === 'CRITICAL'
            const isPending = viewMode === 'pending' || narrative.status === 'PENDING_REVIEW'

            return (
              <div
                key={narrative.id}
                onClick={() => !isPending && setSelectedNarrative(narrative)}
                className={`card p-5 transition-all hover:shadow-md ${
                  isPending
                    ? 'border-amber-300 bg-amber-50/30 cursor-default'
                    : isHighThreat
                    ? 'border-red-200 hover:border-red-400 cursor-pointer'
                    : 'hover:border-primary-400 cursor-pointer'
                }`}
              >
                {/* AI Suggested Badge for pending */}
                {isPending && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded flex items-center gap-1">
                      <Bot size={10} />
                      AI Suggested
                    </span>
                  </div>
                )}

                {/* Header - Editable title for pending */}
                <div className="flex items-start justify-between mb-2">
                  {isPending ? (
                    <input
                      type="text"
                      value={editedTitles[narrative.id] ?? (narrative.aiSummary?.suggestedTitle || narrative.name)}
                      onChange={(e) => {
                        e.stopPropagation()
                        setEditedTitles((prev) => ({ ...prev, [narrative.id]: e.target.value }))
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 mr-2 px-2 py-1 text-base font-semibold text-gray-900 border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      placeholder="Narrative title..."
                    />
                  ) : (
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-2 flex-1 mr-2">
                      {narrative.name}
                    </h3>
                  )}
                  <ThreatBadge level={narrative.threatLevel} />
                </div>

                {/* Status - hide for pending since we have the badge */}
                {!isPending && (
                  <div className="mb-3">
                    <StatusBadge status={narrative.status} />
                  </div>
                )}

                {/* AI Analysis Section for Pending */}
                {isPending && narrative.aiSummary ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot size={14} className="text-amber-600" />
                      <span className="font-medium text-amber-800">AI Analysis</span>
                      <ThreatSignalBadge signal={narrative.aiSummary.threatSignal} />
                    </div>
                    <div className="space-y-1.5 text-gray-700">
                      <p><span className="font-medium">Why detected:</span> {narrative.aiSummary.whyDetected}</p>
                      <p><span className="font-medium">Spread:</span> {narrative.aiSummary.spreadPattern}</p>
                      <p className="italic text-gray-600">{narrative.aiSummary.analystNote}</p>
                    </div>
                  </div>
                ) : isPending && !narrative.aiSummary ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-sm text-gray-500 flex items-center gap-2">
                    <Bot size={14} />
                    AI analysis unavailable
                  </div>
                ) : null}

                {/* Keywords */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(narrative.keywords || []).slice(0, 4).map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full border border-primary-200"
                    >
                      {kw}
                    </span>
                  ))}
                  {(narrative.keywords || []).length > 4 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{narrative.keywords.length - 4}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    <span className="font-semibold text-gray-900">{narrative.articleCount || 0}</span> articles
                  </span>
                  <div className="flex items-center gap-3">
                    {narrative.hasFactChecks && (
                      <span className="text-green-600 font-medium flex items-center gap-1" title="Has fact-checks">
                        <Shield size={12} />
                        Fact-checked
                      </span>
                    )}
                    {narrative.hasCoordinationEvents && (
                      <span className="text-purple-600 font-medium flex items-center gap-1" title="Coordinated activity detected">
                        <Network size={12} />
                        {narrative.coordinationEventCount}
                      </span>
                    )}
                    {narrative.alertCount > 0 && (
                      <span className="text-red-600 font-medium flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {narrative.alertCount}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Clock size={10} />
                  First detected {formatDate(narrative.firstSeen)}
                </p>

                {/* Approve/Delete Actions for Pending */}
                {isPending && canEdit && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-amber-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const title = editedTitles[narrative.id] ?? (narrative.aiSummary?.suggestedTitle || narrative.name)
                        approveMutation.mutate({ id: narrative.id, title })
                      }}
                      disabled={approveMutation.isPending}
                      className="flex-1 btn btn-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check size={14} />
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Dismiss this AI-suggested narrative?')) {
                          deleteMutation.mutate(narrative.id)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="flex-1 btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state py-16 card">
          {viewMode === 'pending' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <p className="empty-state-title">All caught up!</p>
              <p className="empty-state-description max-w-md mx-auto">
                No AI-suggested narratives pending review. New narratives will appear here when detected.
              </p>
              <button onClick={() => setViewMode('active')} className="btn btn-secondary mt-4">
                View Active Narratives
              </button>
            </div>
          ) : filter !== 'all' ? (
            <>
              <MessageSquare className="empty-state-icon" />
              <p className="empty-state-title">No matching narratives</p>
              <p className="empty-state-description">Try adjusting your filters to see more results</p>
              <button onClick={() => setFilter('all')} className="btn btn-secondary mt-4">
                Clear Filters
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} className="text-purple-600" />
              </div>
              <p className="empty-state-title">No narratives yet</p>
              <p className="empty-state-description max-w-md mx-auto">
                Narratives help you track disinformation campaigns by monitoring keyword patterns across news sources.
                Create your first narrative to start monitoring.
              </p>
              {canEdit && (
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary mt-4">
                  <Plus size={16} />
                  Create First Narrative
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Narrative Detail Panel */}
      {selectedNarrative && (
        <NarrativeDetailPanel
          narrative={selectedNarrative}
          onClose={() => setSelectedNarrative(null)}
        />
      )}

      {/* Create Narrative Modal */}
      {showCreateModal && (
        <CreateNarrativeModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}

// ============================================================================
// NARRATIVE DETAIL PANEL
// ============================================================================
function NarrativeDetailPanel({
  narrative,
  onClose,
}: {
  narrative: Narrative
  onClose: () => void
}) {
  const canEditNarratives = useAuthStore((state) => state.canEditNarratives)
  const canEdit = canEditNarratives()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'timeline' | 'sources' | 'coordination' | 'factchecks'>('timeline')
  const [showFactCheckForm, setShowFactCheckForm] = useState(false)

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['narrative-articles-full', narrative.id],
    queryFn: async () => {
      const res = await narrativesApi.getArticles(narrative.id, { size: 200 })
      return res.data
    },
  })

  const { data: coordinationEvents, isLoading: isLoadingCoordination } = useQuery({
    queryKey: ['narrative-coordination-events', narrative.id],
    queryFn: async () => {
      const res = await coordinationEventsApi.getByNarrative(narrative.id)
      return res.data as CoordinationEvent[]
    },
  })

  const { data: factChecks, isLoading: isLoadingFactChecks } = useQuery({
    queryKey: ['narrative-fact-checks', narrative.id],
    queryFn: async () => {
      const res = await narrativesApi.getFactChecks(narrative.id)
      return res.data as FactCheck[]
    },
  })

  const deleteFactCheckMutation = useMutation({
    mutationFn: (id: number) => narrativesApi.deleteFactCheck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrative-fact-checks', narrative.id] })
      queryClient.invalidateQueries({ queryKey: ['narratives'] })
      toast.success('Fact-check removed')
    },
  })

  const articles = useMemo<NarrativeArticle[]>(() => articlesData?.content || [], [articlesData])

  const sourcesBreakdown = useMemo(() => {
    const sourceMap = new Map<string, { count: number; type: string; sentiments: string[] }>()
    articles.forEach((article) => {
      const name = article.sourceName || 'Unknown'
      const existing = sourceMap.get(name) || { count: 0, type: article.sourceType, sentiments: [] }
      existing.count++
      if (article.sentiment) existing.sentiments.push(article.sentiment)
      sourceMap.set(name, existing)
    })
    return Array.from(sourceMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        type: data.type,
        dominantSentiment: getDominantSentiment(data.sentiments),
      }))
      .sort((a, b) => b.count - a.count)
  }, [articles])

  const sentimentBreakdown = useMemo(() => {
    const counts = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0, UNKNOWN: 0 }
    articles.forEach((a) => {
      if (a.sentiment && a.sentiment in counts) {
        counts[a.sentiment as keyof typeof counts]++
      } else {
        counts.UNKNOWN++
      }
    })
    const total = articles.length || 1
    return {
      positive: { count: counts.POSITIVE, pct: Math.round((counts.POSITIVE / total) * 100) },
      negative: { count: counts.NEGATIVE, pct: Math.round((counts.NEGATIVE / total) * 100) },
      neutral: { count: counts.NEUTRAL, pct: Math.round((counts.NEUTRAL / total) * 100) },
    }
  }, [articles])

  const timelineSorted = useMemo(() => {
    return [...articles].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  }, [articles])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-4xl h-full overflow-hidden flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="bg-gray-50 border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ThreatBadge level={narrative.threatLevel} />
                <StatusBadge status={narrative.status} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {narrative.name}
              </h2>
              {narrative.description && (
                <p className="text-gray-600 mt-1 text-sm">{narrative.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Metadata Row */}
        <div className="px-6 py-4 border-b bg-white grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide flex items-center gap-1">
              <Clock size={10} /> First Detected
            </p>
            <p className="font-semibold text-gray-900">{formatDate(narrative.firstSeen)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide flex items-center gap-1">
              <TrendingUp size={10} /> Last Activity
            </p>
            <p className="font-semibold text-gray-900">{formatDate(narrative.lastSeen)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide flex items-center gap-1">
              <FileText size={10} /> Total Items
            </p>
            <p className="font-semibold text-gray-900">{articles.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide flex items-center gap-1">
              <Users size={10} /> Sources
            </p>
            <p className="font-semibold text-gray-900">{sourcesBreakdown.length}</p>
          </div>
        </div>

        {/* Keywords */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Keywords</p>
          <div className="flex flex-wrap gap-2">
            {(narrative.keywords || []).map((kw) => (
              <span
                key={kw}
                className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full font-medium"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Sentiment Breakdown */}
        <div className="px-6 py-4 border-b">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-3">Sentiment Distribution</p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden flex">
                <div className="bg-green-500 h-full" style={{ width: `${sentimentBreakdown.positive.pct}%` }} />
                <div className="bg-gray-400 h-full" style={{ width: `${sentimentBreakdown.neutral.pct}%` }} />
                <div className="bg-red-500 h-full" style={{ width: `${sentimentBreakdown.negative.pct}%` }} />
              </div>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-gray-600">{sentimentBreakdown.positive.pct}%</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <span className="text-gray-600">{sentimentBreakdown.neutral.pct}%</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-gray-600">{sentimentBreakdown.negative.pct}%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'timeline'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-700'
              }`}
            >
              Timeline ({articles.length})
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'sources'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-700'
              }`}
            >
              Sources ({sourcesBreakdown.length})
            </button>
            <button
              onClick={() => setActiveTab('coordination')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'coordination'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-700'
              }`}
            >
              <Network size={14} />
              Coordination ({coordinationEvents?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('factchecks')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'factchecks'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-700'
              }`}
            >
              <Shield size={14} />
              Fact-Checks ({factChecks?.length || 0})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton h-6 w-6 rounded" />
                  <div className="flex-1">
                    <div className="skeleton h-4 w-32 mb-2" />
                    <div className="skeleton h-5 w-3/4 mb-1" />
                    <div className="skeleton h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'timeline' ? (
            <div className="divide-y divide-gray-100">
              {timelineSorted.map((article) => (
                <div key={article.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <SourceTypeBadge sourceType={article.sourceType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {article.sourceName || 'Unknown Source'}
                        </span>
                        <SentimentDot sentiment={article.sentiment} />
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(article.publishedAt)}
                        </span>
                      </div>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-1"
                      >
                        <span className="text-primary-600 hover:text-primary-700 font-medium line-clamp-2">
                          {article.title}
                        </span>
                        <ExternalLink size={12} className="text-gray-400 group-hover:text-primary-600 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      {article.snippet && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {article.snippet}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {articles.length === 0 && (
                <div className="empty-state py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText size={24} className="text-gray-400" />
                  </div>
                  <p className="empty-state-title text-base">No articles yet</p>
                  <p className="empty-state-description text-sm max-w-xs">
                    Articles matching the narrative keywords will appear here as sources are scraped
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === 'sources' ? (
            <div className="p-6 space-y-3">
              {sourcesBreakdown.map((source) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <SourceTypeBadge sourceType={source.type} />
                    <div>
                      <p className="font-medium text-gray-900">{source.name}</p>
                      <p className="text-xs text-gray-600">
                        {source.count} article{source.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SentimentDot sentiment={source.dominantSentiment} />
                    <span className="text-xs text-gray-600">
                      {source.dominantSentiment?.toLowerCase() || 'mixed'}
                    </span>
                  </div>
                </div>
              ))}
              {sourcesBreakdown.length === 0 && (
                <div className="empty-state py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users size={24} className="text-gray-400" />
                  </div>
                  <p className="empty-state-title text-base">No source data</p>
                  <p className="empty-state-description text-sm">
                    Source breakdown will appear once articles are collected
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === 'coordination' ? (
            /* Coordination Tab */
            <div className="p-6 space-y-4">
              {isLoadingCoordination ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card p-4">
                    <div className="skeleton h-5 w-32 mb-2" />
                    <div className="skeleton h-4 w-full mb-1" />
                    <div className="skeleton h-4 w-3/4" />
                  </div>
                ))
              ) : coordinationEvents && coordinationEvents.length > 0 ? (
                coordinationEvents.map((event) => (
                  <CoordinationEventCard key={event.id} event={event} />
                ))
              ) : (
                <div className="empty-state py-12">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Network size={24} className="text-purple-600" />
                  </div>
                  <p className="empty-state-title text-base">No coordination detected</p>
                  <p className="empty-state-description text-sm max-w-xs">
                    Coordinated activity detection runs every 2 hours. Events will appear here if multiple sources publish similar content within a short time window.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Fact-Checks Tab */
            <div className="p-6 space-y-4">
              {/* Add Fact-Check Button */}
              {canEdit && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowFactCheckForm(true)}
                    className="btn btn-primary btn-sm"
                  >
                    <Link size={14} />
                    Link Fact-Check
                  </button>
                </div>
              )}

              {isLoadingFactChecks ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="card p-4">
                    <div className="skeleton h-5 w-16 rounded mb-2" />
                    <div className="skeleton h-5 w-3/4 mb-1" />
                    <div className="skeleton h-4 w-1/2" />
                  </div>
                ))
              ) : factChecks && factChecks.length > 0 ? (
                factChecks.map((fc) => (
                  <FactCheckCard
                    key={fc.id}
                    factCheck={fc}
                    onDelete={() => deleteFactCheckMutation.mutate(fc.id)}
                    canDelete={canEdit}
                  />
                ))
              ) : (
                <div className="empty-state py-12">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield size={24} className="text-green-600" />
                  </div>
                  <p className="empty-state-title text-base">No fact-checks linked yet</p>
                  <p className="empty-state-description text-sm max-w-xs">
                    Link published fact-checks from CivilNet or other sources to provide context and debunk this narrative.
                  </p>
                  {canEdit && (
                    <button
                      onClick={() => setShowFactCheckForm(true)}
                      className="btn btn-primary mt-4"
                    >
                      <Link size={14} />
                      Link Fact-Check
                    </button>
                  )}
                </div>
              )}

              {/* Add Fact-Check Form Modal */}
              {showFactCheckForm && (
                <AddFactCheckModal
                  narrativeId={narrative.id}
                  onClose={() => setShowFactCheckForm(false)}
                  onSuccess={() => {
                    setShowFactCheckForm(false)
                    queryClient.invalidateQueries({ queryKey: ['narrative-fact-checks', narrative.id] })
                    queryClient.invalidateQueries({ queryKey: ['narratives'] })
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COORDINATION EVENT CARD
// ============================================================================
function CoordinationEventCard({ event }: { event: CoordinationEvent }) {
  const getCoordinationTypeLabel = (type: string) => {
    switch (type) {
      case 'TIMING':
        return { label: 'Timing-based', color: 'bg-blue-100 text-blue-700' }
      case 'CONTENT':
        return { label: 'Content similarity', color: 'bg-green-100 text-green-700' }
      case 'TIMING_AND_CONTENT':
        return { label: 'Timing + Content', color: 'bg-purple-100 text-purple-700' }
      default:
        return { label: type, color: 'bg-gray-100 text-gray-700' }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Active', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
      case 'REVIEWED':
        return { label: 'Reviewed', color: 'bg-green-100 text-green-700', icon: CheckCircle }
      case 'DISMISSED':
        return { label: 'Dismissed', color: 'bg-gray-100 text-gray-600', icon: XCircle }
      default:
        return { label: status, color: 'bg-gray-100 text-gray-600', icon: Activity }
    }
  }

  const coordType = getCoordinationTypeLabel(event.coordinationType)
  const statusInfo = getStatusBadge(event.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className={`card p-4 ${event.status === 'ACTIVE' ? 'border-purple-200 bg-purple-50/30' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${coordType.color}`}>
            {coordType.label}
          </span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${statusInfo.color}`}>
            <StatusIcon size={10} />
            {statusInfo.label}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatRelativeTime(event.detectedAt)}
        </span>
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-sm text-gray-700 mb-3">{event.description}</p>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-sm mb-3">
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-gray-500" />
          <span className="text-gray-700">
            <span className="font-semibold">{event.sourceCount}</span> sources
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText size={14} className="text-gray-500" />
          <span className="text-gray-700">
            <span className="font-semibold">{event.articleCount}</span> articles
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-gray-500" />
          <span className="text-gray-700">
            {event.timeWindowHours}h window
          </span>
        </div>
        {event.similarityScore && (
          <div className="flex items-center gap-1.5">
            <Activity size={14} className="text-gray-500" />
            <span className="text-gray-700">
              {Math.round(event.similarityScore * 100)}% similarity
            </span>
          </div>
        )}
      </div>

      {/* Sources involved */}
      {event.sourcesInvolved && event.sourcesInvolved.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Sources Involved</p>
          <div className="flex flex-wrap gap-1.5">
            {event.sourcesInvolved.slice(0, 5).map((source, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {source}
              </span>
            ))}
            {event.sourcesInvolved.length > 5 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                +{event.sourcesInvolved.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Review info */}
      {event.reviewedAt && event.reviewedByName && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Reviewed by {event.reviewedByName} • {formatRelativeTime(event.reviewedAt)}
        </div>
      )}
    </div>
  )
}

function getDominantSentiment(sentiments: string[]): string {
  if (sentiments.length === 0) return 'NEUTRAL'
  const counts: Record<string, number> = {}
  sentiments.forEach((s) => {
    counts[s] = (counts[s] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

// ============================================================================
// FACT-CHECK CARD
// ============================================================================
function VerdictBadge({ verdict }: { verdict: string | null }) {
  const config: Record<string, { bg: string; text: string }> = {
    FALSE: { bg: 'bg-red-600', text: 'text-white' },
    MISLEADING: { bg: 'bg-orange-500', text: 'text-white' },
    PARTLY_TRUE: { bg: 'bg-yellow-500', text: 'text-white' },
    TRUE: { bg: 'bg-green-600', text: 'text-white' },
    UNVERIFIED: { bg: 'bg-gray-500', text: 'text-white' },
  }
  const { bg, text } = config[verdict || ''] || { bg: 'bg-gray-400', text: 'text-white' }
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded ${bg} ${text}`}>
      {verdict || 'UNVERIFIED'}
    </span>
  )
}

function FactCheckCard({
  factCheck,
  onDelete,
  canDelete,
}: {
  factCheck: FactCheck
  onDelete: () => void
  canDelete: boolean
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <VerdictBadge verdict={factCheck.verdict} />
            <span className="text-xs text-gray-500">{factCheck.publisher}</span>
          </div>
          <a
            href={factCheck.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-1 mb-2"
          >
            <span className="text-primary-600 hover:text-primary-700 font-medium">
              {factCheck.title}
            </span>
            <ExternalLink size={12} className="text-gray-400 group-hover:text-primary-600 flex-shrink-0 mt-1" />
          </a>
          {factCheck.notes && (
            <p className="text-sm text-gray-600 mb-2">{factCheck.notes}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {factCheck.publishedAt && (
              <span>Published: {formatDate(factCheck.publishedAt)}</span>
            )}
            <span>Added by {factCheck.addedBy}</span>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Remove fact-check"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// ADD FACT-CHECK MODAL
// ============================================================================
function AddFactCheckModal({
  narrativeId,
  onClose,
  onSuccess,
}: {
  narrativeId: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    publisher: 'CivilNet',
    verdict: 'FALSE',
    notes: '',
  })
  const [error, setError] = useState('')

  const addMutation = useMutation({
    mutationFn: async (data: {
      title: string
      url: string
      publisher: string
      verdict: string
      notes?: string
    }) => {
      const res = await narrativesApi.addFactCheck(narrativeId, data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Fact-check linked successfully')
      onSuccess()
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to add fact-check')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.url.trim()) {
      setError('URL is required')
      return
    }
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    addMutation.mutate({
      url: formData.url.trim(),
      title: formData.title.trim(),
      publisher: formData.publisher.trim() || 'CivilNet',
      verdict: formData.verdict,
      notes: formData.notes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-lg w-full animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Link Fact-Check</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">URL *</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://civilnet.am/fact-check/..."
              className="input"
            />
          </div>

          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Fact-check article title"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Publisher</label>
              <input
                type="text"
                value={formData.publisher}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                placeholder="CivilNet"
                className="input"
              />
            </div>
            <div>
              <label className="label">Verdict</label>
              <select
                value={formData.verdict}
                onChange={(e) => setFormData({ ...formData, verdict: e.target.value })}
                className="input"
              >
                <option value="FALSE">False</option>
                <option value="MISLEADING">Misleading</option>
                <option value="PARTLY_TRUE">Partly True</option>
                <option value="TRUE">True</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional context or summary..."
              rows={2}
              className="input"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="btn btn-primary disabled:opacity-50"
            >
              {addMutation.isPending ? 'Adding...' : 'Link Fact-Check'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// CREATE NARRATIVE MODAL
// ============================================================================
function CreateNarrativeModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    keywords: '',
    threatLevel: 'LOW',
  })
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string
      description: string
      keywords: string[]
      threatLevel: string
    }) => {
      const res = await narrativesApi.create(data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narratives'] })
      toast.success('Narrative created successfully')
      onSuccess()
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create narrative')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    const keywords = formData.keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    if (keywords.length === 0) {
      setError('At least one keyword is required')
      return
    }

    createMutation.mutate({
      name: formData.name.trim(),
      description: formData.description.trim(),
      keywords,
      threatLevel: formData.threatLevel,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-lg w-full animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Create New Narrative</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Narrative Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Anti-EU Sentiment Campaign"
              className="input"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this narrative..."
              rows={3}
              className="input"
            />
          </div>

          <div>
            <label className="label">
              Keywords * <span className="text-gray-500 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              placeholder="e.g., Soros, EU interference, foreign agents"
              className="input"
            />
            <p className="text-xs text-gray-600 mt-1">
              Articles containing these keywords will be linked to this narrative
            </p>
          </div>

          <div>
            <label className="label">Initial Threat Level</label>
            <select
              value={formData.threatLevel}
              onChange={(e) => setFormData({ ...formData, threatLevel: e.target.value })}
              className="input"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn btn-primary disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Narrative'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
