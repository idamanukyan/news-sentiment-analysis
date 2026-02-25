import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { alertsApi, narrativesApi, articlesApi } from '../services/api'
import {
  X,
  AlertTriangle,
  Bell,
  Eye,
  Check,
  MessageSquare,
  ExternalLink,
  FileText,
  TrendingUp,
  Zap,
  RefreshCw,
  Target,
  Flame,
  ChevronRight,
  Activity,
  Calendar,
  Globe,
  Newspaper,
  Radio,
  Ban,
} from 'lucide-react'

interface Alert {
  id: number
  narrativeId: number | null
  narrativeName: string | null
  alertType: string
  severity: string
  title: string
  description: string
  triggeredAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  status: string
  metadata: Record<string, unknown>
  createdAt: string
}

interface InvestigationPanelProps {
  alert: Alert
  onClose: () => void
  onStatusChange?: () => void
}

// Helper components
function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    CRITICAL: { bg: 'bg-purple-600', text: 'text-white' },
    HIGH: { bg: 'bg-red-600', text: 'text-white' },
    MEDIUM: { bg: 'bg-amber-500', text: 'text-white' },
    LOW: { bg: 'bg-blue-500', text: 'text-white' },
  }
  const { bg, text } = config[severity] || { bg: 'bg-gray-500', text: 'text-white' }
  return (
    <span className={`px-2.5 py-1 text-xs font-bold rounded ${bg} ${text}`}>
      {severity}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    ACTIVE: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    ACKNOWLEDGED: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    RESOLVED: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    DISMISSED: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  }
  const { bg, text, dot } = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === 'ACTIVE' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  )
}

function AlertTypeIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const config: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    VOLUME_SPIKE: { icon: <TrendingUp size={size === 'lg' ? 24 : size === 'md' ? 18 : 14} />, bg: 'bg-blue-100', color: 'text-blue-600' },
    NEW_NARRATIVE: { icon: <Zap size={size === 'lg' ? 24 : size === 'md' ? 18 : 14} />, bg: 'bg-purple-100', color: 'text-purple-600' },
    CROSS_PLATFORM: { icon: <RefreshCw size={size === 'lg' ? 24 : size === 'md' ? 18 : 14} />, bg: 'bg-orange-100', color: 'text-orange-600' },
    COORDINATED: { icon: <Target size={size === 'lg' ? 24 : size === 'md' ? 18 : 14} />, bg: 'bg-red-100', color: 'text-red-600' },
    VIRAL: { icon: <Flame size={size === 'lg' ? 24 : size === 'md' ? 18 : 14} />, bg: 'bg-amber-100', color: 'text-amber-600' },
  }
  const { icon, bg, color } = config[type] || { icon: <AlertTriangle size={size === 'lg' ? 24 : size === 'md' ? 18 : 14} />, bg: 'bg-gray-100', color: 'text-gray-600' }
  const padding = size === 'lg' ? 'p-3' : size === 'md' ? 'p-2.5' : 'p-2'
  return (
    <div className={`${padding} rounded-lg ${bg}`}>
      <span className={color}>{icon}</span>
    </div>
  )
}

