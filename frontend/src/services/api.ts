import axios from 'axios'
import { useAuthStore } from '../contexts/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
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

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; expiresIn: number }>('/auth/login', { email, password }),
  register: (email: string, password: string, name?: string) =>
    api.post<{ token: string; expiresIn: number }>('/auth/register', { email, password, name }),
}

// Articles endpoints
export const articlesApi = {
  getAll: (params?: {
    sourceId?: number
    sentiment?: string
    from?: string
    to?: string
    page?: number
    size?: number
  }) => api.get('/articles', { params }),
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
  getAll: (params?: { language?: string; active?: boolean }) =>
    api.get('/sources', { params }),
  getById: (id: number) => api.get(`/sources/${id}`),
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

export default api
