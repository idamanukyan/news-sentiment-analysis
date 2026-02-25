import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  alertRulesApi,
  AlertRule,
  AlertRuleRequest,
  AlertRuleConditions,
} from '../services/api'
import {
  Plus,
  Bell,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Zap,
  X,
  Save,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Database,
  Loader2,
} from 'lucide-react'

const severityColors: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CRITICAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

interface RuleFormData {
  name: string
  description: string
  severity: string
  cooldownMinutes: number
  conditions: {
    keywords: string
    sentimentThreshold: number | null
    volumeThreshold: number | null
    volumeTimeframeHours: number
    sourceTypes: string[]
    matchAll: boolean
  }
}

const emptyFormData: RuleFormData = {
  name: '',
  description: '',
  severity: 'MEDIUM',
  cooldownMinutes: 60,
  conditions: {
    keywords: '',
    sentimentThreshold: null,
    volumeThreshold: null,
    volumeTimeframeHours: 24,
    sourceTypes: [],
    matchAll: false,
  },
}

export default function AlertRulesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [formData, setFormData] = useState<RuleFormData>(emptyFormData)

  const { data: rules, isLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      const res = await alertRulesApi.getAll()
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: alertRulesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
      toast.success('Alert rule created')
      setShowForm(false)
      setFormData(emptyFormData)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AlertRuleRequest }) =>
      alertRulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
      toast.success('Alert rule updated')
      setShowForm(false)
      setEditingRule(null)
      setFormData(emptyFormData)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: alertRulesApi.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: alertRulesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
      toast.success('Alert rule deleted')
    },
  })

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || '',
      severity: rule.severity,
      cooldownMinutes: rule.cooldownMinutes,
      conditions: {
        keywords: rule.conditions.keywords?.join(', ') || '',
        sentimentThreshold: rule.conditions.sentimentThreshold ?? null,
        volumeThreshold: rule.conditions.volumeThreshold ?? null,
        volumeTimeframeHours: rule.conditions.volumeTimeframeHours || 24,
        sourceTypes: rule.conditions.sourceTypes || [],
        matchAll: rule.conditions.matchAll || false,
      },
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const conditions: AlertRuleConditions = {}
    if (formData.conditions.keywords.trim()) {
      conditions.keywords = formData.conditions.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    }
    if (formData.conditions.sentimentThreshold !== null) {
      conditions.sentimentThreshold = formData.conditions.sentimentThreshold
    }
    if (formData.conditions.volumeThreshold !== null) {
      conditions.volumeThreshold = formData.conditions.volumeThreshold
      conditions.volumeTimeframeHours = formData.conditions.volumeTimeframeHours
    }
    if (formData.conditions.sourceTypes.length > 0) {
      conditions.sourceTypes = formData.conditions.sourceTypes
    }
    conditions.matchAll = formData.conditions.matchAll

    const request: AlertRuleRequest = {
      name: formData.name,
      description: formData.description || undefined,
      conditions,
      severity: formData.severity,
      cooldownMinutes: formData.cooldownMinutes,
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: request })
    } else {
      createMutation.mutate(request)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingRule(null)
    setFormData(emptyFormData)
  }

  const getConditionSummary = (conditions: AlertRuleConditions): string => {
    const parts: string[] = []
    if (conditions.keywords?.length) {
      parts.push(`Keywords: ${conditions.keywords.slice(0, 3).join(', ')}${conditions.keywords.length > 3 ? '...' : ''}`)
    }
    if (conditions.volumeThreshold) {
      parts.push(`Volume > ${conditions.volumeThreshold} in ${conditions.volumeTimeframeHours || 24}h`)
    }
    if (conditions.sentimentThreshold) {
      parts.push(`Negative sentiment > ${conditions.sentimentThreshold}%`)
    }
    if (conditions.sourceTypes?.length) {
      parts.push(`Sources: ${conditions.sourceTypes.join(', ')}`)
    }
    return parts.join(' | ') || 'No conditions'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Custom Alert Rules</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create rules to automatically trigger alerts based on custom conditions
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <Plus size={18} />
          Create Rule
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingRule ? 'Edit Rule' : 'Create New Rule'}
            </h2>
            <button onClick={handleCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Rule Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., High Volume Election Content"
                  required
                />
              </div>
              <div>
                <label className="label">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="input"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input min-h-[80px]"
                placeholder="Describe what this rule monitors..."
              />
            </div>

            {/* Conditions */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap size={16} />
                Trigger Conditions
              </h3>

              <div className="space-y-4">
                {/* Keywords */}
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={16} className="text-purple-500" />
                    <label className="font-medium text-gray-900 dark:text-white">Keywords</label>
                  </div>
                  <input
                    type="text"
                    value={formData.conditions.keywords}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: { ...formData.conditions, keywords: e.target.value },
                    })}
                    className="input"
                    placeholder="election, voting, democracy (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Trigger when articles contain any of these keywords
                  </p>
                </div>

                {/* Volume Threshold */}
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-blue-500" />
                    <label className="font-medium text-gray-900 dark:text-white">Volume Threshold</label>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={formData.conditions.volumeThreshold ?? ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            volumeThreshold: e.target.value ? parseInt(e.target.value) : null,
                          },
                        })}
                        className="input"
                        placeholder="Article count"
                        min={1}
                      />
                    </div>
                    <div className="w-32">
                      <select
                        value={formData.conditions.volumeTimeframeHours}
                        onChange={(e) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            volumeTimeframeHours: parseInt(e.target.value),
                          },
                        })}
                        className="input"
                      >
                        <option value={1}>1 hour</option>
                        <option value={6}>6 hours</option>
                        <option value={12}>12 hours</option>
                        <option value={24}>24 hours</option>
                        <option value={48}>48 hours</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Trigger when article count exceeds threshold in timeframe
                  </p>
                </div>

                {/* Sentiment Threshold */}
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    <label className="font-medium text-gray-900 dark:text-white">Negative Sentiment Threshold</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.conditions.sentimentThreshold ?? ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          sentimentThreshold: e.target.value ? parseInt(e.target.value) : null,
                        },
                      })}
                      className="input w-24"
                      placeholder="%"
                      min={1}
                      max={100}
                    />
                    <span className="text-gray-600 dark:text-gray-400">%</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Trigger when negative sentiment exceeds this percentage
                  </p>
                </div>

                {/* Source Types */}
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database size={16} className="text-green-500" />
                    <label className="font-medium text-gray-900 dark:text-white">Source Types</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['NEWS', 'TELEGRAM', 'RSS'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const current = formData.conditions.sourceTypes
                          const newTypes = current.includes(type)
                            ? current.filter((t) => t !== type)
                            : [...current, type]
                          setFormData({
                            ...formData,
                            conditions: { ...formData.conditions, sourceTypes: newTypes },
                          })
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          formData.conditions.sourceTypes.includes(type)
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white dark:bg-slate-600 border-gray-300 dark:border-slate-500 text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Only monitor content from selected source types
                  </p>
                </div>

                {/* Match Logic */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="matchAll"
                    checked={formData.conditions.matchAll}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: { ...formData.conditions, matchAll: e.target.checked },
                    })}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                  <label htmlFor="matchAll" className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Require all conditions</span> (AND logic). If unchecked, any condition can trigger (OR logic).
                  </label>
                </div>
              </div>
            </div>

            {/* Cooldown */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-gray-500" />
                <label className="font-medium text-gray-900 dark:text-white">Cooldown Period</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.cooldownMinutes}
                  onChange={(e) => setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) || 60 })}
                  className="input w-24"
                  min={5}
                />
                <span className="text-gray-600 dark:text-gray-400">minutes between triggers</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Prevents alert spam by waiting before the rule can trigger again
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn btn-primary"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules List */}
      {isLoading ? (
        <div className="card p-12 text-center">
          <Loader2 size={32} className="mx-auto text-gray-400 animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading rules...</p>
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`card p-5 ${!rule.enabled ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Bell size={18} className={rule.enabled ? 'text-primary-500' : 'text-gray-400'} />
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{rule.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[rule.severity]}`}>
                      {rule.severity}
                    </span>
                    {!rule.enabled && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400">
                        Disabled
                      </span>
                    )}
                  </div>
                  {rule.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{rule.description}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {getConditionSummary(rule.conditions)}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>Triggered {rule.triggerCount} times</span>
                    <span>Last: {formatTimeAgo(rule.lastTriggeredAt)}</span>
                    <span>Cooldown: {rule.cooldownMinutes}m</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMutation.mutate(rule.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.enabled ? (
                      <ToggleRight size={20} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={20} className="text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Edit rule"
                  >
                    <Edit2 size={18} className="text-gray-500" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this rule?')) {
                        deleteMutation.mutate(rule.id)
                      }
                    }}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 size={18} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Bell size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No custom alert rules</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Create your first rule to automatically monitor content and receive alerts
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={18} />
            Create Your First Rule
          </button>
        </div>
      )}
    </div>
  )
}
