interface ThreatGaugeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  showLabel?: boolean
}

export default function ThreatGauge({ level, showLabel = true }: ThreatGaugeProps) {
  const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  const currentIndex = levels.indexOf(level)

  const getColor = (index: number, isActive: boolean) => {
    if (!isActive) return 'bg-gray-200'
    const colors = ['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-600']
    return colors[index]
  }

  const getLabelColor = () => {
    const colors: Record<string, string> = {
      LOW: 'text-green-700 bg-green-100',
      MEDIUM: 'text-yellow-700 bg-yellow-100',
      HIGH: 'text-orange-700 bg-orange-100',
      CRITICAL: 'text-red-700 bg-red-100',
    }
    return colors[level]
  }

  return (
    <div className="space-y-3">
      {/* Gauge bars */}
      <div className="flex items-end space-x-1 h-16">
        {levels.map((lvl, index) => {
          const isActive = index <= currentIndex
          const height = 25 + index * 25 // 25%, 50%, 75%, 100%
          return (
            <div
              key={lvl}
              className={`flex-1 rounded-t transition-all duration-300 ${getColor(index, isActive)}`}
              style={{ height: `${height}%` }}
            />
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-600">
        <span>LOW</span>
        <span>MEDIUM</span>
        <span>HIGH</span>
        <span>CRITICAL</span>
      </div>

      {/* Current level badge */}
      {showLabel && (
        <div className="text-center">
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${getLabelColor()}`}>
            Threat Level: {level}
          </span>
        </div>
      )}
    </div>
  )
}
