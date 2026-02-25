import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface SourceData {
  name: string
  value: number
  color: string
}

interface SourcesDonutChartProps {
  data: Record<string, number>
}

const SOURCE_COLORS: Record<string, string> = {
  rss: '#3b82f6',
  web_scrape: '#10b981',
  telegram: '#0088cc',
  news: '#3b82f6',      // backwards compat
  social: '#f59e0b',
  other: '#6b7280',
}

const SOURCE_LABELS: Record<string, string> = {
  rss: 'RSS Feeds',
  web_scrape: 'Web Scrape',
  telegram: 'Telegram',
  news: 'News',
}

export default function SourcesDonutChart({ data }: SourcesDonutChartProps) {
  const chartData: SourceData[] = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name: SOURCE_LABELS[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      value,
      color: SOURCE_COLORS[name.toLowerCase()] || '#6b7280',
    }))

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-gray-600">No source data available</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} (${((value / total) * 100).toFixed(1)}%)`,
              name,
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-4 mt-2">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center space-x-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-600">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
