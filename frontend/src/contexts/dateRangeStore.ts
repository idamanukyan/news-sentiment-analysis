import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { subHours, subDays } from 'date-fns'

export type DateRangeValue = '24h' | '7d' | '30d' | '90d' | 'all'

interface DateRangeState {
  dateRange: DateRangeValue
  setDateRange: (range: DateRangeValue) => void
  getDateRange: () => { from: Date | null; to: Date | null }
}

export const useDateRangeStore = create<DateRangeState>()(
  persist(
    (set, get) => ({
      dateRange: '7d',

      setDateRange: (dateRange: DateRangeValue) => {
        set({ dateRange })
      },

      getDateRange: () => {
        const now = new Date()
        const range = get().dateRange

        switch (range) {
          case '24h':
            return { from: subHours(now, 24), to: now }
          case '7d':
            return { from: subDays(now, 7), to: now }
          case '30d':
            return { from: subDays(now, 30), to: now }
          case '90d':
            return { from: subDays(now, 90), to: now }
          case 'all':
          default:
            return { from: null, to: null }
        }
      },
    }),
    {
      name: 'date-range-storage',
    }
  )
)
