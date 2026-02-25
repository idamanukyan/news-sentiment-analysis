import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  X,
  Newspaper,
  MessageSquare,
  Bell,
  Command,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { searchApi } from '../services/api'

interface SearchResult {
  type: 'article' | 'narrative' | 'alert'
  id: number
  title: string
  subtitle?: string
  metadata?: {
    sentiment?: string
    threatLevel?: string
    severity?: string
    status?: string
    sourceName?: string
  }
}

interface SearchResponse {
  articles: SearchResult[]
  narratives: SearchResult[]
  alerts: SearchResult[]
  totalCount: number
}

const typeIcons = {
  article: <Newspaper size={16} className="text-blue-500" />,
  narrative: <MessageSquare size={16} className="text-purple-500" />,
  alert: <Bell size={16} className="text-red-500" />,
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

interface GlobalSearchProps {
  mobile?: boolean
}

export default function GlobalSearch({ mobile = false }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Search API call
  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        return { articles: [], narratives: [], alerts: [], totalCount: 0 }
      }
      const res = await searchApi.search(debouncedQuery)
      return res.data as SearchResponse
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  })

  // Flatten results for keyboard navigation
  const allResults: SearchResult[] = [
    ...(results?.narratives || []),
    ...(results?.alerts || []),
    ...(results?.articles || []).slice(0, 5),
  ]

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Keyboard navigation within results
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, allResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && allResults[selectedIndex]) {
        e.preventDefault()
        handleSelect(allResults[selectedIndex])
      }
    },
    [allResults, selectedIndex]
  )

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false)
    // Navigate to the appropriate page with the item ID
    if (result.type === 'article') {
      navigate(`/news?article=${result.id}`)
    } else if (result.type === 'narrative') {
      navigate(`/narratives?id=${result.id}`)
    } else if (result.type === 'alert') {
      navigate(`/alerts?id=${result.id}`)
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-purple-100 text-purple-700'
      case 'HIGH':
        return 'bg-red-100 text-red-700'
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return 'bg-green-100 text-green-700'
      case 'NEGATIVE':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <>
      {/* Search trigger button */}
      {mobile ? (
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 transition-colors min-w-[240px]"
        >
          <Search size={16} />
          <span className="flex-1 text-left">Search everything...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded text-xs font-mono text-gray-400 dark:text-gray-300">
            <Command size={10} />K
          </kbd>
        </button>
      )}

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Search modal */}
          <div className="relative min-h-screen flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-2 sm:px-4">
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                <Search size={20} className="text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search articles, narratives, alerts..."
                  className="flex-1 text-lg outline-none placeholder:text-gray-500 dark:placeholder:text-slate-400 bg-transparent text-gray-900 dark:text-white"
                />
                {isLoading && <Loader2 size={20} className="text-gray-400 animate-spin" />}
                {query && !isLoading && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                  >
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 text-xs font-medium"
                >
                  ESC
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto">
                {query.length < 2 ? (
                  <div className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">
                    <Search size={32} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                    <p className="text-sm">Type at least 2 characters to search</p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      Search across articles, narratives, and alerts
                    </p>
                  </div>
                ) : allResults.length === 0 && !isLoading ? (
                  <div className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">
                    <p className="text-sm">No results found for "{query}"</p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      Try different keywords or check spelling
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    {/* Narratives section */}
                    {results?.narratives && results.narratives.length > 0 && (
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1 px-2">
                          Narratives
                        </p>
                        {results.narratives.map((result, index) => (
                          <button
                            key={`narrative-${result.id}`}
                            onClick={() => handleSelect(result)}
                            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                              selectedIndex === index
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            {typeIcons.narrative}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
                                {highlightMatch(result.title, query)}
                              </p>
                              {result.subtitle && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{result.subtitle}</p>
                              )}
                            </div>
                            {result.metadata?.threatLevel && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(
                                  result.metadata.threatLevel
                                )}`}
                              >
                                {result.metadata.threatLevel}
                              </span>
                            )}
                            <ArrowRight size={14} className="text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Alerts section */}
                    {results?.alerts && results.alerts.length > 0 && (
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1 px-2">
                          Alerts
                        </p>
                        {results.alerts.map((result, index) => {
                          const adjustedIndex =
                            (results?.narratives?.length || 0) + index
                          return (
                            <button
                              key={`alert-${result.id}`}
                              onClick={() => handleSelect(result)}
                              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                                selectedIndex === adjustedIndex
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
                                  : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                              }`}
                            >
                              {typeIcons.alert}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
                                  {highlightMatch(result.title, query)}
                                </p>
                                {result.subtitle && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                    {result.subtitle}
                                  </p>
                                )}
                              </div>
                              {result.metadata?.severity && (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(
                                    result.metadata.severity
                                  )}`}
                                >
                                  {result.metadata.severity}
                                </span>
                              )}
                              <ArrowRight size={14} className="text-gray-400" />
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Articles section */}
                    {results?.articles && results.articles.length > 0 && (
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1 px-2">
                          Articles
                        </p>
                        {results.articles.slice(0, 5).map((result, index) => {
                          const adjustedIndex =
                            (results?.narratives?.length || 0) +
                            (results?.alerts?.length || 0) +
                            index
                          return (
                            <button
                              key={`article-${result.id}`}
                              onClick={() => handleSelect(result)}
                              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                                selectedIndex === adjustedIndex
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
                                  : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                              }`}
                            >
                              {typeIcons.article}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
                                  {highlightMatch(result.title, query)}
                                </p>
                                {result.metadata?.sourceName && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                    {result.metadata.sourceName}
                                  </p>
                                )}
                              </div>
                              {result.metadata?.sentiment && (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${getSentimentColor(
                                    result.metadata.sentiment
                                  )}`}
                                >
                                  {result.metadata.sentiment}
                                </span>
                              )}
                              <ArrowRight size={14} className="text-gray-400" />
                            </button>
                          )
                        })}
                        {results.articles.length > 5 && (
                          <button
                            onClick={() => {
                              setIsOpen(false)
                              navigate(`/news?q=${encodeURIComponent(query)}`)
                            }}
                            className="w-full text-center py-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                          >
                            View all {results.articles.length} articles
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <div className="hidden sm:flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded">
                      <span className="text-[10px]">Enter</span>
                    </kbd>
                    to select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded text-[10px]">
                      Esc
                    </kbd>
                    to close
                  </span>
                </div>
                <span className="sm:hidden text-gray-500 dark:text-gray-400">Tap to select</span>
                {results?.totalCount !== undefined && results.totalCount > 0 && (
                  <span>{results.totalCount} results</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
