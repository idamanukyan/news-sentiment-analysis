import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { sourcesApi } from '../services/api'
import { useAuthStore } from '../contexts/authStore'
import {
  Plus,
  Database,
  Newspaper,
  Radio,
  Globe,
  CheckCircle,
  Edit2,
  Trash2,
  Power,
  X,
  AlertTriangle,
  Clock,
  FileText,
  ExternalLink,
  Scale,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Info,
  MessageCircle,
} from 'lucide-react'

interface Source {
  id: number
  name: string
  url: string
  type: string
  language: string
  politicalLeaning: string
  active: boolean
  lastFetched?: string
  lastSuccess?: string
  articleCount?: number
  credibilityScore?: number
  credibilityFactors?: {
    sentiment_balance?: number
    volume_regularity?: number
    narrative_diversity?: number
    coordination_clean?: number
  }
  credibilityUpdatedAt?: string
  config?: Record<string, unknown>
  createdAt?: string
}

interface SourceFormData {
  name: string
  url: string
  type: string
  language: string
  politicalLeaning: string
  active: boolean
  config?: Record<string, unknown>
}

const defaultFormData: SourceFormData = {
  name: '',
  url: '',
  type: 'RSS',
  language: 'ARMENIAN',
  politicalLeaning: 'INDEPENDENT',
  active: true,
}

// Skeleton Components
function TableRowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-4">
        <div className="skeleton h-5 w-32 mb-1" />
        <div className="skeleton h-3 w-48" />
      </td>
      <td className="px-4 py-4"><div className="skeleton h-5 w-16 rounded" /></td>
      <td className="px-4 py-4"><div className="skeleton h-5 w-20 rounded" /></td>
      <td className="px-4 py-4"><div className="skeleton h-5 w-20 rounded" /></td>
      <td className="px-4 py-4"><div className="skeleton h-5 w-16" /></td>
      <td className="px-4 py-4"><div className="skeleton h-5 w-14" /></td>
      <td className="px-4 py-4"><div className="skeleton h-4 w-24" /></td>
      <td className="px-4 py-4"><div className="skeleton h-4 w-12" /></td>
      <td className="px-4 py-4"><div className="flex gap-2 justify-end"><div className="skeleton h-8 w-8 rounded" /><div className="skeleton h-8 w-8 rounded" /></div></td>
    </tr>
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

function SourceTypeBadge({ type }: { type: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
    RSS: { className: 'badge-green', icon: <Newspaper size={12} />, label: 'RSS' },
    WEB_SCRAPE: { className: 'badge-blue', icon: <Globe size={12} />, label: 'Web' },
    TELEGRAM: { className: 'badge-purple', icon: <Radio size={12} />, label: 'Telegram' },
  }
  const { className, icon, label } = config[type] || { className: 'badge-gray', icon: <FileText size={12} />, label: type }
  return (
    <span className={`badge ${className} flex items-center gap-1`}>
      {icon}
      {label}
    </span>
  )
}

function LanguageBadge({ language }: { language: string }) {
  const flags: Record<string, string> = {
    ARMENIAN: '🇦🇲',
    RUSSIAN: '🇷🇺',
    ENGLISH: '🇬🇧',
  }
  return (
    <span className="text-sm flex items-center gap-1">
      <span>{flags[language] || '🌍'}</span>
      <span className="text-gray-600">{language.charAt(0) + language.slice(1).toLowerCase()}</span>
    </span>
  )
}

