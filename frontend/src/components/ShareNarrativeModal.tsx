import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { teamApi, narrativesApi } from '../services/api'
import type { SharedUser } from '../types'
import { X, Share2, UserPlus, Trash2, Check, Edit2 } from 'lucide-react'

interface ShareNarrativeModalProps {
  narrativeId: number
  narrativeName: string
  sharedWith?: SharedUser[]
  onClose: () => void
  onShareUpdate: () => void
}

export default function ShareNarrativeModal({
  narrativeId,
  narrativeName,
  sharedWith = [],
  onClose,
  onShareUpdate,
}: ShareNarrativeModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const queryClient = useQueryClient()

  const { data: teamMembers = [], isLoading: isLoadingTeam } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => teamApi.getMembers().then((r) => r.data),
  })

  const shareMutation = useMutation({
    mutationFn: (data: { userIds: number[]; canEdit: boolean }) =>
      narrativesApi.share(narrativeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narratives'] })
      onShareUpdate()
      toast.success('Narrative shared successfully')
      setSelectedUsers([])
    },
    onError: () => {
      toast.error('Failed to share narrative')
    },
  })

  const unshareMutation = useMutation({
    mutationFn: (userId: number) => narrativesApi.unshare(narrativeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narratives'] })
      onShareUpdate()
      toast.success('Access removed')
    },
    onError: () => {
      toast.error('Failed to remove access')
    },
  })

  // Filter out already shared users and self from available list
  const sharedUserIds = new Set(sharedWith.map((s) => s.userId))
  const availableUsers = teamMembers.filter(
    (member) => !sharedUserIds.has(member.id)
  )

  const toggleUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleShare = () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one team member')
      return
    }
    shareMutation.mutate({ userIds: selectedUsers, canEdit })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Share2 className="text-primary-600 dark:text-primary-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Share Narrative
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[280px]">
                {narrativeName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Currently shared with */}
          {sharedWith.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Currently shared with
              </h4>
              <div className="space-y-2">
                {sharedWith.map((share) => (
                  <div
                    key={share.userId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                          {share.userName?.[0]?.toUpperCase() || share.userEmail[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {share.userName || share.userEmail}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {share.userEmail}
                          </span>
                          {share.canEdit && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <Edit2 size={10} /> Can edit
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => unshareMutation.mutate(share.userId)}
                      disabled={unshareMutation.isPending}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove access"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add team members */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Share with team members
            </h4>

            {isLoadingTeam ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
              </div>
            ) : availableUsers.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {teamMembers.length === 0
                  ? 'No team members available'
                  : 'Already shared with all team members'}
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableUsers.map((member) => (
                  <label
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUsers.includes(member.id)
                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                        : 'bg-gray-50 dark:bg-slate-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(member.id)}
                      onChange={() => toggleUser(member.id)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedUsers.includes(member.id)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-gray-300 dark:border-slate-500'
                      }`}
                    >
                      {selectedUsers.includes(member.id) && (
                        <Check size={14} className="text-white" />
                      )}
                    </div>
                    <div className="w-8 h-8 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.name || member.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {member.email}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Can edit toggle */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Allow editing
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Selected users can modify this narrative
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCanEdit(!canEdit)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  canEdit ? 'bg-primary-500' : 'bg-gray-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    canEdit ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={selectedUsers.length === 0 || shareMutation.isPending}
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {shareMutation.isPending ? (
              <>
                <span className="animate-spin mr-2">&#9696;</span>
                Sharing...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Share with {selectedUsers.length > 0 ? selectedUsers.length : ''} member
                {selectedUsers.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
