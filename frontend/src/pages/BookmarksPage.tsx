import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { bookmarksApi } from '../services/api'
import type { Article, PageResponse } from '../types'
import { formatDistanceToNow } from 'date-fns'
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Newspaper,
  Radio,
  Globe,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

function SentimentBadge({ sentiment, confidence }: { sentiment?: string; confidence?: number }) {
  if (!sentiment) return <span className="badge badge-gray">Pending</span>

  const badges: Record<string, string> = {
    POSITIVE: 'badge-green',
    NEGATIVE: 'badge-red',
    NEUTRAL: 'badge-gray',
  }

  return (
    <span className={`badge ${badges[sentiment] || 'badge-gray'}`}>
      {sentiment.charAt(0) + sentiment.slice(1).toLowerCase()}
      {confidence !== undefined && <span className="ml-1 opacity-60">({Math.round(confidence * 100)}%)</span>}
    </span>
  )
}

function SourceTypeBadge({ sourceType }: { sourceType?: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
    RSS: { className: 'badge-blue', icon: <Newspaper size={12} />, label: 'RSS' },
    WEB_SCRAPE: { className: 'badge-green', icon: <Globe size={12} />, label: 'Web' },
    TELEGRAM: { className: 'bg-sky-100 text-sky-700', icon: <Radio size={12} />, label: 'Telegram' },
  }

  const { className, icon, label } = config[sourceType || ''] || { className: 'badge-gray', icon: <FileText size={12} />, label: 'News' }

  return (
    <span className={`badge ${className} flex items-center gap-1`}>
      {icon}
      {label}
    </span>
  )
}

function LanguageBadge({ language }: { language?: string }) {
  if (!language) return null

  const flags: Record<string, string> = {
    ARMENIAN: '🇦🇲',
    RUSSIAN: '🇷🇺',
    ENGLISH: '🇬🇧',
  }

  return (
    <span className="text-sm" title={language}>
      {flags[language] || '🌍'}
    </span>
  )
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return dateString
  }
}

function ArticleCardSkeleton() {
  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-5 w-14 rounded-full" />
      </div>
      <div className="skeleton h-6 w-3/4 mb-2" />
      <div className="skeleton h-4 w-full mb-1" />
      <div className="skeleton h-4 w-2/3 mb-3" />
      <div className="flex gap-3">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-3 w-16" />
      </div>
    </div>
  )
}

export default function BookmarksPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)

  const { data: bookmarksData, isLoading } = useQuery({
    queryKey: ['bookmarks', page],
    queryFn: async () => {
      const res = await bookmarksApi.getAll({ page, size: 20 })
      return res.data as PageResponse<Article>
    },
  })

  const removeMutation = useMutation({
    mutationFn: (articleId: number) => bookmarksApi.remove(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['bookmarked-ids'] })
      toast.success('Bookmark removed')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookmarks</h1>
          <p className="text-sm text-gray-600 mt-1">
            {bookmarksData?.totalElements || 0} saved articles
          </p>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : bookmarksData?.content?.length === 0 ? (
          <div className="empty-state py-16">
            <Bookmark className="empty-state-icon" />
            <p className="empty-state-title">No bookmarks yet</p>
            <p className="empty-state-description">
              Bookmark articles from the News page to save them for later
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {bookmarksData?.content?.map((article) => (
                <article key={article.id} className="p-4 hover:bg-gray-50 transition-colors">
                  {/* Top row: badges */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SourceTypeBadge sourceType={article.sourceType} />
                    <span className="text-sm font-medium text-gray-700">
                      {article.sourceName || 'Unknown Source'}
                    </span>
                    <LanguageBadge language={article.language} />
                    <span className="text-gray-300">|</span>
                    <SentimentBadge sentiment={article.sentiment} confidence={article.confidence} />
                    {article.topicName && (
                      <span className="badge badge-purple">{article.topicName}</span>
                    )}
                  </div>

                  {/* Title */}
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2"
                  >
                    <h3 className="text-base font-medium text-gray-900 group-hover:text-primary-600 line-clamp-2 transition-colors">
                      {article.title}
                    </h3>
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-primary-600 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>

                  {/* Snippet */}
                  {article.snippet && (
                    <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">
                      {article.snippet}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500 gap-3">
                      {article.author && <span>By {article.author}</span>}
                      {article.publishedAt && (
                        <span title={new Date(article.publishedAt).toLocaleString()}>
                          {formatRelativeTime(article.publishedAt)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeMutation.mutate(article.id)}
                      disabled={removeMutation.isPending}
                      className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Remove bookmark"
                    >
                      <BookmarkCheck size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {bookmarksData && bookmarksData.totalPages > 1 && (
              <div className="px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  <span className="hidden sm:inline">Showing </span>
                  <span className="font-medium">{bookmarksData.number * bookmarksData.size + 1}</span>
                  <span className="hidden sm:inline"> to </span>
                  <span className="sm:hidden">-</span>
                  <span className="font-medium">{Math.min((bookmarksData.number + 1) * bookmarksData.size, bookmarksData.totalElements)}</span>
                  <span className="hidden sm:inline"> of </span>
                  <span className="sm:hidden"> / </span>
                  <span className="font-medium">{bookmarksData.totalElements.toLocaleString()}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                    className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg">
                    {page + 1} / {bookmarksData.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= bookmarksData.totalPages - 1}
                    className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