function PoliticalLeaningBadge({ leaning }: { leaning: string }) {
  const config: Record<string, { className: string; label: string }> = {
    GOVERNMENT: { className: 'bg-blue-100 text-blue-800 border border-blue-200', label: 'Government' },
    OPPOSITION: { className: 'bg-red-100 text-red-800 border border-red-200', label: 'Opposition' },
    INDEPENDENT: { className: 'bg-gray-100 text-gray-700 border border-gray-200', label: 'Independent' },
    DIASPORA: { className: 'bg-purple-100 text-purple-800 border border-purple-200', label: 'Diaspora' },
  }
  const { className, label } = config[leaning] || config.INDEPENDENT
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${className}`}>
      {label}
    </span>
  )
}

function CredibilityBadge({ score, factors }: {
  score?: number
  factors?: Source['credibilityFactors']
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (score === undefined || score === null) {
    return (
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <Shield size={12} />
        Pending
      </span>
    )
  }

  const getConfig = (s: number) => {
    if (s >= 0.7) return {
      className: 'bg-green-100 text-green-800 border border-green-200',
      label: 'High',
      icon: ShieldCheck,
      color: 'text-green-600'
    }
    if (s >= 0.4) return {
      className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      label: 'Medium',
      icon: Shield,
      color: 'text-yellow-600'
    }
    return {
      className: 'bg-red-100 text-red-800 border border-red-200',
      label: 'Low',
      icon: ShieldAlert,
      color: 'text-red-600'
    }
  }

  const config = getConfig(score)
  const Icon = config.icon

  const factorLabels: Record<string, string> = {
    sentiment_balance: 'Sentiment Balance',
    volume_regularity: 'Volume Regularity',
    narrative_diversity: 'Narrative Diversity',
    coordination_clean: 'Coordination Clean'
  }

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 cursor-help ${config.className}`}
      >
        <Icon size={12} />
        {config.label}
        <span className="opacity-70">({Math.round(score * 100)}%)</span>
      </button>

      {showTooltip && factors && (
        <div className="absolute z-50 left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3 animate-fade-in">
          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Info size={12} />
            Credibility Factors
          </div>
          <div className="space-y-2">
            {Object.entries(factors).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{factorLabels[key] || key}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        value >= 0.7 ? 'bg-green-500' :
                        value >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(value || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-700 w-8 text-right">
                    {Math.round((value || 0) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusIndicator({ active, lastFetched, lastSuccess }: { active: boolean; lastFetched?: string; lastSuccess?: string }) {
  if (!active) {
    return (
      <span className="flex items-center gap-1.5 text-gray-600 text-sm">
        <span className="w-2 h-2 bg-gray-400 rounded-full" />
        Inactive
      </span>
    )
  }

  const hasError = lastFetched && lastSuccess && new Date(lastFetched) > new Date(lastSuccess)
  const isRecent = lastFetched && (Date.now() - new Date(lastFetched).getTime()) < 3600000

  if (hasError) {
    return (
      <span className="flex items-center gap-1.5 text-red-600 text-sm">
        <span className="w-2 h-2 bg-red-500 rounded-full" />
        Error
      </span>
    )
  }

  return (
    <span className={`flex items-center gap-1.5 text-sm ${isRecent ? 'text-green-600' : 'text-amber-600'}`}>
      <span className={`w-2 h-2 ${isRecent ? 'bg-green-500 animate-pulse' : 'bg-amber-500'} rounded-full`} />
      {isRecent ? 'Active' : 'Delayed'}
    </span>
  )
}

function formatDate(dateString?: string) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SourcesPage() {
  const queryClient = useQueryClient()
  const canManageSources = useAuthStore((state) => state.canManageSources)
  const isAdmin = canManageSources()

  const [filter, setFilter] = useState<'all' | 'rss' | 'telegram' | 'web'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [formData, setFormData] = useState<SourceFormData>(defaultFormData)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const res = await sourcesApi.getAll()
      return res.data as Source[]
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['sources-stats'],
    queryFn: async () => {
      const res = await sourcesApi.getStats()
      return res.data as {
        total: number
        active: number
        inactive: number
        byType: { rss: number; telegram: number; webScrape: number }
        byLeaning: { government: number; opposition: number; independent: number; diaspora: number }
      }
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: SourceFormData) => sourcesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['sources-stats'] })
      setError(null)
      toast.success('Source created successfully')
      closeModal()
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || err.message || 'Failed to create source')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SourceFormData }) => sourcesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['sources-stats'] })
      setError(null)
      toast.success('Source updated successfully')
      closeModal()
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || err.message || 'Failed to update source')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => sourcesApi.toggleActive(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['sources-stats'] })
      const source = sources.find(s => s.id === id)
      toast.success(source?.active ? 'Source disabled' : 'Source enabled')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sourcesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['sources-stats'] })
      toast.success('Source deleted')
      setDeleteConfirm(null)
    },
  })

  const openAddModal = () => {
    setEditingSource(null)
    setFormData(defaultFormData)
    setError(null)
    setShowModal(true)
  }

  const openEditModal = (source: Source) => {
    setEditingSource(source)
    setFormData({
      name: source.name,
      url: source.url,
      type: source.type,
      language: source.language,
      politicalLeaning: source.politicalLeaning || 'INDEPENDENT',
      active: source.active,
      config: source.config,
    })
    setError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingSource(null)
    setFormData(defaultFormData)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSource) {
      updateMutation.mutate({ id: editingSource.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const filteredSources = sources.filter(s => {
    if (filter === 'rss') return s.type === 'RSS'
    if (filter === 'telegram') return s.type === 'TELEGRAM'
    if (filter === 'web') return s.type === 'WEB_SCRAPE'
    return true
  })

  const displayStats = stats || {
    total: sources.length,
    active: sources.filter(s => s.active).length,
    inactive: sources.filter(s => !s.active).length,
    byType: {
      rss: sources.filter(s => s.type === 'RSS').length,
      telegram: sources.filter(s => s.type === 'TELEGRAM').length,
      webScrape: sources.filter(s => s.type === 'WEB_SCRAPE').length,
    },
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-24 rounded-lg" />
          ))}
        </div>
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Credibility</th>
                <th>Leaning</th>
                <th>Language</th>
                <th>Status</th>
                <th>Last Fetched</th>
                <th>Articles</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Non-Partisan Coverage Banner */}
      {stats?.byLeaning && (
        <div className="card p-4 bg-gradient-to-r from-blue-50 via-gray-50 to-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Scale size={20} className="text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Non-Partisan Coverage</h3>
                <div className="flex items-center gap-4 mt-1 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <strong>{stats.byLeaning.government}</strong>
                    <span className="text-gray-600">gov</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <strong>{stats.byLeaning.opposition}</strong>
                    <span className="text-gray-600">opp</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    <strong>{stats.byLeaning.independent}</strong>
                    <span className="text-gray-600">ind</span>
                  </span>
                  {stats.byLeaning.diaspora > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <strong>{stats.byLeaning.diaspora}</strong>
                      <span className="text-gray-600">diaspora</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 text-right">
              AIIM monitors the full<br />political spectrum
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sources</p>
              <p className="text-2xl font-bold text-gray-900">{displayStats.total}</p>
            </div>
            <div className="p-2.5 bg-gray-100 rounded-lg">
              <Database size={20} className="text-gray-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">RSS Feeds</p>
              <p className="text-2xl font-bold text-green-600">{displayStats.byType.rss}</p>
            </div>
            <div className="p-2.5 bg-green-100 rounded-lg">
              <Newspaper size={20} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Telegram</p>
              <p className="text-2xl font-bold text-purple-600">{displayStats.byType.telegram}</p>
            </div>
            <div className="p-2.5 bg-purple-100 rounded-lg">
              <Radio size={20} className="text-purple-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Web Scrape</p>
              <p className="text-2xl font-bold text-blue-600">{displayStats.byType.webScrape}</p>
            </div>
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Globe size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{displayStats.active}</p>
            </div>
            <div className="p-2.5 bg-green-100 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Sources
          </button>
          <button
            onClick={() => setFilter('rss')}
            className={`btn btn-sm ${filter === 'rss' ? 'bg-green-600 text-white hover:bg-green-700' : 'btn-secondary'}`}
          >
            <Newspaper size={14} />
            RSS
          </button>
          <button
            onClick={() => setFilter('telegram')}
            className={`btn btn-sm ${filter === 'telegram' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'btn-secondary'}`}
          >
            <Radio size={14} />
            Telegram
          </button>
          <button
            onClick={() => setFilter('web')}
            className={`btn btn-sm ${filter === 'web' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Globe size={14} />
            Web
          </button>
        </div>

        {isAdmin && (
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={16} />
            Add Source
          </button>
        )}
      </div>

      {/* Sources Table */}
      <div className="card overflow-hidden">
        {filteredSources.length === 0 ? (
          <div className="empty-state py-16">
            <Database className="empty-state-icon" />
            <p className="empty-state-title">No sources found</p>
            <p className="empty-state-description">
              {filter !== 'all' ? 'Try adjusting your filters' : 'Click "Add Source" to create one'}
            </p>
            {isAdmin && filter === 'all' && (
              <button onClick={openAddModal} className="btn btn-primary mt-4">
                <Plus size={16} />
                Add Source
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Credibility</th>
                  <th>Leaning</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Last Fetched</th>
                  <th>Articles</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.map(source => (
                  <tr key={source.id}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{source.name}</p>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 hover:text-primary-600 truncate max-w-xs flex items-center gap-1 group"
                        >
                          {source.url.length > 40 ? source.url.substring(0, 40) + '...' : source.url}
                          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </div>
                    </td>
                    <td><SourceTypeBadge type={source.type} /></td>
                    <td><CredibilityBadge score={source.credibilityScore} factors={source.credibilityFactors} /></td>
                    <td><PoliticalLeaningBadge leaning={source.politicalLeaning || 'INDEPENDENT'} /></td>
                    <td><LanguageBadge language={source.language} /></td>
                    <td>
                      <StatusIndicator
                        active={source.active}
                        lastFetched={source.lastFetched}
                        lastSuccess={source.lastSuccess}
                      />
                    </td>
                    <td className="text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-gray-400" />
                        {formatDate(source.lastFetched)}
                      </span>
                    </td>
                    <td className="text-sm font-medium text-gray-900">
                      {source.articleCount?.toLocaleString() || '0'}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => openEditModal(source)}
                              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => toggleMutation.mutate(source.id)}
                              disabled={toggleMutation.isPending}
                              className={`p-2 rounded-lg transition-colors ${
                                source.active
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={source.active ? 'Disable' : 'Enable'}
                            >
                              <Power size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(source.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">View only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coming Soon Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Coming Soon</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Facebook Monitoring */}
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-5 opacity-70">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Globe size={24} className="text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-400">Facebook Monitoring</h4>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-500 rounded">
                    Coming Q2 2026
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  Track public pages and groups
                </p>
              </div>
            </div>
          </div>

          {/* X/Twitter Monitoring */}
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-5 opacity-70">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <MessageCircle size={24} className="text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-400">X/Twitter Monitoring</h4>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-500 rounded">
                    Coming Q2 2026
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  Track hashtags and political accounts
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Source Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="card p-6 max-w-md w-full animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingSource ? 'Edit Source' : 'Add New Source'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Source Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="input"
                >
                  <option value="RSS">RSS Feed</option>
                  <option value="WEB_SCRAPE">Web Scrape</option>
                  <option value="TELEGRAM">Telegram Channel</option>
                </select>
              </div>

              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Armenpress"
                  required
                />
              </div>

              <div>
                <label className="label">
                  {formData.type === 'TELEGRAM' ? 'Channel URL or @handle' : 'URL'}
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  className="input"
                  placeholder={formData.type === 'TELEGRAM' ? 'https://t.me/channel or @channel' : 'https://...'}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Language</label>
                  <select
                    value={formData.language}
                    onChange={e => setFormData({ ...formData, language: e.target.value })}
                    className="input"
                  >
                    <option value="ARMENIAN">Armenian</option>
                    <option value="RUSSIAN">Russian</option>
                    <option value="ENGLISH">English</option>
                  </select>
                </div>

                <div>
                  <label className="label">Political Leaning</label>
                  <select
                    value={formData.politicalLeaning}
                    onChange={e => setFormData({ ...formData, politicalLeaning: e.target.value })}
                    className="input"
                  >
                    <option value="GOVERNMENT">Government-aligned</option>
                    <option value="OPPOSITION">Opposition-aligned</option>
                    <option value="INDEPENDENT">Independent</option>
                    <option value="DIASPORA">Diaspora</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                  Active (start monitoring immediately)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 btn btn-primary disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingSource ? 'Update' : 'Add Source'}
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
              <h2 className="text-lg font-bold text-gray-900">Delete Source?</h2>
            </div>
            <p className="text-gray-600 mb-6 text-sm">
              This will remove the source and stop monitoring. Articles already collected will be preserved.
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
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
