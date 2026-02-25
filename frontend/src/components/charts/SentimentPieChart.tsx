import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface SentimentData {
  name: string
  value: number
  color: string
}

interface SentimentPieChartProps {
  data: {
    positive: number
    neutral: number
    negative: number
  }
}

export default function SentimentPieChart({ data }: SentimentPieChartProps) {
  const chartData: SentimentData[] = [
    { name: 'Positive', value: data.positive || 0, color: '#10b981' },
    { name: 'Neutral', value: data.neutral || 0, color: '#6b7280' },
    { name: 'Negative', value: data.negative || 0, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-gray-600">No sentiment data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [value, 'Articles']}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
