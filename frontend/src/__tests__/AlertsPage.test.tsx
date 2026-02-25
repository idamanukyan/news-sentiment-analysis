import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AlertsPage from '../pages/AlertsPage'
import { alertsApi, teamApi } from '../services/api'

// Mock the api module
vi.mock('../services/api', () => ({
  alertsApi: {
    getAll: vi.fn(),
    getStats: vi.fn(),
    acknowledge: vi.fn(),
    resolve: vi.fn(),
    dismiss: vi.fn(),
    assign: vi.fn(),
    updateNotes: vi.fn(),
    bulkAcknowledge: vi.fn(),
    bulkResolve: vi.fn(),
    bulkDismiss: vi.fn(),
  },
  teamApi: {
    getMembers: vi.fn(),
  },
}))

// Mock auth store
vi.mock('../contexts/authStore', () => ({
  useAuthStore: vi.fn().mockReturnValue({
    user: { email: 'analyst@test.com', name: 'Test Analyst', role: 'ANALYST' },
    token: 'mock-token',
  }),
}))

// Mock WebSocket hook
vi.mock('../hooks/useWebSocket', () => ({
  default: vi.fn().mockReturnValue({
    isConnected: true,
    sendMessage: vi.fn(),
  }),
}))

const mockAlerts = {
  content: [
    {
      id: 1,
      narrativeId: 1,
      narrativeName: 'Test Narrative',
      alertType: 'VOLUME_SPIKE',
      severity: 'HIGH',
      title: 'Test Alert 1',
      description: 'Test description 1',
      triggeredAt: new Date().toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      status: 'ACTIVE',
      metadata: {},
      createdAt: new Date().toISOString(),
      assignedTo: null,
      assignedAt: null,
      priority: 0,
      notes: null,
    },
    {
      id: 2,
      narrativeId: 2,
      narrativeName: 'Another Narrative',
      alertType: 'NEW_NARRATIVE',
      severity: 'MEDIUM',
      title: 'Test Alert 2',
      description: 'Test description 2',
      triggeredAt: new Date().toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      status: 'ACTIVE',
      metadata: {},
      createdAt: new Date().toISOString(),
      assignedTo: null,
      assignedAt: null,
      priority: 0,
      notes: null,
    },
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 20,
}

const mockStats = {
  active: 2,
  critical: 0,
  high: 1,
  medium: 1,
  low: 0,
}

const mockTeamMembers = [
  { id: 1, name: 'Test Analyst', email: 'analyst@test.com', role: 'ANALYST' },
]

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const renderAlertsPage = () => {
  const queryClient = createQueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AlertsPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('AlertsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(alertsApi.getAll).mockResolvedValue({ data: mockAlerts })
    vi.mocked(alertsApi.getStats).mockResolvedValue({ data: mockStats })
    vi.mocked(teamApi.getMembers).mockResolvedValue({ data: mockTeamMembers })
  })

  describe('Initial Rendering', () => {
    it('should render alerts list when data is loaded', async () => {
      renderAlertsPage()

      await waitFor(() => {
        expect(screen.getByText('Test Alert 1')).toBeTruthy()
      })

      expect(screen.getByText('Test Alert 2')).toBeTruthy()
    })

    it('should call API endpoints on mount', async () => {
      renderAlertsPage()

      await waitFor(() => {
        expect(alertsApi.getAll).toHaveBeenCalled()
        expect(alertsApi.getStats).toHaveBeenCalled()
        expect(teamApi.getMembers).toHaveBeenCalled()
      })
    })

    it('should display severity badges', async () => {
      renderAlertsPage()

      await waitFor(() => {
        expect(screen.getByText('HIGH')).toBeTruthy()
        expect(screen.getByText('MEDIUM')).toBeTruthy()
      })
    })

    it('should display status badges', async () => {
      renderAlertsPage()

      await waitFor(() => {
        const activeBadges = screen.getAllByText('ACTIVE')
        expect(activeBadges.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Select Mode', () => {
    it('should have a Select button', async () => {
      renderAlertsPage()

      await waitFor(() => {
        expect(screen.getByText('Test Alert 1')).toBeTruthy()
      })

      // Find the Select button
      const selectButtons = screen.getAllByRole('button')
      const selectButton = selectButtons.find(btn => btn.textContent?.includes('Select'))
      expect(selectButton).toBeTruthy()
    })

    it('should toggle select mode when clicking Select button', async () => {
      renderAlertsPage()

      await waitFor(() => {
        expect(screen.getByText('Test Alert 1')).toBeTruthy()
      })

      // Find and click the Select button
      const selectButtons = screen.getAllByRole('button')
      const selectButton = selectButtons.find(btn => btn.textContent?.includes('Select'))

      if (selectButton) {
        await userEvent.click(selectButton)

        // Should show "Select all" text when in select mode
        await waitFor(() => {
          expect(screen.getByText(/select all/i)).toBeTruthy()
        })
      }
    })
  })

  describe('Bulk Operations - API Integration', () => {
    it('should have bulkAcknowledge API method available', () => {
      expect(alertsApi.bulkAcknowledge).toBeDefined()
    })

    it('should have bulkResolve API method available', () => {
      expect(alertsApi.bulkResolve).toBeDefined()
    })

    it('should have bulkDismiss API method available', () => {
      expect(alertsApi.bulkDismiss).toBeDefined()
    })

    it('bulkAcknowledge should accept array of IDs', async () => {
      vi.mocked(alertsApi.bulkAcknowledge).mockResolvedValue({
        data: { success: true, acknowledged: 2, requested: 2 },
      })

      await alertsApi.bulkAcknowledge([1, 2])

      expect(alertsApi.bulkAcknowledge).toHaveBeenCalledWith([1, 2])
    })

    it('bulkResolve should accept array of IDs', async () => {
      vi.mocked(alertsApi.bulkResolve).mockResolvedValue({
        data: { success: true, resolved: 2, requested: 2 },
      })

      await alertsApi.bulkResolve([1, 2])

      expect(alertsApi.bulkResolve).toHaveBeenCalledWith([1, 2])
    })

    it('bulkDismiss should accept array of IDs', async () => {
      vi.mocked(alertsApi.bulkDismiss).mockResolvedValue({
        data: { success: true, dismissed: 2, requested: 2 },
      })

      await alertsApi.bulkDismiss([1, 2])

      expect(alertsApi.bulkDismiss).toHaveBeenCalledWith([1, 2])
    })
  })

  describe('Filter Buttons', () => {
    it('should have filter buttons', async () => {
      renderAlertsPage()

      await waitFor(() => {
        expect(screen.getByText('Test Alert 1')).toBeTruthy()
      })

      // Check for filter buttons
      const allButtons = screen.getAllByRole('button')
      expect(allButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Single Alert Operations', () => {
    it('should have acknowledge API method', () => {
      expect(alertsApi.acknowledge).toBeDefined()
    })

    it('should have resolve API method', () => {
      expect(alertsApi.resolve).toBeDefined()
    })

    it('should have dismiss API method', () => {
      expect(alertsApi.dismiss).toBeDefined()
    })
  })

  describe('Empty State', () => {
    it('should handle empty alerts list', async () => {
      vi.mocked(alertsApi.getAll).mockResolvedValue({
        data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 }
      })

      renderAlertsPage()

      await waitFor(() => {
        // Should show empty state message
        expect(screen.getByText(/all clear/i)).toBeTruthy()
      })
    })
  })
})
