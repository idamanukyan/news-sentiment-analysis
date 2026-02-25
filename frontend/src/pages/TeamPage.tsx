import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { discussionApi, narrativesApi, alertsApi } from '../services/api'
import { useAuthStore } from '../contexts/authStore'
import type { DiscussionReply, DiscussionType, ThreadCreateRequest } from '../types'
import {
  MessageSquare,
  Plus,
  Pin,
  Trash2,
  X,
  ArrowLeft,
  Send,
  Clock,
  Edit2,
  AtSign,
  Link2,
  AlertTriangle,
  FileText,
  Bell,
} from 'lucide-react'

export default function TeamPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null)
  const [showNewThread, setShowNewThread] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const queryClient = useQueryClient()
  const { role } = useAuthStore()

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['discussion-threads'],
    queryFn: () => discussionApi.getThreads().then(r => r.data),
  })

  const { data: mentionCount = { count: 0 } } = useQuery({
    queryKey: ['mention-count'],
    queryFn: () => discussionApi.getMentionCount().then(r => r.data),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const createThreadMutation = useMutation({
    mutationFn: (data: ThreadCreateRequest) => discussionApi.createThread(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-threads'] })
      setShowNewThread(false)
      toast.success('Discussion created')
    },
  })

  const deleteThreadMutation = useMutation({
    mutationFn: discussionApi.deleteThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-threads'] })
      setSelectedThreadId(null)
      toast.success('Discussion deleted')
    },
  })

  const pinThreadMutation = useMutation({
    mutationFn: ({ id, pin }: { id: number; pin: boolean }) => discussionApi.pinThread(id, pin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-threads'] })
      toast.success('Thread updated')
    },
  })

  const canCreateThread = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' || role === 'ANALYST'
  const canPin = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN'

  if (selectedThreadId) {
    return (
      <ThreadDetail
        threadId={selectedThreadId}
        onBack={() => setSelectedThreadId(null)}
        onDelete={() => {
          if (confirm('Delete this discussion?')) {
            deleteThreadMutation.mutate(selectedThreadId)
          }
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Discussions</h1>
          <p className="text-text-secondary text-sm">Collaborate with your team</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMentions(true)}
            className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
            title="View mentions"
          >
            <Bell size={20} className="text-text-secondary" />
            {mentionCount.count > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {mentionCount.count > 9 ? '9+' : mentionCount.count}
              </span>
            )}
          </button>
          {canCreateThread && (
            <button onClick={() => setShowNewThread(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Discussion
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">Loading...</div>
      ) : threads.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="mx-auto text-text-secondary mb-4" size={48} />
          <h3 className="text-lg font-medium text-white mb-2">No discussions yet</h3>
          <p className="text-text-secondary mb-4">
            Start a conversation with your team
          </p>
          {canCreateThread && (
            <button onClick={() => setShowNewThread(true)} className="btn-primary">
              Create First Discussion
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(thread => (
            <div
              key={thread.id}
              className="card p-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setSelectedThreadId(thread.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {thread.pinned && (
                      <Pin size={14} className="text-accent flex-shrink-0" />
                    )}
                    <h3 className="font-medium text-white truncate">{thread.title}</h3>
                    <DiscussionTypeBadge type={thread.discussionType} />
                  </div>
                  {/* Linked narrative or alert */}
                  {(thread.narrativeName || thread.alertTitle) && (
                    <div className="flex items-center gap-1 text-xs text-accent mt-1">
                      <Link2 size={12} />
                      {thread.narrativeName && (
                        <span>Narrative: {thread.narrativeName}</span>
                      )}
                      {thread.alertTitle && (
                        <span>Alert: {thread.alertTitle}</span>
                      )}
                    </div>
                  )}
                  <p className="text-text-secondary text-sm mt-1 line-clamp-2">
                    {thread.content}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                    <span>{thread.author.name || thread.author.email}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(thread.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {canPin && (
                    <button
                      onClick={() => pinThreadMutation.mutate({ id: thread.id, pin: !thread.pinned })}
                      className={`p-2 rounded hover:bg-white/10 ${thread.pinned ? 'text-accent' : 'text-text-secondary'}`}
                      title={thread.pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Thread Modal */}
      {showNewThread && (
        <NewThreadModal
          onClose={() => setShowNewThread(false)}
          onSave={(data) => createThreadMutation.mutate(data)}
          isLoading={createThreadMutation.isPending}
        />
      )}

      {/* Mentions Modal */}
      {showMentions && (
        <MentionsModal
          onClose={() => setShowMentions(false)}
          onNavigateToThread={(threadId) => {
            setShowMentions(false)
            setSelectedThreadId(threadId)
          }}
        />
      )}
    </div>
  )
}

function ThreadDetail({
  threadId,
  onBack,
  onDelete,
}: {
  threadId: number
  onBack: () => void
  onDelete: () => void
}) {
  const [replyContent, setReplyContent] = useState('')
  const queryClient = useQueryClient()
  const { role, userId } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['discussion-thread', threadId],
    queryFn: () => discussionApi.getThread(threadId).then(r => r.data),
  })

  const addReplyMutation = useMutation({
    mutationFn: (content: string) => discussionApi.addReply(threadId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-thread', threadId] })
      queryClient.invalidateQueries({ queryKey: ['discussion-threads'] })
      setReplyContent('')
      toast.success('Reply added')
    },
  })

  const deleteReplyMutation = useMutation({
    mutationFn: discussionApi.deleteReply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-thread', threadId] })
      queryClient.invalidateQueries({ queryKey: ['discussion-threads'] })
      toast.success('Reply deleted')
    },
  })

  const updateReplyMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      discussionApi.updateReply(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-thread', threadId] })
      toast.success('Reply updated')
    },
  })

  const canReply = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' || role === 'ANALYST'
  const canDeleteThread = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' ||
    (data?.thread.author.id === userId)

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (replyContent.trim()) {
      addReplyMutation.mutate(replyContent.trim())
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-white">
          <ArrowLeft size={16} /> Back to discussions
        </button>
        <div className="text-center py-12 text-text-secondary">Loading...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-white">
          <ArrowLeft size={16} /> Back to discussions
        </button>
        <div className="text-center py-12 text-text-secondary">Discussion not found</div>
      </div>
    )
  }

  const { thread, replies } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-white">
          <ArrowLeft size={16} /> Back to discussions
        </button>
        {canDeleteThread && (
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 flex items-center gap-1">
            <Trash2 size={16} /> Delete
          </button>
        )}
      </div>

      {/* Thread content */}
      <div className="card p-6">
        <div className="flex items-start gap-2 mb-2 flex-wrap">
          {thread.pinned && <Pin size={16} className="text-accent mt-1" />}
          <h1 className="text-xl font-bold text-white">{thread.title}</h1>
          <DiscussionTypeBadge type={thread.discussionType} />
        </div>
        {/* Linked narrative or alert */}
        {(thread.narrativeName || thread.alertTitle) && (
          <div className="flex items-center gap-2 text-sm text-accent mb-3 bg-accent/10 px-3 py-2 rounded">
            <Link2 size={14} />
            {thread.narrativeName && (
              <span>Linked to Narrative: <strong>{thread.narrativeName}</strong></span>
            )}
            {thread.alertTitle && (
              <span>Linked to Alert: <strong>{thread.alertTitle}</strong></span>
            )}
          </div>
        )}
        <div className="text-text-secondary text-sm mb-4">
          {thread.author.name || thread.author.email} • {formatDate(thread.createdAt)}
        </div>
        <div className="text-white whitespace-pre-wrap">
          <MentionHighlightedContent content={thread.content} />
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">
          {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
        </h2>

        {replies.map(reply => (
          <ReplyCard
            key={reply.id}
            reply={reply}
            canEdit={reply.author.id === userId}
            canDelete={
              role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' || reply.author.id === userId
            }
            onEdit={(content) => updateReplyMutation.mutate({ id: reply.id, content })}
            onDelete={() => {
              if (confirm('Delete this reply?')) {
                deleteReplyMutation.mutate(reply.id)
              }
            }}
          />
        ))}

        {/* Reply form */}
        {canReply && (
          <form onSubmit={handleSubmitReply} className="card p-4">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="input w-full mb-3"
              rows={3}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!replyContent.trim() || addReplyMutation.isPending}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={16} />
                {addReplyMutation.isPending ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function ReplyCard({
  reply,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  reply: DiscussionReply
  canEdit: boolean
  canDelete: boolean
  onEdit: (content: string) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(reply.content)

  const handleSave = () => {
    if (editContent.trim() && editContent !== reply.content) {
      onEdit(editContent.trim())
    }
    setIsEditing(false)
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-text-secondary text-sm mb-2">
            {reply.author.name || reply.author.email} • {formatDate(reply.createdAt)}
            {reply.updatedAt && reply.updatedAt !== reply.createdAt && (
              <span className="text-text-secondary/60"> (edited)</span>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="input w-full"
                rows={3}
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="btn-primary text-sm py-1">
                  Save
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditContent(reply.content) }}
                  className="btn-secondary text-sm py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-white whitespace-pre-wrap">
              <MentionHighlightedContent content={reply.content} />
            </div>
          )}
        </div>
        {!isEditing && (canEdit || canDelete) && (
          <div className="flex gap-1">
            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-white/5 rounded text-text-secondary hover:text-accent"
                title="Edit"
              >
                <Edit2 size={14} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="p-2 hover:bg-white/5 rounded text-text-secondary hover:text-red-400"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NewThreadModal({
  onClose,
  onSave,
  isLoading,
}: {
  onClose: () => void
  onSave: (data: ThreadCreateRequest) => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [discussionType, setDiscussionType] = useState<DiscussionType>('GENERAL')
  const [narrativeId, setNarrativeId] = useState<number | undefined>()
  const [alertId, setAlertId] = useState<number | undefined>()

  const { data: narratives = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['narratives'],
    queryFn: () => narrativesApi.getAll({}).then(r => r.data),
    enabled: discussionType === 'NARRATIVE',
  })

  const { data: alerts = [] } = useQuery<{ id: number; title: string }[]>({
    queryKey: ['alerts-for-discussion'],
    queryFn: () => alertsApi.getAll({}).then(r => r.data),
    enabled: discussionType === 'ALERT',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      title,
      content,
      discussionType,
      narrativeId: discussionType === 'NARRATIVE' ? narrativeId : undefined,
      alertId: discussionType === 'ALERT' ? alertId : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card-bg rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">New Discussion</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Discussion Type</label>
            <div className="flex gap-2">
              {(['GENERAL', 'NARRATIVE', 'ALERT'] as DiscussionType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setDiscussionType(type)
                    setNarrativeId(undefined)
                    setAlertId(undefined)
                  }}
                  className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 ${
                    discussionType === type
                      ? 'bg-accent text-white'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  {type === 'GENERAL' && <MessageSquare size={14} />}
                  {type === 'NARRATIVE' && <FileText size={14} />}
                  {type === 'ALERT' && <AlertTriangle size={14} />}
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {discussionType === 'NARRATIVE' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Link to Narrative
              </label>
              <select
                value={narrativeId || ''}
                onChange={(e) => setNarrativeId(e.target.value ? Number(e.target.value) : undefined)}
                className="input w-full"
              >
                <option value="">Select a narrative...</option>
                {narratives.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
          )}

          {discussionType === 'ALERT' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Link to Alert
              </label>
              <select
                value={alertId || ''}
                onChange={(e) => setAlertId(e.target.value ? Number(e.target.value) : undefined)}
                className="input w-full"
              >
                <option value="">Select an alert...</option>
                {alerts.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              required
              placeholder="What would you like to discuss?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Content
              <span className="text-text-secondary/60 ml-2">(Use @username to mention team members)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input w-full"
              rows={6}
              required
              placeholder="Share your thoughts... Use @name to mention team members"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Discussion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Helper component to highlight @mentions
function MentionHighlightedContent({ content }: { content: string }) {
  const parts = content.split(/(@\w+(?:\.\w+)*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="text-accent font-medium bg-accent/10 px-1 rounded">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// Discussion type badge component
function DiscussionTypeBadge({ type }: { type: DiscussionType }) {
  if (type === 'GENERAL') return null

  const config = {
    NARRATIVE: { icon: FileText, label: 'Narrative', color: 'text-blue-400 bg-blue-400/10' },
    ALERT: { icon: AlertTriangle, label: 'Alert', color: 'text-orange-400 bg-orange-400/10' },
  }

  const { icon: Icon, label, color } = config[type] || {}
  if (!Icon) return null

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  )
}

// Mentions modal component
function MentionsModal({
  onClose,
  onNavigateToThread,
}: {
  onClose: () => void
  onNavigateToThread: (threadId: number) => void
}) {
  const queryClient = useQueryClient()

  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ['mentions'],
    queryFn: () => discussionApi.getMentions().then(r => r.data),
  })

  const markAsReadMutation = useMutation({
    mutationFn: discussionApi.markMentionAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentions'] })
      queryClient.invalidateQueries({ queryKey: ['mention-count'] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: discussionApi.markAllMentionsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentions'] })
      queryClient.invalidateQueries({ queryKey: ['mention-count'] })
      toast.success('All mentions marked as read')
    },
  })

  const handleClick = (mention: { id: number; threadId: number }) => {
    markAsReadMutation.mutate(mention.id)
    onNavigateToThread(mention.threadId)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card-bg rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <AtSign size={20} /> Mentions
          </h3>
          <div className="flex items-center gap-2">
            {mentions.length > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-sm text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-text-secondary hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-text-secondary">Loading...</div>
          ) : mentions.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <AtSign size={32} className="mx-auto mb-2 opacity-50" />
              No unread mentions
            </div>
          ) : (
            <div className="space-y-2">
              {mentions.map(mention => (
                <div
                  key={mention.id}
                  onClick={() => handleClick(mention)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    mention.isRead ? 'bg-white/5' : 'bg-accent/10 hover:bg-accent/20'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-white">
                      {mention.mentioner.name || mention.mentioner.email}
                    </span>
                    <span className="text-text-secondary">mentioned you in</span>
                  </div>
                  <div className="text-accent text-sm mt-1 truncate">
                    {mention.threadTitle}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    {formatDate(mention.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
