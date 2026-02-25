import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { teamApi } from '../services/api'
import type { UserRole } from '../types'
import {
  Users,
  Plus,
  Trash2,
  X,
  Shield,
  BarChart3,
  Eye,
  UserPlus,
  AlertCircle,
  Crown,
} from 'lucide-react'

function RoleBadge({ role }: { role: UserRole }) {
  const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
    SUPER_ADMIN: { className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <Crown size={12} />, label: 'Super Admin' },
    ORG_ADMIN: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Shield size={12} />, label: 'Admin' },
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

export default function TeamSettingsPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => teamApi.getMembers().then(r => r.data),
  })

  const { data: slotsData } = useQuery({
    queryKey: ['team-slots'],
    queryFn: () => teamApi.getRemainingSlots().then(r => r.data),
  })

  const addMemberMutation = useMutation({
    mutationFn: teamApi.addMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      queryClient.invalidateQueries({ queryKey: ['team-slots'] })
      setShowAddModal(false)
      toast.success('Team member added')
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => teamApi.updateMemberRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      toast.success('Role updated')
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: teamApi.removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      queryClient.invalidateQueries({ queryKey: ['team-slots'] })
      toast.success('Team member removed')
    },
  })

  const remainingSlots = slotsData?.remaining ?? 0
  const totalSlots = members.length + remainingSlots

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Manage your organization's team members and permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={remainingSlots === 0}
          className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Slots indicator */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Users className="text-primary-600 dark:text-primary-400" size={22} />
            </div>
            <div>
              <p className="text-gray-900 dark:text-white font-semibold">Team Capacity</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {members.length} of {totalSlots} seats used
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {remainingSlots > 0 ? (
              <span className="text-green-600 dark:text-green-400 text-sm font-medium bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                {remainingSlots} seat{remainingSlots !== 1 ? 's' : ''} available
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm font-medium bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">
                <AlertCircle size={14} /> No seats available
              </span>
            )}
          </div>
        </div>
        <div className="bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-primary-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${totalSlots > 0 ? (members.length / totalSlots) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Team members list */}
      <div className="card">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-3">Loading team members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="text-gray-400" size={28} />
            </div>
            <p className="text-gray-900 dark:text-white font-medium mb-1">No team members yet</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Add members to start collaborating
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={16} /> Add First Member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {members.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="text-primary-700 dark:text-primary-400 font-semibold text-sm">
                            {(member.name || member.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.name || 'No name'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {member.role === 'ORG_ADMIN' || member.role === 'SUPER_ADMIN' ? (
                        <RoleBadge role={member.role} />
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => updateRoleMutation.mutate({ id: member.id, role: e.target.value })}
                          className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="ANALYST">Analyst</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-sm">
                      {new Date(member.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 justify-end">
                        {member.role !== 'ORG_ADMIN' && member.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${member.name || member.email} from the team?`)) {
                                removeMemberMutation.mutate(member.id)
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Remove member"
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

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSave={(data) => addMemberMutation.mutate(data)}
          isLoading={addMemberMutation.isPending}
        />
      )}
    </div>
  )
}

function AddMemberModal({
  onClose,
  onSave,
  isLoading,
}: {
  onClose: () => void
  onSave: (data: { email: string; password: string; name: string; role: string }) => void
  isLoading: boolean
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('ANALYST')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ email, password, name, role })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-fade-in">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Team Member</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address
            </label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Password
            </label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Full Name
            </label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ANALYST">Analyst - Full feature access</option>
              <option value="VIEWER">Viewer - Read-only access</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Analysts can create narratives and manage alerts. Viewers have read-only access.
            </p>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">&#9696;</span>
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Add Member
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
