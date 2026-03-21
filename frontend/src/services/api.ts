import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../contexts/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  // Serialize arrays without brackets for Spring Boot compatibility
  // e.g., sourceIds=1&sourceIds=2 instead of sourceIds[]=1&sourceIds[]=2
  paramsSerializer: {
    indexes: null, // No indexes: sourceIds=1&sourceIds=2 (not sourceIds[0]=1)
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string; code?: string }>) => {
    const errorCode = error.response?.data?.code
    const isSessionExpired = errorCode === 'SESSION_EXPIRED'

    // Handle 401 - unauthorized (including session expiry)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      if (isSessionExpired) {
        toast.error('Your session has expired. Please log in again.')
      }
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Handle 403 - check if it might be a token issue
    // Sometimes 403 can occur if the token is malformed or org context is missing
    if (error.response?.status === 403) {
      const token = useAuthStore.getState().token
      if (token) {
        // Check if token might be expired by decoding it (without verification)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const expiry = payload.exp * 1000 // Convert to milliseconds
          if (Date.now() >= expiry) {
            // Token is expired, treat as session expiry
            useAuthStore.getState().logout()
            toast.error('Your session has expired. Please log in again.')
            window.location.href = '/login'
            return Promise.reject(error)
          }
        } catch {
          // If we can't decode the token, it might be invalid
          useAuthStore.getState().logout()
          toast.error('Session invalid. Please log in again.')
          window.location.href = '/login'
          return Promise.reject(error)
        }
      }
      // If we get here, it's a genuine permission issue
      toast.error('Access denied. You do not have permission.')
      return Promise.reject(error)
    }

    // Get error message
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred'

    // Show toast for different error types
    if (error.response?.status === 404) {
      toast.error('Resource not found.')
    } else if (error.response?.status === 422 || error.response?.status === 400) {
      toast.error(message)
    } else if (error.response?.status && error.response.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.code === 'ERR_NETWORK') {
      toast.error('Network error. Please check your connection.')
    } else {
      // Don't show toast for every error - let components handle specific cases
      // Only show for unexpected errors
      if (error.response?.status && error.response.status >= 400) {
        toast.error(message)
      }
    }

    return Promise.reject(error)
  }
)

// Auth response type
interface AuthResponse {
  token: string
  expiresIn: number
  role?: string
  email?: string
  name?: string
  organizationId?: number
  organizationName?: string
  organizationSlug?: string
}

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
}

// Article filter params
export interface ArticleFilterParams {
  sourceId?: number
  sourceIds?: number[]
  topicId?: number
  narrativeId?: number
  sentiment?: string
  language?: string
  sourceType?: string
  from?: string
  to?: string
  q?: string
  searchContent?: boolean
  page?: number
  size?: number
}

// Articles endpoints
export const articlesApi = {
  getAll: (params?: ArticleFilterParams) => api.get('/articles', { params }),
  getById: (id: number) => api.get(`/articles/${id}`),
}

// Sentiment endpoints
export const sentimentApi = {
  getAggregate: (params: { groupBy: string; from: string; to: string }) =>
    api.get('/sentiment/aggregate', { params }),
  getSummary: (params: { from: string; to: string }) =>
    api.get('/sentiment/summary', { params }),
}

// Sources endpoints
export const sourcesApi = {
  getAll: (params?: { type?: string; language?: string; active?: boolean }) =>
    api.get('/sources', { params }),
  getById: (id: number) => api.get(`/sources/${id}`),
  create: (data: {
    name: string
    url: string
    type: string
    language: string
    active?: boolean
    config?: Record<string, unknown>
  }) => api.post('/sources', data),
  update: (id: number, data: {
    name: string
    url: string
    type: string
    language: string
    active?: boolean
    config?: Record<string, unknown>
  }) => api.put(`/sources/${id}`, data),
  toggleActive: (id: number) => api.patch(`/sources/${id}/toggle`),
  delete: (id: number) => api.delete(`/sources/${id}`),
  getStats: () => api.get('/sources/stats'),
  getTypes: () => api.get('/sources/types'),
  getLanguages: () => api.get('/sources/languages'),
}

