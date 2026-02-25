import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { dashboardApi, alertsApi } from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import {
  ThreatGauge,
  SentimentPieChart,
  SourcesDonutChart,
  NarrativeTimelineChart,
  StatCardSkeleton,
  GaugeSkeleton,
  LineChartSkeleton,
  PieChartSkeleton,
  NarrativeListSkeleton,
  TableSkeleton,
} from '../components/charts'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Newspaper,
  MessageSquare,
  Radio,
  Bell,
  Database,
  FileText,
  RefreshCw,
  Calendar,
  Wifi,
  WifiOff,
} from 'lucide-react'

interface DashboardStats {
  totalArticles: number
  articlesToday: number
  telegramPosts: number
  activeNarratives: number
  activeAlerts: number
  totalSources: number
  overallThreatLevel: string
  topNarratives: Array<{
    id: number
    name: string
    threatLevel: string
    articleCount: number
    keywords: string[]
  }>
  recentAlerts: Array<{
    id: number
    title: string
    severity: string
    triggeredAt: string
    status: string
    narrativeName: string
  }>
  articlesBySource: Record<string, number>
  sentimentDistribution: Record<string, number>
  volumeTimeline: Array<{ date: string; count: number }>
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-100',
}: {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'stable'
  icon: React.ElementType
  iconColor?: string
  iconBg?: string
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {trend && (
              <span className={`flex items-center text-xs font-medium ${
                trend === 'up' ? 'text-red-600 dark:text-red-400' : trend === 'down' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
              }`}>
                <TrendIcon size={14} />
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${iconBg} dark:bg-opacity-20`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </div>
  )
}

// Alert Banner Component
function AlertBanner({ severity, title, time }: { severity: string; title: string; time: string }) {
  const severityConfig: Record<string, { bg: string; icon: string }> = {
    CRITICAL: { bg: 'bg-red-600', icon: 'text-white' },
    HIGH: { bg: 'bg-orange-500', icon: 'text-white' },
    MEDIUM: { bg: 'bg-amber-500', icon: 'text-white' },
    LOW: { bg: 'bg-blue-500', icon: 'text-white' },
  }

  const config = severityConfig[severity] || severityConfig.LOW

  return (
    <div className={`${config.bg} text-white px-3 sm:px-4 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 animate-fade-in`}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <AlertTriangle size={18} className="flex-shrink-0" />
        <span className="font-medium text-sm sm:text-base truncate">{title}</span>
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded flex-shrink-0">{severity}</span>
      </div>
      <span className="text-xs sm:text-sm opacity-80 self-end sm:self-auto">{time}</span>
    </div>
  )
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

// Armenia election date - June 2026
const ELECTION_DATE = new Date('2026-06-21T08:00:00+04:00')

// Election Countdown Component
function ElectionCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const difference = ELECTION_DATE.getTime() - now.getTime()

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="opacity-80 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium opacity-80">Election Day Countdown</p>
            <p className="text-sm font-semibold">Parliamentary Elections 2026</p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 text-center justify-center sm:justify-end">
          <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-2 min-w-[44px] sm:min-w-[50px]">
            <p className="text-lg sm:text-xl font-bold">{timeLeft.days}</p>
            <p className="text-[9px] sm:text-[10px] opacity-80">DAYS</p>
          </div>
          <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-2 min-w-[44px] sm:min-w-[50px]">
            <p className="text-lg sm:text-xl font-bold">{timeLeft.hours}</p>
            <p className="text-[9px] sm:text-[10px] opacity-80">HRS</p>
          </div>
          <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-2 min-w-[44px] sm:min-w-[50px]">
            <p className="text-lg sm:text-xl font-bold">{timeLeft.minutes}</p>
            <p className="text-[9px] sm:text-[10px] opacity-80">MIN</p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TimelineDataPoint {
  date: string
  [narrativeName: string]: number | string
}

function generateTimelineData(
  narratives: DashboardStats['topNarratives'],
  volumeTimeline?: DashboardStats['volumeTimeline']
): TimelineDataPoint[] {
  const days = 7
  const data: TimelineDataPoint[] = []
  const now = new Date()

  const dailyTotals: Record<string, number> = {}
  if (volumeTimeline && volumeTimeline.length > 0) {
    volumeTimeline.forEach(v => {
      const date = new Date(v.date)
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      dailyTotals[dateStr] = v.count
    })
  }

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const point: TimelineDataPoint = { date: dateStr }
    const dailyTotal = dailyTotals[dateStr] || 0

    if (dailyTotal > 0 && narratives.length > 0) {
      const totalNarrativeArticles = narratives.reduce((sum, n) => sum + n.articleCount, 0) || 1
      narratives.forEach((narrative) => {
        const proportion = narrative.articleCount / totalNarrativeArticles
        point[narrative.name] = Math.max(1, Math.round(dailyTotal * proportion * 0.3))
      })
    } else {
      narratives.forEach((narrative) => {
        const base = Math.max(1, Math.floor(narrative.articleCount / days))
        point[narrative.name] = base
      })
    }
    data.push(point)
  }

  return data
}

export default function ElectionDashboard() {
  const queryClient = useQueryClient()

  // WebSocket callbacks for real-time updates
  const onDashboardRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }, [queryClient])

  const onAlertUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['urgent-alerts'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }, [queryClient])

  // Connect to WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    onDashboardRefresh,
    onAlert: onAlertUpdate,
    showToasts: true, // Show toast for new alerts
  })

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await dashboardApi.getStats()
      return res.data as DashboardStats
    },
    refetchInterval: isConnected ? false : 30000, // Only poll if WebSocket disconnected
  })

  const { data: urgentAlerts } = useQuery({
    queryKey: ['urgent-alerts'],
    queryFn: async () => {
      const res = await alertsApi.getUrgent()
      return res.data
    },
  })

  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Update timestamp when data refreshes
  useEffect(() => {
    if (stats) {
      setLastUpdated(new Date())
    }
  }, [stats])

  // Loading state with skeletons
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Live indicator */}
        <div className={`flex items-center gap-2 text-sm ${
          isConnected ? 'text-green-600' : 'text-gray-500'
        }`}>
          {isConnected ? (
            <>
              <Wifi size={14} className="animate-pulse" />
              Live updates active
            </>
          ) : (
            <>
              <WifiOff size={14} />
              Connecting...
            </>
          )}
        </div>

        {/* Election countdown skeleton */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded bg-white/20 animate-pulse" />
              <div>
                <div className="h-3 w-32 bg-white/20 rounded animate-pulse mb-1" />
                <div className="h-4 w-40 bg-white/30 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/20 rounded-lg px-3 py-2 min-w-[50px] animate-pulse">
                  <div className="h-6 w-8 bg-white/30 rounded mb-1" />
                  <div className="h-2 w-6 bg-white/20 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts skeleton - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Threat Gauge skeleton */}
          <div className="card p-6">
            <div className="skeleton h-5 w-32 mb-4" />
            <GaugeSkeleton className="py-4" />
          </div>

          {/* Timeline chart skeleton */}
          <div className="lg:col-span-2 card p-6">
            <div className="skeleton h-5 w-40 mb-4" />
            <LineChartSkeleton />
          </div>
        </div>

        {/* Charts skeleton - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Narratives skeleton */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="skeleton h-5 w-28" />
              <div className="skeleton h-4 w-16" />
            </div>
            <NarrativeListSkeleton items={5} />
          </div>

          {/* Sentiment pie skeleton */}
          <div className="card p-6">
            <div className="skeleton h-5 w-36 mb-4" />
            <PieChartSkeleton className="h-[200px]" />
          </div>

          {/* Sources donut skeleton */}
          <div className="card p-6">
            <div className="skeleton h-5 w-32 mb-4" />
            <PieChartSkeleton className="h-[200px]" />
          </div>
        </div>

        {/* Table skeleton */}
        <TableSkeleton rows={5} />
      </div>
    )
  }

  const threatLevel = (stats?.overallThreatLevel || 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  const highThreatCount = stats?.topNarratives?.filter(n => n.threatLevel === 'HIGH' || n.threatLevel === 'CRITICAL').length || 0

  const narrativeColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6']
  const narrativesForChart = (stats?.topNarratives || []).slice(0, 4).map((n, i) => ({
    name: n.name,
    color: narrativeColors[i],
  }))
  const timelineData = generateTimelineData(stats?.topNarratives || [], stats?.volumeTimeline)

  const newsArticles = (stats?.totalArticles || 0) - (stats?.telegramPosts || 0)

  return (
    <div className="space-y-6">
      {/* Header with live indicator and quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`flex items-center gap-2 text-sm ${
            isConnected ? 'text-green-600' : 'text-gray-500'
          }`}>
            {isConnected ? (
              <>
                <Wifi size={14} className="animate-pulse" />
                <span className="hidden sm:inline">Live updates active</span>
                <span className="sm:hidden">Live</span>
              </>
            ) : (
              <>
                <WifiOff size={14} />
                <span className="hidden sm:inline">Polling (30s)</span>
                <span className="sm:hidden">Polling</span>
              </>
            )}
          </div>
          <span className="text-xs text-gray-500">
            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/reports"
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText size={14} />
            <span className="hidden sm:inline">Generate Report</span>
            <span className="sm:hidden">Report</span>
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Election Countdown */}
      <ElectionCountdown />

      {/* Active Alerts Banner */}
      {urgentAlerts && urgentAlerts.length > 0 && (
        <div className="space-y-2">
          {urgentAlerts.slice(0, 2).map((alert: { id: number; title: string; severity: string; triggeredAt: string }) => (
            <AlertBanner
              key={alert.id}
              severity={alert.severity}
              title={alert.title}
              time={formatTimeAgo(alert.triggeredAt)}
            />
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Sources Monitored"
          value={stats?.totalSources || 0}
          subtitle="News + Telegram"
          icon={Database}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <StatCard
          title="News Articles"
          value={newsArticles.toLocaleString()}
          subtitle={`${stats?.articlesToday || 0} new today`}
          icon={Newspaper}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-100"
        />
        <StatCard
          title="Telegram Posts"
          value={(stats?.telegramPosts || 0).toLocaleString()}
          subtitle="From channels"
          icon={Radio}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-100"
        />
        <StatCard
          title="Active Narratives"
          value={stats?.activeNarratives || 0}
          subtitle={highThreatCount > 0 ? `${highThreatCount} high threat` : 'Monitoring'}
          trend={highThreatCount > 0 ? 'up' : 'stable'}
          icon={MessageSquare}
          iconColor={highThreatCount > 0 ? 'text-amber-600' : 'text-green-600'}
          iconBg={highThreatCount > 0 ? 'bg-amber-100' : 'bg-green-100'}
        />
        <StatCard
          title="Active Alerts"
          value={stats?.activeAlerts || 0}
          subtitle="Requires attention"
          trend={(stats?.activeAlerts || 0) > 0 ? 'up' : 'stable'}
          icon={Bell}
          iconColor={(stats?.activeAlerts || 0) > 0 ? 'text-red-600' : 'text-gray-600'}
          iconBg={(stats?.activeAlerts || 0) > 0 ? 'bg-red-100' : 'bg-gray-100'}
        />
      </div>

      {/* Main Content Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Gauge */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Overall Threat Level</h2>
          <ThreatGauge level={threatLevel} />
        </div>

        {/* Timeline Chart */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Narrative Activity (7 Days)</h2>
          <NarrativeTimelineChart data={timelineData} narratives={narrativesForChart} />
        </div>
      </div>

      {/* Main Content Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Narratives */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Top Narratives</h2>
            <Link to="/narratives" className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ExternalLink size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {stats?.topNarratives && stats.topNarratives.length > 0 ? (
              stats.topNarratives.slice(0, 5).map((narrative, idx) => {
                const isHighThreat = narrative.threatLevel === 'HIGH' || narrative.threatLevel === 'CRITICAL'
                const isMediumThreat = narrative.threatLevel === 'MEDIUM'

                return (
                  <div
                    key={narrative.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isHighThreat ? 'bg-red-50 border-red-200' :
                      isMediumThreat ? 'bg-amber-50 border-amber-200' :
                      'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: narrativeColors[idx] }}
                        />
                        <span className="font-medium text-gray-900 text-sm truncate">{narrative.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-medium text-white rounded flex-shrink-0 ${
                        isHighThreat ? 'bg-red-600' :
                        isMediumThreat ? 'bg-amber-500' : 'bg-gray-500'
                      }`}>
                        {narrative.threatLevel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 pl-4">{narrative.articleCount} articles</p>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare size={24} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No narratives tracked yet</p>
                <p className="text-xs text-gray-600 mt-1 mb-4">Create narratives to monitor disinformation patterns</p>
                <Link to="/narratives" className="btn btn-primary btn-sm">
                  Create Narrative
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Sentiment Distribution</h2>
          <SentimentPieChart
            data={{
              positive: stats?.sentimentDistribution?.POSITIVE || 0,
              neutral: stats?.sentimentDistribution?.NEUTRAL || 0,
              negative: stats?.sentimentDistribution?.NEGATIVE || 0,
            }}
          />
        </div>

        {/* Source Distribution */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Content by Source</h2>
          <SourcesDonutChart data={stats?.articlesBySource || {}} />
        </div>
      </div>

      {/* Recent Alerts Table */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Alerts</h2>
          <Link to="/alerts" className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
            View all <ExternalLink size={12} />
          </Link>
        </div>
        {stats?.recentAlerts && stats.recentAlerts.length > 0 ? (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Alert</th>
                    <th>Narrative</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentAlerts.slice(0, 5).map((alert) => (
                    <tr key={alert.id}>
                      <td className="font-medium text-gray-900">{alert.title}</td>
                      <td className="text-gray-600">{alert.narrativeName || 'N/A'}</td>
                      <td>
                        <span className={`badge ${
                          alert.severity === 'CRITICAL' ? 'bg-purple-100 text-purple-800' :
                          alert.severity === 'HIGH' ? 'badge-red' :
                          alert.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-blue'
                        }`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          alert.status === 'ACTIVE' ? 'badge-red' :
                          alert.status === 'ACKNOWLEDGED' ? 'badge-yellow' :
                          'badge-green'
                        }`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="text-gray-600">{formatTimeAgo(alert.triggeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {stats.recentAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-gray-900 text-sm">{alert.title}</h3>
                    <span className={`badge text-xs flex-shrink-0 ${
                      alert.severity === 'CRITICAL' ? 'bg-purple-100 text-purple-800' :
                      alert.severity === 'HIGH' ? 'badge-red' :
                      alert.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-blue'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{alert.narrativeName || 'N/A'}</span>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        alert.status === 'ACTIVE' ? 'badge-red' :
                        alert.status === 'ACKNOWLEDGED' ? 'badge-yellow' :
                        'badge-green'
                      }`}>
                        {alert.status}
                      </span>
                      <span>{formatTimeAgo(alert.triggeredAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell size={24} className="text-green-600 sm:hidden" />
              <Bell size={28} className="text-green-600 hidden sm:block" />
            </div>
            <p className="text-sm font-medium text-gray-900">All clear - no recent alerts</p>
            <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto">
              Alerts are automatically triggered when narratives show unusual activity or reach threat thresholds
            </p>
            <Link to="/narratives" className="text-xs text-primary-600 hover:text-primary-700 mt-3 inline-block">
              Configure narrative thresholds →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
