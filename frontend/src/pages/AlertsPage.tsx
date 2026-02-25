import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { alertsApi, teamApi } from '../services/api'
import { useAuthStore } from '../contexts/authStore'
import InvestigationPanel from '../components/InvestigationPanel'
import useWebSocket from '../hooks/useWebSocket'
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
  RefreshCw,
  Target,
  Flame,
  Check,
  Eye,
  MessageSquare,
  FileText,
  Search,
  User,
  UserPlus,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  X,
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
  assignedTo: string | null
  assignedAt: string | null
  priority: number
  notes: string | null
}

const PRIORITY_OPTIONS = [
  { value: 0, label: 'Normal', color: 'text-gray-600' },
  { value: 1, label: 'High', color: 'text-amber-600' },
  { value: 2, label: 'Urgent', color: 'text-red-600' },
]

// Skeleton Components
function AlertCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <div className="skeleton h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="skeleton h-5 w-48" />
            <div className="skeleton h-5 w-16 rounded" />
            <div className="skeleton h-5 w-20 rounded" />
          </div>
          <div className="skeleton h-4 w-full mb-2" />
          <div className="flex gap-4">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-3 w-20" />
          </div>
        </div>
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

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    CRITICAL: { bg: 'bg-purple-600', text: 'text-white' },
    HIGH: { bg: 'bg-red-600', text: 'text-white' },
    MEDIUM: { bg: 'bg-amber-500', text: 'text-white' },
    LOW: { bg: 'bg-blue-500', text: 'text-white' },
  }
  const { bg, text } = config[severity] || { bg: 'bg-gray-500', text: 'text-white' }
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded ${bg} ${text}`}>
      {severity}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    ACTIVE: 'badge-red',
    ACKNOWLEDGED: 'badge-yellow',
    RESOLVED: 'badge-green',
    DISMISSED: 'badge-gray',
  }
  return (
    <span className={`badge ${config[status] || 'badge-gray'}`}>
      {status}
    </span>
  )
}

function AlertTypeIcon({ type }: { type: string }) {
  const config: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    VOLUME_SPIKE: { icon: <TrendingUp size={18} />, bg: 'bg-blue-100', color: 'text-blue-600' },
    NEW_NARRATIVE: { icon: <Zap size={18} />, bg: 'bg-purple-100', color: 'text-purple-600' },
    CROSS_PLATFORM: { icon: <RefreshCw size={18} />, bg: 'bg-orange-100', color: 'text-orange-600' },
    COORDINATED: { icon: <Target size={18} />, bg: 'bg-red-100', color: 'text-red-600' },
    VIRAL: { icon: <Flame size={18} />, bg: 'bg-amber-100', color: 'text-amber-600' },
  }
  const { icon, bg, color } = config[type] || { icon: <AlertTriangle size={18} />, bg: 'bg-gray-100', color: 'text-gray-600' }
  return (
    <div className={`p-2.5 rounded-lg ${bg}`}>
      <span className={color}>{icon}</span>
    </div>
  )
}

function formatTime(isoString: string) {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString()
}

export default function AlertsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>('all')
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [assigningAlertId, setAssigningAlertId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  // WebSocket for real-time updates
  const handleAlertUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] })
    queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
  }, [queryClient])

  const { isConnected: wsConnected } = useWebSocket({
    onAlert: handleAlertUpdate,
    showToasts: true,
  })

  // Current user's email for "mine" filter
  const currentUser = user?.email || ''

  // Fetch team members from API
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await teamApi.getMembers()
      return res.data
    },
  })

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await alertsApi.getAll()
      return res.data
    },
  })

  const { data: statsData } = useQuery({
    queryKey: ['alert-stats'],
    queryFn: async () => {
      const res = await alertsApi.getStats()
      return res.data
    },
  })

  const acknowledgeMutation = useMutation({
    mutationFn: (id: number) => alertsApi.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      toast.success('Alert acknowledged')
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (id: number) => alertsApi.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      toast.success('Alert resolved')
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedTo, priority }: { id: number; assignedTo: string; priority?: number }) =>
      alertsApi.assign(id, assignedTo, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      setAssigningAlertId(null)
      toast.success('Alert assigned')
    },
  })

  // Bulk operations
  const bulkAcknowledgeMutation = useMutation({
    mutationFn: (alertIds: number[]) => alertsApi.bulkAcknowledge(alertIds),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      setSelectedIds(new Set())
      setSelectMode(false)
      toast.success(`${res.data.acknowledged} alerts acknowledged`)
    },
  })

  const bulkResolveMutation = useMutation({
    mutationFn: (alertIds: number[]) => alertsApi.bulkResolve(alertIds),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      setSelectedIds(new Set())
      setSelectMode(false)
      toast.success(`${res.data.resolved} alerts resolved`)
    },
  })

  const bulkDismissMutation = useMutation({
    mutationFn: (alertIds: number[]) => alertsApi.bulkDismiss(alertIds),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      setSelectedIds(new Set())
      setSelectMode(false)
      toast.success(`${res.data.dismissed} alerts dismissed`)
    },
  })

  // Toggle selection for an alert
  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // Select/deselect all visible alerts
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAlerts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAlerts.map(a => a.id)))
    }
  }

  // Note: notesMutation available for future notes editing feature
  const _notesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      alertsApi.updateNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Notes updated')
    },
  })
  void _notesMutation // Suppress unused warning

  const alerts: Alert[] = alertsData?.content || []

  const filteredAlerts = alerts.filter(a => {
    // Status filter
    if (filter === 'active' && !(a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED')) return false
    if (filter === 'resolved' && !(a.status === 'RESOLVED' || a.status === 'DISMISSED')) return false

    // Assignment filter
    if (assignmentFilter === 'mine' && a.assignedTo !== currentUser) return false
    if (assignmentFilter === 'unassigned' && a.assignedTo !== null) return false

    return true
  })

  const myAlertsCount = alerts.filter(a => a.assignedTo === currentUser).length
  const unassignedCount = alerts.filter(a => a.assignedTo === null).length

  const activeCount = statsData?.active || alerts.filter(a => a.status === 'ACTIVE').length
  const acknowledgedCount = alerts.filter(a => a.status === 'ACKNOWLEDGED').length
  const resolvedCount = alerts.filter(a => a.status === 'RESOLVED').length
  const highCriticalCount = (statsData?.high || 0) + (statsData?.critical || 0)

  // Loading state
  if (isLoading) {
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
          <div className="skeleton h-10 w-28 rounded-lg" />
          <div className="skeleton h-10 w-36 rounded-lg" />
          <div className="skeleton h-10 w-28 rounded-lg" />
        </div>

        {/* Alerts skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <AlertCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Real-time connection status */}
      <div className="flex items-center justify-end gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span>{wsConnected ? 'Real-time updates active' : 'Connecting...'}</span>
      </div>

      {/* Active alert banner */}
      {activeCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-medium text-red-700 dark:text-red-400">
              {activeCount} active alert{activeCount > 1 ? 's' : ''} requiring attention
            </span>
          </div>
          <button
            onClick={() => setFilter('active')}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
          >
            View all
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Active</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{activeCount}</p>
            </div>
            <div className="p-2 sm:p-2.5 bg-red-100 rounded-lg">
              <Bell size={18} className="text-red-600" />
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Acknowledged</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{acknowledgedCount}</p>
            </div>
            <div className="p-2 sm:p-2.5 bg-amber-100 rounded-lg">
              <Eye size={18} className="text-amber-600" />
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Resolved</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{resolvedCount}</p>
            </div>
            <div className="p-2 sm:p-2.5 bg-green-100 rounded-lg">
              <CheckCircle size={18} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">High/Critical</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{highCriticalCount}</p>
            </div>
            <div className="p-2 sm:p-2.5 bg-purple-100 rounded-lg">
              <AlertTriangle size={18} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
          <button
            onClick={() => setFilter('all')}
            className={`btn btn-sm flex-shrink-0 ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`btn btn-sm flex-shrink-0 ${filter === 'active' ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-secondary'}`}
          >
            <Bell size={14} />
            <span className="hidden sm:inline">Requires Action</span>
            <span className="sm:hidden">Active</span>
            <span>({activeCount + acknowledgedCount})</span>
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`btn btn-sm flex-shrink-0 ${filter === 'resolved' ? 'bg-green-600 text-white hover:bg-green-700' : 'btn-secondary'}`}
          >
            <CheckCircle size={14} />
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Assignment filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:ml-auto">
          <button
            onClick={() => setAssignmentFilter('all')}
            className={`btn btn-sm flex-shrink-0 ${assignmentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Assignments
          </button>
          <button
            onClick={() => setAssignmentFilter('mine')}
            className={`btn btn-sm flex-shrink-0 ${assignmentFilter === 'mine' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'btn-secondary'}`}
          >
            <User size={14} />
            Mine ({myAlertsCount})
          </button>
          <button
            onClick={() => setAssignmentFilter('unassigned')}
            className={`btn btn-sm flex-shrink-0 ${assignmentFilter === 'unassigned' ? 'bg-gray-600 text-white hover:bg-gray-700' : 'btn-secondary'}`}
          >
            <UserPlus size={14} />
            Unassigned ({unassignedCount})
          </button>

          {/* Select mode toggle */}
          <div className="border-l border-gray-300 dark:border-slate-600 h-6 mx-1" />
          <button
            onClick={() => {
              setSelectMode(!selectMode)
              if (selectMode) setSelectedIds(new Set())
            }}
            className={`btn btn-sm flex-shrink-0 ${selectMode ? 'bg-primary-600 text-white hover:bg-primary-700' : 'btn-secondary'}`}
          >
            <CheckSquare size={14} />
            <span className="hidden sm:inline">{selectMode ? 'Cancel' : 'Select'}</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectMode && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {selectedIds.size === filteredAlerts.length ? (
                <CheckSquare size={18} className="text-primary-600" />
              ) : selectedIds.size > 0 ? (
                <MinusSquare size={18} className="text-primary-600" />
              ) : (
                <Square size={18} />
              )}
              <span>
                {selectedIds.size === 0
                  ? 'Select all'
                  : `${selectedIds.size} of ${filteredAlerts.length} selected`}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => bulkAcknowledgeMutation.mutate(Array.from(selectedIds))}
                  disabled={bulkAcknowledgeMutation.isPending}
                  className="btn btn-sm bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  <Eye size={14} />
                  <span className="hidden sm:inline">Acknowledge</span>
                </button>
                <button
                  onClick={() => bulkResolveMutation.mutate(Array.from(selectedIds))}
                  disabled={bulkResolveMutation.isPending}
                  className="btn btn-sm bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                >
                  <Check size={14} />
                  <span className="hidden sm:inline">Resolve</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Dismiss ${selectedIds.size} selected alert(s)?`)) {
                      bulkDismissMutation.mutate(Array.from(selectedIds))
                    }
                  }}
                  disabled={bulkDismissMutation.isPending}
                  className="btn btn-sm bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50"
                >
                  <X size={14} />
                  <span className="hidden sm:inline">Dismiss</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <div className="space-y-4">
          {filteredAlerts.map(alert => {
            const isActive = alert.status === 'ACTIVE'
            const isAcknowledged = alert.status === 'ACKNOWLEDGED'

            const isSelected = selectedIds.has(alert.id)

            return (
              <div
                key={alert.id}
                onClick={() => {
                  if (selectMode) {
                    toggleSelection(alert.id)
                  } else {
                    setSelectedAlert(alert)
                  }
                }}
                className={`card p-4 sm:p-5 cursor-pointer transition-all hover:shadow-md ${
                  isActive ? 'border-red-300 bg-red-50/30' : ''
                } ${selectedAlert?.id === alert.id ? 'ring-2 ring-primary-500' : ''} ${
                  isSelected ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Checkbox for select mode */}
                    {selectMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelection(alert.id)
                        }}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare size={20} className="text-primary-600" />
                        ) : (
                          <Square size={20} className="text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    )}
                    <AlertTypeIcon type={alert.alertType} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{alert.title}</h3>
                        <SeverityBadge severity={alert.severity} />
                        <StatusBadge status={alert.status} />
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{alert.description}</p>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-600 flex-wrap">
                        {alert.narrativeName && (
                          <span className="flex items-center gap-1">
                            <MessageSquare size={10} />
                            <span className="truncate max-w-[120px]">{alert.narrativeName}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(alert.triggeredAt)}
                        </span>
                        {alert.metadata?.articles_count != null && (
                          <span className="flex items-center gap-1">
                            <FileText size={10} />
                            {alert.metadata.articles_count as number} articles
                          </span>
                        )}
                        {alert.assignedTo && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <User size={10} />
                            {teamMembers.find(m => m.email === alert.assignedTo)?.name || alert.assignedTo}
                          </span>
                        )}
                        {alert.priority > 0 && (
                          <span className={`font-medium ${PRIORITY_OPTIONS.find(p => p.value === alert.priority)?.color}`}>
                            {PRIORITY_OPTIONS.find(p => p.value === alert.priority)?.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-shrink-0 ml-11 sm:ml-0">
                    {/* Assign dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setAssigningAlertId(assigningAlertId === alert.id ? null : alert.id)
                        }}
                        className={`btn btn-sm ${alert.assignedTo ? 'btn-secondary' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                        title="Assign"
                      >
                        <UserPlus size={14} />
                        <ChevronDown size={12} />
                      </button>
                      {assigningAlertId === alert.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-2 border-b">
                            <p className="text-xs font-medium text-gray-500 uppercase">Assign to</p>
                          </div>
                          <div className="py-1">
                            {teamMembers.map(member => (
                              <button
                                key={member.id}
                                onClick={() => assignMutation.mutate({ id: alert.id, assignedTo: member.email })}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                  alert.assignedTo === member.email ? 'bg-blue-50 text-blue-700' : ''
                                }`}
                              >
                                <User size={14} />
                                {member.name}
                                {alert.assignedTo === member.email && <Check size={14} className="ml-auto" />}
                              </button>
                            ))}
                          </div>
                          <div className="p-2 border-t">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Priority</p>
                            <div className="flex gap-1">
                              {PRIORITY_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    if (alert.assignedTo) {
                                      assignMutation.mutate({ id: alert.id, assignedTo: alert.assignedTo, priority: opt.value })
                                    }
                                  }}
                                  disabled={!alert.assignedTo}
                                  className={`flex-1 px-2 py-1 text-xs rounded ${
                                    alert.priority === opt.value
                                      ? 'bg-blue-100 text-blue-700 font-medium'
                                      : 'bg-gray-100 hover:bg-gray-200'
                                  } ${!alert.assignedTo ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          {alert.assignedTo && (
                            <div className="p-2 border-t">
                              <button
                                onClick={() => assignMutation.mutate({ id: alert.id, assignedTo: '' })}
                                className="w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                              >
                                Unassign
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Investigate button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAlert(alert)
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Investigate"
                    >
                      <Search size={14} />
                      <span className="hidden sm:inline">Investigate</span>
                    </button>

                    {isActive && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            acknowledgeMutation.mutate(alert.id)
                          }}
                          disabled={acknowledgeMutation.isPending}
                          className="btn bg-amber-500 text-white hover:bg-amber-600 btn-sm"
                          title="Acknowledge"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            resolveMutation.mutate(alert.id)
                          }}
                          disabled={resolveMutation.isPending}
                          className="btn bg-green-600 text-white hover:bg-green-700 btn-sm"
                          title="Resolve"
                        >
                          <Check size={14} />
                        </button>
                      </>
                    )}

                    {isAcknowledged && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          resolveMutation.mutate(alert.id)
                        }}
                        disabled={resolveMutation.isPending}
                        className="btn bg-green-600 text-white hover:bg-green-700 btn-sm"
                      >
                        <Check size={14} />
                        <span className="hidden sm:inline">Resolve</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state py-16 card">
          {filter !== 'all' ? (
            <>
              <Bell className="empty-state-icon" />
              <p className="empty-state-title">No matching alerts</p>
              <p className="empty-state-description">Try adjusting your filters to see more results</p>
              <button onClick={() => setFilter('all')} className="btn btn-secondary mt-4">
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell size={32} className="text-green-600" />
              </div>
              <p className="empty-state-title">All clear!</p>
              <p className="empty-state-description max-w-md">
                No active alerts at this time. Alerts are automatically triggered when narratives show unusual spikes,
                reach threat thresholds, or require attention.
              </p>
              <Link to="/narratives" className="btn btn-primary mt-4">
                View Narratives
              </Link>
            </>
          )}
        </div>
      )}

      {/* Investigation Panel */}
      {selectedAlert && (
        <InvestigationPanel
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onStatusChange={() => setSelectedAlert(null)}
        />
      )}
    </div>
  )
}
