import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { topicsApi } from '../services/api'
import type { Topic } from '../types'

export default function TopicsPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [newTopic, setNewTopic] = useState({ name: '', keywords: '' })
  const queryClient = useQueryClient()

  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await topicsApi.getAll()
      return res.data as Topic[]
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; keywords: string[] }) => topicsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      setIsCreating(false)
      setNewTopic({ name: '', keywords: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => topicsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const keywords = newTopic.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    if (newTopic.name && keywords.length > 0) {
      createMutation.mutate({ name: newTopic.name, keywords })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Topics</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="btn btn-primary"
        >
          Create Topic
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">New Topic</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic Name
              </label>
              <input
                type="text"
                value={newTopic.name}
                onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                className="input"
                placeholder="e.g., Elections"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={newTopic.keywords}
                onChange={(e) => setNewTopic({ ...newTopic, keywords: e.target.value })}
                className="input"
                placeholder="e.g., election, vote, parliament"
                required
              />
            </div>
            <div className="flex space-x-2">
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Topics List */}
      <div className="card">
        {isLoading ? (
          <div className="py-8 text-center">Loading topics...</div>
        ) : topics?.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No topics yet. Create your first topic to start tracking.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {topics?.map((topic) => (
              <div key={topic.id} className="py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{topic.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {topic.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(topic.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
