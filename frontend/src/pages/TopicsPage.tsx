import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { topicsApi } from '../services/api'
import type { Topic } from '../types'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Russian' },
  { code: 'hy', name: 'Armenian' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
]

interface NewTopicForm {
  name: string
  keywords: string
  globalSearch: boolean
  language: string
}

export default function TopicsPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [newTopic, setNewTopic] = useState<NewTopicForm>({
    name: '',
    keywords: '',
    globalSearch: true,
    language: 'en',
  })
  const queryClient = useQueryClient()

  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await topicsApi.getAll()
      return res.data as Topic[]
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; keywords: string[]; globalSearch: boolean; language: string }) =>
      topicsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      setIsCreating(false)
      setNewTopic({ name: '', keywords: '', globalSearch: true, language: 'en' })
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
      createMutation.mutate({
        name: newTopic.name,
        keywords,
        globalSearch: newTopic.globalSearch,
        language: newTopic.language,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Topics</h1>
          <p className="text-gray-600 mt-1">
            Track news topics worldwide with automatic sentiment analysis
          </p>
        </div>
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
                placeholder="e.g., Armenia Tech Industry"
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
                placeholder="e.g., Armenia startup, Yerevan tech, Armenian entrepreneurs"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use quotes for exact phrases: "Armenia tech", startup, innovation
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="globalSearch"
                checked={newTopic.globalSearch}
                onChange={(e) => setNewTopic({ ...newTopic, globalSearch: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="globalSearch" className="text-sm font-medium text-gray-700">
                Search worldwide news (NewsAPI)
              </label>
            </div>

            {newTopic.globalSearch && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={newTopic.language}
                  onChange={(e) => setNewTopic({ ...newTopic, language: e.target.value })}
                  className="input"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
            <p>No topics yet.</p>
            <p className="mt-2">Create a topic to start tracking worldwide news with sentiment analysis.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {topics?.map((topic) => (
              <div key={topic.id} className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">{topic.name}</h3>
                      {topic.globalSearch && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Global
                        </span>
                      )}
                      {topic.language && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {LANGUAGES.find((l) => l.code === topic.language)?.name || topic.language}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {topic.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    {topic.lastSearchedAt && (
                      <p className="text-xs text-gray-400 mt-2">
                        Last searched: {new Date(topic.lastSearchedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(topic.id)}
                    className="text-red-600 hover:text-red-800 text-sm ml-4"
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900">How Global Search Works</h3>
        <ul className="mt-2 text-sm text-blue-800 space-y-1">
          <li>• Topics with "Global" enabled search worldwide news every hour</li>
          <li>• Articles matching your keywords are automatically fetched</li>
          <li>• Each article is analyzed for sentiment using AI</li>
          <li>• View results in the Articles page filtered by topic</li>
        </ul>
      </div>
    </div>
  )
}
