/**
 * Skeleton loaders for chart components
 * These provide visual placeholders that hint at the chart type while loading
 */

interface SkeletonProps {
  className?: string
}

// Pie/Donut chart skeleton with circular shape
export function PieChartSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        {/* Outer ring */}
        <div className="w-40 h-40 rounded-full border-[24px] border-gray-200 animate-pulse" />
        {/* Inner circle (for donut effect) */}
        <div className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-white" />
      </div>
      {/* Legend placeholders */}
      <div className="flex gap-4 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full skeleton" />
            <div className="skeleton h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Bar chart skeleton with animated bars
export function BarChartSkeleton({ className = '', bars = 5 }: SkeletonProps & { bars?: number }) {
  const heights = [60, 80, 45, 90, 70, 55, 85]

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-end justify-between gap-2 h-48 px-4">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="flex-1 skeleton rounded-t"
            style={{
              height: `${heights[i % heights.length]}%`,
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between px-4 mt-2">
        {Array.from({ length: bars }).map((_, i) => (
          <div key={i} className="skeleton h-3 w-8" />
        ))}
      </div>
    </div>
  )
}

// Line/Area chart skeleton with wave pattern
export function LineChartSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between py-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-px bg-gray-100" />
        ))}
      </div>

      {/* Chart area with wave shape */}
      <div className="relative h-48 overflow-hidden">
        <svg
          viewBox="0 0 400 150"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="skeletonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M0,100 Q50,60 100,80 T200,50 T300,70 T400,40 L400,150 L0,150 Z"
            fill="url(#skeletonGradient)"
            className="animate-pulse"
          />
          <path
            d="M0,100 Q50,60 100,80 T200,50 T300,70 T400,40"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="2"
            className="animate-pulse"
          />
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="skeleton h-3 w-10" />
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 justify-center">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded skeleton" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Gauge/meter skeleton
export function GaugeSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Gauge bars */}
      <div className="flex items-end space-x-1 h-16 w-full max-w-[200px]">
        {[25, 50, 75, 100].map((height, i) => (
          <div
            key={i}
            className="flex-1 skeleton rounded-t"
            style={{
              height: `${height}%`,
              animationDelay: `${i * 150}ms`
            }}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="flex justify-between w-full max-w-[200px] mt-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-2 w-8" />
        ))}
      </div>

      {/* Badge */}
      <div className="skeleton h-8 w-32 rounded-full mt-4" />
    </div>
  )
}

// Stat card skeleton
export function StatCardSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="skeleton h-4 w-24 mb-3" />
          <div className="skeleton h-8 w-16 mb-2" />
          <div className="skeleton h-3 w-20" />
        </div>
        <div className="skeleton w-10 h-10 rounded-lg" />
      </div>
    </div>
  )
}

// Table skeleton
export function TableSkeleton({ className = '', rows = 5 }: SkeletonProps & { rows?: number }) {
  return (
    <div className={`card p-6 ${className}`}>
      <div className="skeleton h-5 w-32 mb-4" />
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex gap-4 pb-2 border-b border-gray-100">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-3 w-16" />
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="skeleton h-4 flex-1" />
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Generic chart card skeleton (used when chart type is unknown)
export function ChartCardSkeleton({
  className = '',
  height = 200,
  title = true
}: SkeletonProps & { height?: number; title?: boolean }) {
  return (
    <div className={`card p-6 ${className}`}>
      {title && <div className="skeleton h-5 w-32 mb-4" />}
      <div className="skeleton w-full rounded" style={{ height }} />
    </div>
  )
}

// Narrative list skeleton
export function NarrativeListSkeleton({ className = '', items = 5 }: SkeletonProps & { items?: number }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-gray-100 bg-gray-50"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="skeleton w-2.5 h-2.5 rounded-full" />
              <div className="skeleton h-4 w-32" />
            </div>
            <div className="skeleton h-5 w-16 rounded" />
          </div>
          <div className="skeleton h-3 w-20 mt-2 ml-4" />
        </div>
      ))}
    </div>
  )
}
