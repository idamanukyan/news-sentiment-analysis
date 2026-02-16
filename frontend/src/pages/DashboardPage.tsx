import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { sentimentApi, articlesApi } from '../services/api'
import { format, subDays } from 'date-fns'
import type { SentimentAggregate, Article } from '../types'

const COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#6b7280',
}

export default function DashboardPage() {
  const now = new Date()
  const from = subDays(now, 7).toISOString()
  const to = now.toISOString()

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['sentiment-trend', from, to],
    queryFn: async () => {
      const res = await sentimentApi.getAggregate({ groupBy: 'day', from, to })
      return res.data as SentimentAggregate[]
    },
  })

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['sentiment-summary', from, to],
    queryFn: async () => {
      const res = await sentimentApi.getSummary({ from, to })
      return res.data as { POSITIVE: number; NEGATIVE: number; NEUTRAL: number }
    },
  })

  const { data: recentArticles, isLoading: articlesLoading } = useQuery({
    queryKey: ['recent-articles'],
    queryFn: async () => {
      const res = await articlesApi.getAll({ size: 5 })
      return res.data.content as Article[]
    },
  })

  const pieData = summaryData
    ? [
        { name: 'Positive', value: summaryData.POSITIVE, color: COLORS.positive },
        { name: 'Negative', value: summaryData.NEGATIVE, color: COLORS.negative },
        { name: 'Neutral', value: summaryData.NEUTRAL, color: COLORS.neutral },
      ]
    : []

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return <span className="text-green-500">+</span>
      case 'NEGATIVE':
        return <span className="text-red-500">-</span>
      default:
        return <span className="text-gray-500">○</span>
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Positive</p>
          <p className="text-3xl font-bold text-green-600">
            {summaryLoading ? '...' : summaryData?.POSITIVE || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Negative</p>
          <p className="text-3xl font-bold text-red-600">
            {summaryLoading ? '...' : summaryData?.NEGATIVE || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Neutral</p>
          <p className="text-3xl font-bold text-gray-600">
            {summaryLoading ? '...' : summaryData?.NEUTRAL || 0}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sentiment Trend (7 Days)</h2>
          {trendLoading ? (
            <div className="h-64 flex items-center justify-center">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="group" tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="positive" stroke={COLORS.positive} strokeWidth={2} />
                <Line type="monotone" dataKey="negative" stroke={COLORS.negative} strokeWidth={2} />
                <Line type="monotone" dataKey="neutral" stroke={COLORS.neutral} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sentiment Distribution</h2>
          {summaryLoading ? (
            <div className="h-64 flex items-center justify-center">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Articles */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Articles</h2>
        {articlesLoading ? (
          <div className="py-8 text-center">Loading...</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentArticles?.map((article) => (
              <div key={article.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getSentimentIcon(article.sentiment)}
                  <div>
                    <p className="font-medium text-gray-900 line-clamp-1">{article.title}</p>
                    <p className="text-sm text-gray-500">{article.sourceName}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-400">
                  {format(new Date(article.publishedAt), 'MMM d, HH:mm')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
