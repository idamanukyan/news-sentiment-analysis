import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface TimelineDataPoint {
  date: string
  [narrativeName: string]: number | string
}

interface NarrativeTimelineChartProps {
  data: TimelineDataPoint[]
  narratives: { name: string; color: string }[]
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899']

export default function NarrativeTimelineChart({ data, narratives }: NarrativeTimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-gray-600">No timeline data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          {narratives.map((narrative, index) => (
            <linearGradient
              key={narrative.name}
              id={`gradient-${index}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={narrative.color || COLORS[index % COLORS.length]}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={narrative.color || COLORS[index % COLORS.length]}
                stopOpacity={0.1}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Legend />
        {narratives.map((narrative, index) => (
          <Area
            key={narrative.name}
            type="monotone"
            dataKey={narrative.name}
            stroke={narrative.color || COLORS[index % COLORS.length]}
            fillOpacity={1}
            fill={`url(#gradient-${index})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
