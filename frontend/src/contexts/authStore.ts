import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ANALYST' | 'VIEWER'

export interface Organization {
  id: number
  name: string
  slug: string
}

interface User {
  id?: number
  email: string
  name?: string
  role: UserRole
}

interface AuthState {
  token: string | null
  user: User | null
  organization: Organization | null
  isAuthenticated: boolean
  // Convenience getters
  role: UserRole | null
  userId: number | null
  login: (token: string, user: User, organization?: Organization) => void
  logout: () => void
  // Organization helpers
  getOrganizationId: () => number | null
  getOrganizationName: () => string | null
  // Permission helpers
  canViewContent: () => boolean
  canEditNarratives: () => boolean
  canManageAlerts: () => boolean
  canManageSources: () => boolean
  canGenerateReports: () => boolean
  canAccessAdmin: () => boolean
  canManageTeam: () => boolean
  isSuperAdmin: () => boolean
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (...roles: UserRole[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      organization: null,
      isAuthenticated: false,
      role: null,
      userId: null,
      login: (token: string, user: User, organization?: Organization) =>
        set({
          token,
          user,
          organization: organization || null,
          isAuthenticated: true,
          role: user.role,
          userId: user.id || null,
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          organization: null,
          isAuthenticated: false,
          role: null,
          userId: null,
        }),

      // Organization helpers
      getOrganizationId: () => get().organization?.id ?? null,
      getOrganizationName: () => get().organization?.name ?? null,

      // Permission helpers based on role hierarchy
      // SUPER_ADMIN > ORG_ADMIN > ANALYST > VIEWER

      canViewContent: () => {
        const { user } = get()
        return !!user // All authenticated users can view
      },

      canEditNarratives: () => {
        const { user } = get()
        return user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN' || user?.role === 'ANALYST'
      },

      canManageAlerts: () => {
        const { user } = get()
        return user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN' || user?.role === 'ANALYST'
      },

      canManageSources: () => {
        const { user } = get()
        return user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN'
      },

      canGenerateReports: () => {
        const { user } = get()
        return user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN' || user?.role === 'ANALYST'
      },

      canAccessAdmin: () => {
        const { user } = get()
        return user?.role === 'SUPER_ADMIN'
      },

      canManageTeam: () => {
        const { user } = get()
        return user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN'
      },

      isSuperAdmin: () => {
        const { user } = get()
        return user?.role === 'SUPER_ADMIN'
      },

      hasRole: (role: UserRole) => {
        const { user } = get()
        return user?.role === role
      },

      hasAnyRole: (...roles: UserRole[]) => {
        const { user } = get()
        return !!user && roles.includes(user.role)
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
