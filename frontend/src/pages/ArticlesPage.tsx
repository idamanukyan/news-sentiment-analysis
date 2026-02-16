import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { articlesApi, sourcesApi } from '../services/api'
import { format } from 'date-fns'
import type { Article, Source, PageResponse } from '../types'

export default function ArticlesPage() {
  const [filters, setFilters] = useState({
    sourceId: '',
    sentiment: '',
    page: 0,
  })

  const { data: sources } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const res = await sourcesApi.getAll({ active: true })
      return res.data as Source[]
    },
  })

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['articles', filters],
    queryFn: async () => {
      const res = await articlesApi.getAll({
        sourceId: filters.sourceId ? parseInt(filters.sourceId) : undefined,
        sentiment: filters.sentiment || undefined,
        page: filters.page,
        size: 20,
      })
      return res.data as PageResponse<Article>
    },
  })

  const getSentimentBadge = (sentiment?: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
    switch (sentiment) {
      case 'POSITIVE':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Positive</span>
      case 'NEGATIVE':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Negative</span>
      case 'NEUTRAL':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Neutral</span>
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-500`}>Pending</span>
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Articles</h1>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <select
            value={filters.sourceId}
            onChange={(e) => setFilters({ ...filters, sourceId: e.target.value, page: 0 })}
            className="input w-48"
          >
            <option value="">All Sources</option>
            {sources?.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sentiment</label>
          <select
            value={filters.sentiment}
            onChange={(e) => setFilters({ ...filters, sentiment: e.target.value, page: 0 })}
            className="input w-40"
          >
            <option value="">All</option>
            <option value="POSITIVE">Positive</option>
            <option value="NEGATIVE">Negative</option>
            <option value="NEUTRAL">Neutral</option>
          </select>
        </div>
      </div>

      {/* Articles List */}
      <div className="card">
        {isLoading ? (
          <div className="py-12 text-center">Loading articles...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sentiment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Published
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {articlesData?.content.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-800 line-clamp-2"
                        >
                          {article.title}
                        </a>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {article.sourceName}
                      </td>
                      <td className="px-4 py-4">
                        {getSentimentBadge(article.sentiment)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {format(new Date(article.publishedAt), 'MMM d, yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">
                Showing {articlesData?.content.length || 0} of {articlesData?.totalElements || 0} articles
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 0}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page >= (articlesData?.totalPages || 1) - 1}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
