import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { topicsApi } from '../services/api'
import type { Topic } from '../types'
import {
  Plus,
  Tags,
  Globe,
  Search,
  Clock,
  Trash2,
  X,
  AlertTriangle,
  Zap,
  FileText,
  RefreshCw,
} from 'lucide-react'

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
]

interface NewTopicForm {
  name: string
  keywords: string
  globalSearch: boolean
  language: string
}

const defaultFormData: NewTopicForm = {
  name: '',
  keywords: '',
  globalSearch: true,
  language: 'en',
}

// Skeleton Components
function TopicCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="skeleton h-5 w-40" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              <div className="skeleton h-6 w-20 rounded" />
              <div className="skeleton h-6 w-24 rounded" />
              <div className="skeleton h-6 w-16 rounded" />
            </div>
            <div className="skeleton h-3 w-36" />
          </div>
        </div>
        <div className="skeleton h-8 w-8 rounded-lg" />
      </div>
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

function LanguageBadge({ code }: { code: string }) {
  const lang = LANGUAGES.find((l) => l.code === code)
  return (
    <span className="text-sm flex items-center gap-1">
      <span>{lang?.flag || '🌍'}</span>
      <span className="text-gray-600">{lang?.name || code}</span>
    </span>
  )
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

export default function TopicsPage() {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<NewTopicForm>(defaultFormData)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await topicsApi.getAll()
      return res.data as Topic[]
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; keywords: string[]; globalSearch: boolean; language: string }) =>
      topicsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success('Topic created successfully')
      closeModal()
    },
    onError: () => {
      toast.error('Failed to create topic')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => topicsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success('Topic deleted')
      setDeleteConfirm(null)
    },
  })

  const openModal = () => {
    setFormData(defaultFormData)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData(defaultFormData)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const keywords = formData.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    if (formData.name && keywords.length > 0) {
      createMutation.mutate({
        name: formData.name,
        keywords,
        globalSearch: formData.globalSearch,
        language: formData.language,
      })
    }
  }

  // Calculate stats
  const totalTopics = topics?.length || 0
  const globalTopics = topics?.filter((t) => t.globalSearch).length || 0
  const recentlySearched = topics?.filter((t) => {
    if (!t.lastSearchedAt) return false
    const hourAgo = Date.now() - 3600000
    return new Date(t.lastSearchedAt).getTime() > hourAgo
  }).length || 0
  const totalKeywords = topics?.reduce((acc, t) => acc + t.keywords.length, 0) || 0

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="flex justify-end">
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <TopicCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Globe size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Global News Tracking</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Topics automatically search worldwide news via NewsAPI every hour
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <RefreshCw size={12} className="text-blue-500" />
            Hourly sync
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Topics</p>
              <p className="text-2xl font-bold text-gray-900">{totalTopics}</p>
            </div>
            <div className="p-2.5 bg-gray-100 rounded-lg">
              <Tags size={20} className="text-gray-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Global Search</p>
              <p className="text-2xl font-bold text-blue-600">{globalTopics}</p>
            </div>
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Globe size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recently Active</p>
              <p className="text-2xl font-bold text-green-600">{recentlySearched}</p>
            </div>
            <div className="p-2.5 bg-green-100 rounded-lg">
              <Zap size={20} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Keywords</p>
              <p className="text-2xl font-bold text-purple-600">{totalKeywords}</p>
            </div>
            <div className="p-2.5 bg-purple-100 rounded-lg">
              <Search size={20} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button onClick={openModal} className="btn btn-primary">
          <Plus size={16} />
          Create Topic
        </button>
      </div>

      {/* Topics List */}
      {topics?.length === 0 ? (
        <div className="card">
          <div className="empty-state py-16">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tags size={32} className="text-blue-600" />
            </div>
            <p className="empty-state-title">No topics yet</p>
            <p className="empty-state-description max-w-md">
              Topics let you track specific subjects across worldwide news sources.
              Create a topic with keywords to automatically collect and analyze relevant articles.
            </p>
            <button onClick={openModal} className="btn btn-primary mt-4">
              <Plus size={16} />
              Create Your First Topic
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {topics?.map((topic) => (
            <div key={topic.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg ${topic.globalSearch ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    {topic.globalSearch ? (
                      <Globe size={20} className="text-blue-600" />
                    ) : (
                      <FileText size={20} className="text-gray-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{topic.name}</h3>
                      {topic.globalSearch && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Global
                        </span>
                      )}
                      {topic.language && <LanguageBadge code={topic.language} />}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {topic.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg border border-gray-200"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    {topic.lastSearchedAt && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        Last searched: {formatRelativeTime(topic.lastSearchedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setDeleteConfirm(topic.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete topic"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Topic Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="card p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Create New Topic</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Topic Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Armenia Tech Industry"
                  required
                />
              </div>

              <div>
                <label className="label">Keywords (comma-separated)</label>
                <textarea
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Armenia startup, Yerevan tech, Armenian entrepreneurs"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use quotes for exact phrases: "Armenia tech", startup, innovation
                </p>
              </div>

              <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <input
                  type="checkbox"
                  id="globalSearch"
                  checked={formData.globalSearch}
                  onChange={(e) => setFormData({ ...formData, globalSearch: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="globalSearch" className="ml-3">
                  <span className="text-sm font-medium text-gray-900">Enable Global Search</span>
                  <p className="text-xs text-gray-600">Search worldwide news via NewsAPI</p>
                </label>
              </div>

              {formData.globalSearch && (
                <div>
                  <label className="label">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="input"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 btn btn-primary disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="card p-6 max-w-sm w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Delete Topic?</h2>
            </div>
            <p className="text-gray-600 mb-6 text-sm">
              This will stop tracking this topic. Articles already collected will be preserved.
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
