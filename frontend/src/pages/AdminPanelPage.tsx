import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '../services/api'
import type { Organization, TeamMember, UserRole } from '../types'
import {
  Building2,
  Users,
  Plus,
  Edit2,
  Trash2,
  Power,
  X,
  Crown,
  Shield,
  Eye,
  BarChart3,
  UserPlus,
} from 'lucide-react'

type TabType = 'organizations' | 'users'

function RoleBadge({ role }: { role: UserRole }) {
  const config: Record<UserRole, { className: string; icon: React.ReactNode; label: string }> = {
    SUPER_ADMIN: { className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <Crown size={12} />, label: 'Super Admin' },
    ORG_ADMIN: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Shield size={12} />, label: 'Org Admin' },
    ANALYST: { className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <BarChart3 size={12} />, label: 'Analyst' },
    VIEWER: { className: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400', icon: <Eye size={12} />, label: 'Viewer' },
  }
  const c = config[role] || config.VIEWER
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.className}`}>
      {c.icon} {c.label}
    </span>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400',
    STANDARD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ENTERPRISE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[tier] || colors.FREE}`}>
      {tier}
    </span>
  )
}

function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      active
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
      {label || (active ? 'Active' : 'Inactive')}
    </span>
  )
}

export default function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState<TabType>('organizations')
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null)
  const queryClient = useQueryClient()

  // Fetch data
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: () => adminApi.getOrganizations().then(r => r.data),
  })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.getAllUsers().then(r => r.data),
  })

  // Organization mutations
  const createOrgMutation = useMutation({
    mutationFn: adminApi.createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
      setShowOrgModal(false)
      toast.success('Organization created')
    },
  })

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof adminApi.updateOrganization>[1] }) =>
      adminApi.updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
      setShowOrgModal(false)
      setEditingOrg(null)
      toast.success('Organization updated')
    },
  })

  const toggleOrgMutation = useMutation({
    mutationFn: adminApi.toggleOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
      toast.success('Organization status updated')
    },
  })

  const deleteOrgMutation = useMutation({
    mutationFn: adminApi.deleteOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
      toast.success('Organization deleted')
    },
    onError: () => {
      toast.error('Cannot delete organization with active users')
    },
  })

  // User mutations
  const createUserMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
      setShowUserModal(false)
      toast.success('User created')
    },
  })

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: UserRole }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowUserModal(false)
      setEditingUser(null)
      toast.success('User role updated')
    },
  })

  const toggleUserMutation = useMutation({
    mutationFn: adminApi.toggleUserEnabled,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User status updated')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
      toast.success('User deleted')
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Manage organizations and users across the platform
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex gap-1 -mb-px">
          <button
            onClick={() => setActiveTab('organizations')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'organizations'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <Building2 size={18} />
            Organizations
            <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
              {organizations.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <Users size={18} />
            Users
            <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
              {users.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="card">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organizations</h2>
            <button
              onClick={() => { setEditingOrg(null); setShowOrgModal(true) }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Add Organization
            </button>
          </div>

          {orgsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-3">Loading organizations...</p>
            </div>
          ) : organizations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="text-gray-400" size={28} />
              </div>
              <p className="text-gray-900 dark:text-white font-medium mb-1">No organizations yet</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Create your first organization to get started
              </p>
              <button onClick={() => setShowOrgModal(true)} className="btn btn-primary">
                <Plus size={16} /> Create Organization
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <th className="px-5 py-3 font-medium">Organization</th>
                    <th className="px-5 py-3 font-medium">Tier</th>
                    <th className="px-5 py-3 font-medium">Users</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {organizations.map(org => (
                    <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <Building2 className="text-primary-600 dark:text-primary-400" size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{org.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{org.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><TierBadge tier={org.tier} /></td>
                      <td className="px-5 py-4">
                        <div className="text-gray-900 dark:text-white font-medium">
                          {org.currentUsers} / {org.maxUsers}
                        </div>
                        <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-primary-500 h-full rounded-full"
                            style={{ width: `${(org.currentUsers / org.maxUsers) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge active={org.active} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => { setEditingOrg(org); setShowOrgModal(true) }}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => toggleOrgMutation.mutate(org.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              org.active
                                ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                            title={org.active ? 'Deactivate' : 'Activate'}
                          >
                            <Power size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this organization?')) deleteOrgMutation.mutate(org.id)
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Users</h2>
            <button
              onClick={() => { setEditingUser(null); setShowUserModal(true) }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Add User
            </button>
          </div>

          {usersLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-3">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="text-gray-400" size={28} />
              </div>
              <p className="text-gray-900 dark:text-white font-medium mb-1">No users yet</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Create users and assign them to organizations
              </p>
              <button onClick={() => setShowUserModal(true)} className="btn btn-primary">
                <Plus size={16} /> Create User
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Organization</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <span className="text-primary-700 dark:text-primary-400 font-semibold text-sm">
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.name || 'No name'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {user.organizationName || (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-5 py-4">
                        <StatusBadge active={user.enabled} label={user.enabled ? 'Enabled' : 'Disabled'} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => { setEditingUser(user); setShowUserModal(true) }}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Edit Role"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => toggleUserMutation.mutate(user.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.enabled
                                ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                            title={user.enabled ? 'Disable' : 'Enable'}
                          >
                            <Power size={16} />
                          </button>
                          {user.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => {
                                if (confirm('Delete this user?')) deleteUserMutation.mutate(user.id)
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
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
      )}

      {/* Organization Modal */}
      {showOrgModal && (
        <OrgModal
          org={editingOrg}
          onClose={() => { setShowOrgModal(false); setEditingOrg(null) }}
          onSave={(data) => {
            if (editingOrg) {
              updateOrgMutation.mutate({ id: editingOrg.id, data })
            } else {
              createOrgMutation.mutate(data)
            }
          }}
          isLoading={createOrgMutation.isPending || updateOrgMutation.isPending}
        />
      )}

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          organizations={organizations}
          onClose={() => { setShowUserModal(false); setEditingUser(null) }}
          onSave={(data) => {
            if (editingUser) {
              updateUserRoleMutation.mutate({ id: editingUser.id, role: data.role })
            } else {
              createUserMutation.mutate(data as Parameters<typeof adminApi.createUser>[0])
            }
          }}
          isLoading={createUserMutation.isPending || updateUserRoleMutation.isPending}
        />
      )}
    </div>
  )
}

// Organization Modal
function OrgModal({
  org,
  onClose,
  onSave,
  isLoading,
}: {
  org: Organization | null
  onClose: () => void
  onSave: (data: { name: string; slug: string; description?: string; tier?: string }) => void
  isLoading: boolean
}) {
  const [name, setName] = useState(org?.name || '')
  const [slug, setSlug] = useState(org?.slug || '')
  const [description, setDescription] = useState(org?.description || '')
  const [tier, setTier] = useState(org?.tier || 'FREE')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, slug, description, tier })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-fade-in">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {org ? 'Edit Organization' : 'New Organization'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              placeholder="Organization name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              pattern="^[a-z0-9-]+$"
              placeholder="organization-slug"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
              placeholder="Brief description (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as 'FREE' | 'STANDARD' | 'ENTERPRISE')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="FREE">Free (3 users)</option>
              <option value="STANDARD">Standard (10 users)</option>
              <option value="ENTERPRISE">Enterprise (1000 users)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={isLoading}>
              {isLoading ? 'Saving...' : org ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// User Modal
function UserModal({
  user,
  organizations,
  onClose,
  onSave,
  isLoading,
}: {
  user: TeamMember | null
  organizations: Organization[]
  onClose: () => void
  onSave: (data: { email: string; password: string; name: string; role: UserRole; organizationId: number }) => void
  isLoading: boolean
}) {
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [name, setName] = useState(user?.name || '')
  const [role, setRole] = useState<UserRole>(user?.role || 'ANALYST')
  const [organizationId, setOrganizationId] = useState(user?.organizationId || organizations[0]?.id || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ email, password, name, role, organizationId })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-fade-in">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {user ? 'Edit User Role' : 'New User'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!user && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  placeholder="user@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Organization</label>
                <select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.currentUsers}/{org.maxUsers} users)
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ORG_ADMIN">Organization Admin</option>
              <option value="ANALYST">Analyst</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>

          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={isLoading}>
              {isLoading ? 'Saving...' : user ? 'Update Role' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
