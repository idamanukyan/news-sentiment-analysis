import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../contexts/authStore'

// Helper to get persisted state from localStorage
const getPersistedState = () => {
  const stored = localStorage.getItem('auth-storage')
  if (!stored) return null
  return JSON.parse(stored)?.state
}

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    })
    localStorage.clear()
  })

  describe('login', () => {
    it('should set token and user on successful login', () => {
      const store = useAuthStore.getState()
      
      store.login('jwt-token', {
        email: 'admin@aiim.am',
        name: 'Admin',
        role: 'ORG_ADMIN',
      })

      const state = useAuthStore.getState()
      expect(state.token).toBe('jwt-token')
      expect(state.user?.email).toBe('admin@aiim.am')
      expect(state.isAuthenticated).toBe(true)
    })

    it('should persist token to localStorage', () => {
      const store = useAuthStore.getState()

      store.login('jwt-token', {
        email: 'admin@aiim.am',
        name: 'Admin',
        role: 'ORG_ADMIN',
      })

      const persisted = getPersistedState()
      expect(persisted?.token).toBe('jwt-token')
    })
  })

  describe('logout', () => {
    it('should clear token and user on logout', () => {
      const store = useAuthStore.getState()
      
      // First login
      store.login('jwt-token', {
        email: 'admin@aiim.am',
        name: 'Admin',
        role: 'ORG_ADMIN',
      })
      
      // Then logout
      store.logout()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it('should remove token from localStorage', () => {
      const store = useAuthStore.getState()

      store.login('jwt-token', {
        email: 'admin@aiim.am',
        name: 'Admin',
        role: 'ORG_ADMIN',
      })
      store.logout()

      const persisted = getPersistedState()
      expect(persisted?.token).toBeNull()
    })
  })

  describe('role-based permissions', () => {
    it('should allow ADMIN to edit narratives', () => {
      const store = useAuthStore.getState()
      store.login('token', { email: 'a@a.com', name: 'A', role: 'ORG_ADMIN' })

      const state = useAuthStore.getState()
      expect(state.canEditNarratives()).toBe(true)
    })

    it('should allow ANALYST to edit narratives', () => {
      const store = useAuthStore.getState()
      store.login('token', { email: 'a@a.com', name: 'A', role: 'ANALYST' })

      const state = useAuthStore.getState()
      expect(state.canEditNarratives()).toBe(true)
    })

    it('should NOT allow VIEWER to edit narratives', () => {
      const store = useAuthStore.getState()
      store.login('token', { email: 'a@a.com', name: 'A', role: 'VIEWER' })

      const state = useAuthStore.getState()
      expect(state.canEditNarratives()).toBe(false)
    })

    it('should only allow ORG_ADMIN and SUPER_ADMIN to manage sources', () => {
      const store = useAuthStore.getState()
      
      store.login('token', { email: 'a@a.com', name: 'A', role: 'ORG_ADMIN' })
      expect(useAuthStore.getState().canManageSources()).toBe(true)

      store.login('token', { email: 'a@a.com', name: 'A', role: 'ANALYST' })
      expect(useAuthStore.getState().canManageSources()).toBe(false)

      store.login('token', { email: 'a@a.com', name: 'A', role: 'VIEWER' })
      expect(useAuthStore.getState().canManageSources()).toBe(false)
    })
  })
})