// Topics endpoints
export const topicsApi = {
  getAll: () => api.get('/topics'),
  create: (data: {
    name: string
    keywords: string[]
    sourceIds?: number[]
    globalSearch?: boolean
    language?: string
  }) => api.post('/topics', data),
  update: (id: number, data: {
    name: string
    keywords: string[]
    sourceIds?: number[]
    globalSearch?: boolean
    language?: string
  }) => api.put(`/topics/${id}`, data),
  delete: (id: number) => api.delete(`/topics/${id}`),
}

// Import SharedUser type
import type { SharedUser } from '../types'

// Narratives endpoints
export const narrativesApi = {
  getAll: (params?: { status?: string; threatLevel?: string; filter?: 'all' | 'mine' | 'shared'; fromDate?: string; toDate?: string }) =>
    api.get('/narratives', { params }),
  getById: (id: number) => api.get(`/narratives/${id}`),
  getArticles: (id: number, params?: { page?: number; size?: number }) =>
    api.get(`/narratives/${id}/articles`, { params }),
  create: (data: {
    name: string
    description?: string
    keywords: string[]
    threatLevel?: string
  }) => api.post('/narratives', data),
  update: (id: number, data: {
    name?: string
    description?: string
    keywords?: string[]
    status?: string
    threatLevel?: string
  }) => api.put(`/narratives/${id}`, data),
  delete: (id: number) => api.delete(`/narratives/${id}`),
  // Pending review workflow
  getPendingCount: () => api.get<{ count: number }>('/narratives/pending-count'),
  getPending: (params?: { page?: number; size?: number }) =>
    api.get('/narratives/pending', { params }),
  approve: (id: number, title?: string) => api.patch(`/narratives/${id}/approve`, title ? { title } : {}),
  // Fact-checks
  getFactChecks: (narrativeId: number) =>
    api.get(`/narratives/${narrativeId}/fact-checks`),
  addFactCheck: (narrativeId: number, data: {
    title: string
    url: string
    publisher?: string
    verdict?: string
    publishedAt?: string
    notes?: string
  }) => api.post(`/narratives/${narrativeId}/fact-checks`, data),
  deleteFactCheck: (id: number) => api.delete(`/fact-checks/${id}`),
  // Sharing
  share: (id: number, data: { userIds: number[]; canEdit: boolean }) =>
    api.post(`/narratives/${id}/share`, data),
  unshare: (id: number, userId: number) =>
    api.delete(`/narratives/${id}/share/${userId}`),
  getShares: (id: number) =>
    api.get<SharedUser[]>(`/narratives/${id}/shares`),
}

// Bulk operation response type
interface BulkOperationResponse {
  success: boolean
  acknowledged?: number
  resolved?: number
  dismissed?: number
  requested: number
}

// Alerts endpoints
export const alertsApi = {
  getAll: (params?: { status?: string; severity?: string; narrativeId?: number }) =>
    api.get('/alerts', { params }),
  getActive: () => api.get('/alerts/active'),
  getUrgent: () => api.get('/alerts/urgent'),
  getRecent: (hours?: number) => api.get('/alerts/recent', { params: { hours } }),
  getById: (id: number) => api.get(`/alerts/${id}`),
  acknowledge: (id: number) => api.post(`/alerts/${id}/acknowledge`),
  resolve: (id: number) => api.post(`/alerts/${id}/resolve`),
  dismiss: (id: number) => api.post(`/alerts/${id}/dismiss`),
  getStats: () => api.get('/alerts/stats'),
  // Assignment endpoints
  assign: (id: number, assignedTo: string, priority?: number) =>
    api.patch(`/alerts/${id}/assign`, null, { params: { assignedTo, priority } }),
  updateNotes: (id: number, notes: string) =>
    api.patch(`/alerts/${id}/notes`, { notes }),
  getByAssignee: (assignedTo: string) => api.get(`/alerts/assigned/${assignedTo}`),
  getUnassigned: () => api.get('/alerts/unassigned'),
  // Bulk operations
  bulkAcknowledge: (alertIds: number[]) =>
    api.post<BulkOperationResponse>('/alerts/bulk/acknowledge', { alertIds }),
  bulkResolve: (alertIds: number[]) =>
    api.post<BulkOperationResponse>('/alerts/bulk/resolve', { alertIds }),
  bulkDismiss: (alertIds: number[]) =>
    api.post<BulkOperationResponse>('/alerts/bulk/dismiss', { alertIds }),
}