function formatDateTime(isoString: string) {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(isoString: string) {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

function getSourceIcon(type: string) {
  if (type === 'telegram' || type === 'TELEGRAM') return <Radio size={12} className="text-cyan-600" />
  if (type === 'rss' || type === 'RSS') return <Newspaper size={12} className="text-blue-600" />
  return <Globe size={12} className="text-gray-500" />
}

export default function InvestigationPanel({ alert, onClose, onStatusChange }: InvestigationPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'articles' | 'timeline'>('overview')
  const queryClient = useQueryClient()

  // Fetch narrative details if narrativeId exists
  const { data: narrative, isLoading: narrativeLoading } = useQuery({
    queryKey: ['narrative', alert.narrativeId],
    queryFn: async () => {
      if (!alert.narrativeId) return null
      const res = await narrativesApi.getById(alert.narrativeId)
      return res.data
    },
    enabled: !!alert.narrativeId,
  })

  // Fetch related articles
  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['investigation-articles', alert.narrativeId],
    queryFn: async () => {
      if (!alert.narrativeId) return { content: [], totalElements: 0 }
      const res = await articlesApi.getAll({
        narrativeId: alert.narrativeId,
        size: 10,
      })
      return res.data
    },
    enabled: !!alert.narrativeId,
  })

  const articles = articlesData?.content || []
  const totalArticles = articlesData?.totalElements || 0

  // Mutations
  const acknowledgeMutation = useMutation({
    mutationFn: () => alertsApi.acknowledge(alert.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      toast.success('Alert acknowledged')
      onStatusChange?.()
    },
  })

  const resolveMutation = useMutation({
    mutationFn: () => alertsApi.resolve(alert.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      toast.success('Alert resolved')
      onStatusChange?.()
    },
  })

  const dismissMutation = useMutation({
    mutationFn: () => alertsApi.dismiss(alert.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      toast.success('Alert dismissed')
      onStatusChange?.()
    },
  })

  // Build timeline events
  const timelineEvents = [
    {
      type: 'triggered',
      label: 'Alert triggered',
      time: alert.triggeredAt,
      icon: <Bell size={14} />,
      color: 'text-red-600 bg-red-100',
    },
    ...(alert.acknowledgedAt ? [{
      type: 'acknowledged',
      label: 'Alert acknowledged',
      time: alert.acknowledgedAt,
      icon: <Eye size={14} />,
      color: 'text-amber-600 bg-amber-100',
    }] : []),
    ...(alert.resolvedAt ? [{
      type: 'resolved',
      label: 'Alert resolved',
      time: alert.resolvedAt,
      icon: <Check size={14} />,
      color: 'text-green-600 bg-green-100',
    }] : []),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  const isActive = alert.status === 'ACTIVE'
  const isAcknowledged = alert.status === 'ACKNOWLEDGED'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <AlertTypeIcon type={alert.alertType} size="lg" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{alert.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {alert.alertType.replace(/_/g, ' ')} • {formatRelativeTime(alert.triggeredAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-6 border-t border-gray-100">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'articles'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Articles ({totalArticles})
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'timeline'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{alert.description}</p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {(alert.metadata?.articles_count as number) || totalArticles || '-'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Related Articles</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {(alert.metadata?.sources_count as number) || narrative?.sourceCount || '-'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Sources</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {(alert.metadata?.volume_change as string) || '-'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Volume Change</p>
                </div>
              </div>

              {/* Linked Narrative */}
              {alert.narrativeId && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-purple-600" />
                      <span className="text-sm font-semibold text-gray-900">Linked Narrative</span>
                    </div>
                    <Link
                      to={`/narratives?id=${alert.narrativeId}`}
                      className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      View details <ChevronRight size={12} />
                    </Link>
                  </div>
                  <div className="p-4">
                    {narrativeLoading ? (
                      <div className="space-y-2">
                        <div className="skeleton h-5 w-48" />
                        <div className="skeleton h-4 w-full" />
                        <div className="flex gap-2 mt-2">
                          <div className="skeleton h-6 w-16 rounded-full" />
                          <div className="skeleton h-6 w-20 rounded-full" />
                        </div>
                      </div>
                    ) : narrative ? (
                      <>
                        <h4 className="font-semibold text-gray-900 mb-1">{narrative.name}</h4>
                        <p className="text-sm text-gray-600 mb-3">{narrative.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {narrative.keywords?.slice(0, 5).map((kw: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {kw}
                            </span>
                          ))}
                          {narrative.keywords?.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                              +{narrative.keywords.length - 5} more
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileText size={12} />
                            {narrative.articleCount || 0} articles
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity size={12} />
                            Threat: {narrative.threatLevel}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Narrative not found</p>
                    )}
                  </div>
                </div>
              )}

              {/* Alert Metadata */}
              {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">Additional Context</span>
                  </div>
                  <div className="p-4">
                    <dl className="grid grid-cols-2 gap-3">
                      {Object.entries(alert.metadata).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs text-gray-500 uppercase tracking-wide">
                            {key.replace(/_/g, ' ')}
                          </dt>
                          <dd className="text-sm font-medium text-gray-900 mt-0.5">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'articles' && (
            <div className="space-y-4">
              {articlesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="skeleton w-10 h-10 rounded" />
                        <div className="flex-1">
                          <div className="skeleton h-4 w-3/4 mb-2" />
                          <div className="skeleton h-3 w-full mb-2" />
                          <div className="skeleton h-3 w-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : articles.length > 0 ? (
                <>
                  {articles.map((article: {
                    id: number
                    title: string
                    url: string
                    publishedAt: string
                    sourceName: string
                    sourceType: string
                    sentiment: string
                    snippet?: string
                  }) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border border-gray-100 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                          {getSourceIcon(article.sourceType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600">
                            {article.title}
                          </h4>
                          {article.snippet && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.snippet}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{article.sourceName}</span>
                            <span>{formatRelativeTime(article.publishedAt)}</span>
                            {article.sentiment && (
                              <span className={`px-2 py-0.5 rounded ${
                                article.sentiment === 'POSITIVE' ? 'bg-green-100 text-green-700' :
                                article.sentiment === 'NEGATIVE' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {article.sentiment}
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-gray-300 group-hover:text-primary-600 flex-shrink-0" />
                      </div>
                    </a>
                  ))}
                  {totalArticles > articles.length && (
                    <Link
                      to={`/news?narrativeId=${alert.narrativeId}`}
                      className="block text-center py-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View all {totalArticles} articles
                    </Link>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No articles linked to this alert</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="relative">
                {timelineEvents.map((event, index) => (
                  <div key={event.type + event.time} className="flex gap-4 pb-6 last:pb-0">
                    {/* Line */}
                    {index < timelineEvents.length - 1 && (
                      <div className="absolute left-[18px] top-10 bottom-0 w-px bg-gray-200" style={{ top: `${index * 80 + 36}px`, height: '44px' }} />
                    )}
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${event.color}`}>
                      {event.icon}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <p className="font-medium text-gray-900">{event.label}</p>
                      <p className="text-sm text-gray-500">{formatDateTime(event.time)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Current Status */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Current Status</h4>
                <div className="flex items-center gap-2">
                  <StatusBadge status={alert.status} />
                  <span className="text-sm text-gray-500">
                    {isActive && 'Requires immediate attention'}
                    {isAcknowledged && 'Being investigated'}
                    {alert.status === 'RESOLVED' && 'Issue has been addressed'}
                    {alert.status === 'DISMISSED' && 'Marked as non-actionable'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <Calendar size={12} className="inline mr-1" />
              Created {formatDateTime(alert.createdAt)}
            </div>
            <div className="flex gap-2">
              {isActive && (
                <>
                  <button
                    onClick={() => dismissMutation.mutate()}
                    disabled={dismissMutation.isPending}
                    className="btn btn-secondary btn-sm"
                    title="Dismiss as false positive"
                  >
                    <Ban size={14} />
                    Dismiss
                  </button>
                  <button
                    onClick={() => acknowledgeMutation.mutate()}
                    disabled={acknowledgeMutation.isPending}
                    className="btn bg-amber-500 text-white hover:bg-amber-600 btn-sm"
                  >
                    <Eye size={14} />
                    Acknowledge
                  </button>
                  <button
                    onClick={() => resolveMutation.mutate()}
                    disabled={resolveMutation.isPending}
                    className="btn bg-green-600 text-white hover:bg-green-700 btn-sm"
                  >
                    <Check size={14} />
                    Resolve
                  </button>
                </>
              )}
              {isAcknowledged && (
                <>
                  <button
                    onClick={() => dismissMutation.mutate()}
                    disabled={dismissMutation.isPending}
                    className="btn btn-secondary btn-sm"
                  >
                    <Ban size={14} />
                    Dismiss
                  </button>
                  <button
                    onClick={() => resolveMutation.mutate()}
                    disabled={resolveMutation.isPending}
                    className="btn bg-green-600 text-white hover:bg-green-700 btn-sm"
                  >
                    <Check size={14} />
                    Mark Resolved
                  </button>
                </>
              )}
              {(alert.status === 'RESOLVED' || alert.status === 'DISMISSED') && (
                <span className="text-sm text-gray-500">
                  {alert.status === 'RESOLVED' ? 'This alert has been resolved' : 'This alert was dismissed'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