// Dashboard endpoints
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
}

// Reports endpoints
export const reportsApi = {
  getTypes: () => api.get('/reports/types'),
  getWeekly: () => api.get('/reports/weekly'),
  getDaily: () => api.get('/reports/daily'),
  getIncident: (narrativeId: number) => api.get(`/reports/incident/${narrativeId}`),
  exportWeeklyCSV: () => api.get('/reports/weekly/csv', { responseType: 'blob' }),
  exportDailyCSV: () => api.get('/reports/daily/csv', { responseType: 'blob' }),
  exportWeeklyMarkdown: () => api.get('/reports/weekly/markdown', { responseType: 'blob' }),
  exportIncidentCSV: (narrativeId: number) => api.get(`/reports/incident/${narrativeId}/csv`, { responseType: 'blob' }),
  exportIncidentMarkdown: (narrativeId: number) => api.get(`/reports/incident/${narrativeId}/markdown`, { responseType: 'blob' }),
}

// Global search endpoint
export const searchApi = {
  search: (query: string) => api.get('/search', { params: { q: query } }),
}

// Notification preferences types
export interface NotificationPreferences {
  emailNotificationsEnabled: boolean
  reportFrequency: 'NONE' | 'DAILY' | 'WEEKLY'
  alertNotificationsEnabled: boolean
  alertSeverityThreshold: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface UserProfile {
  id: number
  email: string
  name: string | null
  role: string
  notificationPreferences: NotificationPreferences
}

// User endpoints
export const userApi = {
  getProfile: () => api.get<UserProfile>('/user/me'),
  getNotificationPreferences: () => api.get<NotificationPreferences>('/user/notifications'),
  updateNotificationPreferences: (data: NotificationPreferences) =>
    api.put<NotificationPreferences>('/user/notifications', data),
  sendTestReport: (type: 'DAILY' | 'WEEKLY') =>
    api.post('/user/notifications/test-report', null, { params: { type } }),
}

// Coordination events endpoints
export const coordinationEventsApi = {
  getAll: (params?: { page?: number; size?: number }) =>
    api.get('/coordination-events', { params }),
  getActive: () => api.get('/coordination-events/active'),
  getRecent: (days?: number) =>
    api.get('/coordination-events/recent', { params: { days } }),
  getById: (id: number) => api.get(`/coordination-events/${id}`),
  getByNarrative: (narrativeId: number) =>
    api.get(`/coordination-events/narrative/${narrativeId}`),
  markAsReviewed: (id: number, userId?: number) =>
    api.post(`/coordination-events/${id}/review`, null, { params: { userId } }),
  dismiss: (id: number, userId?: number) =>
    api.post(`/coordination-events/${id}/dismiss`, null, { params: { userId } }),
  getStats: () => api.get('/coordination-events/stats'),
}

// Alert rule types
export interface AlertRuleConditions {
  keywords?: string[]
  sentimentThreshold?: number
  volumeThreshold?: number
  volumeTimeframeHours?: number
  sourceIds?: number[]
  sourceTypes?: string[]
  matchAll?: boolean
}

export interface AlertRule {
  id: number
  name: string
  description: string | null
  enabled: boolean
  conditions: AlertRuleConditions
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  cooldownMinutes: number
  createdByEmail: string | null
  createdAt: string
  updatedAt: string
  lastTriggeredAt: string | null
  triggerCount: number
}

export interface AlertRuleRequest {
  name: string
  description?: string
  conditions: AlertRuleConditions
  severity?: string
  cooldownMinutes?: number
}

// Alert rules endpoints
export const alertRulesApi = {
  getAll: () => api.get<AlertRule[]>('/alert-rules'),
  getMine: () => api.get<AlertRule[]>('/alert-rules/mine'),
  getById: (id: number) => api.get<AlertRule>(`/alert-rules/${id}`),
  create: (data: AlertRuleRequest) => api.post<AlertRule>('/alert-rules', data),
  update: (id: number, data: AlertRuleRequest) => api.put<AlertRule>(`/alert-rules/${id}`, data),
  toggle: (id: number) => api.patch<AlertRule>(`/alert-rules/${id}/toggle`),
  delete: (id: number) => api.delete(`/alert-rules/${id}`),
  evaluate: () => api.post('/alert-rules/evaluate'),
}

// Import types for admin API
import type { Organization, TeamMember, DiscussionThread, DiscussionReply, ThreadDetail, UserRole, Mention, ThreadCreateRequest, Bookmark, Article, PageResponse } from '../types'

// Bookmarks endpoints
export const bookmarksApi = {
  getAll: (params?: { page?: number; size?: number }) =>
    api.get<PageResponse<Article>>('/bookmarks', { params }),
  add: (articleId: number) =>
    api.post<Bookmark>(`/bookmarks/articles/${articleId}`),
  remove: (articleId: number) =>
    api.delete(`/bookmarks/articles/${articleId}`),
  isBookmarked: (articleId: number) =>
    api.get<{ bookmarked: boolean }>(`/bookmarks/articles/${articleId}`),
  checkBatch: (articleIds: number[]) =>
    api.post<number[]>('/bookmarks/check', articleIds),
  getCount: () =>
    api.get<{ count: number }>('/bookmarks/count'),
}

// Super Admin API endpoints
export const adminApi = {
  // Organizations
  getOrganizations: () => api.get<Organization[]>('/admin/organizations'),
  getOrganization: (id: number) => api.get<Organization>(`/admin/organizations/${id}`),
  createOrganization: (data: { name: string; slug: string; description?: string; tier?: string }) =>
    api.post<Organization>('/admin/organizations', data),
  updateOrganization: (id: number, data: { name: string; slug: string; description?: string; tier?: string }) =>
    api.put<Organization>(`/admin/organizations/${id}`, data),
  toggleOrganization: (id: number) => api.patch<Organization>(`/admin/organizations/${id}/toggle`),
  deleteOrganization: (id: number) => api.delete(`/admin/organizations/${id}`),

  // Users (all platform users)
  getAllUsers: () => api.get<TeamMember[]>('/admin/users'),
  createUser: (data: { email: string; password: string; name: string; role: UserRole; organizationId: number }) =>
    api.post<TeamMember>('/admin/users', data),
  updateUserRole: (id: number, role: UserRole) =>
    api.put<TeamMember>(`/admin/users/${id}/role`, { role }),
  toggleUserEnabled: (id: number) => api.patch<TeamMember>(`/admin/users/${id}/toggle`),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
}

// Team API endpoints (for org admins managing their team)
export const teamApi = {
  getMembers: () => api.get<TeamMember[]>('/team/members'),
  getRemainingSlots: () => api.get<{ remaining: number }>('/team/slots'),
  addMember: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post<TeamMember>('/team/members', data),
  updateMemberRole: (id: number, role: string) =>
    api.put<TeamMember>(`/team/members/${id}/role`, { role }),
  removeMember: (id: number) => api.delete(`/team/members/${id}`),
}

// Discussion API endpoints
export const discussionApi = {
  getThreads: () => api.get<DiscussionThread[]>('/discussions/threads'),
  getThread: (id: number) => api.get<ThreadDetail>(`/discussions/threads/${id}`),
  createThread: (data: ThreadCreateRequest) =>
    api.post<DiscussionThread>('/discussions/threads', data),
  updateThread: (id: number, data: ThreadCreateRequest) =>
    api.put<DiscussionThread>(`/discussions/threads/${id}`, data),
  deleteThread: (id: number) => api.delete(`/discussions/threads/${id}`),
  pinThread: (id: number, pin: boolean) =>
    api.post<DiscussionThread>(`/discussions/threads/${id}/pin`, { pin }),
  addReply: (threadId: number, content: string) =>
    api.post<DiscussionReply>(`/discussions/threads/${threadId}/replies`, { content }),
  updateReply: (id: number, content: string) =>
    api.put<DiscussionReply>(`/discussions/replies/${id}`, { content }),
  deleteReply: (id: number) => api.delete(`/discussions/replies/${id}`),
  // Mentions
  getMentions: () => api.get<Mention[]>('/discussions/mentions'),
  getMentionCount: () => api.get<{ count: number }>('/discussions/mentions/count'),
  markMentionAsRead: (id: number) => api.post(`/discussions/mentions/${id}/read`),
  markAllMentionsAsRead: () => api.post('/discussions/mentions/read-all'),
}

export default api
