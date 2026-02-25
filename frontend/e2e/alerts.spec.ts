import { test, expect } from '@playwright/test'

test.describe('Alerts Page - Critical Workflow Tests', () => {
  // Mock API responses for E2E tests
  test.beforeEach(async ({ page }) => {
    // Mock auth to simulate logged-in user AND skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          token: 'mock-jwt-token',
          user: {
            email: 'analyst@test.com',
            name: 'Test Analyst',
            role: 'ANALYST',
          },
          isAuthenticated: true,
        },
      }))
      // Skip onboarding tour (must match TOUR_STORAGE_KEY in OnboardingTour.tsx)
      localStorage.setItem('aiim_onboarding_completed', 'true')
    })

    // Mock API endpoints
    await page.route('**/api/v1/alerts**', async (route, request) => {
      const url = request.url()

      // GET /api/v1/alerts
      if (request.method() === 'GET' && !url.includes('stats')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [
              {
                id: 1,
                narrativeId: 1,
                narrativeName: 'Test Narrative',
                alertType: 'VOLUME_SPIKE',
                severity: 'HIGH',
                title: 'E2E Test Alert 1',
                description: 'Test alert for E2E testing',
                triggeredAt: new Date().toISOString(),
                status: 'ACTIVE',
                metadata: {},
                createdAt: new Date().toISOString(),
              },
              {
                id: 2,
                narrativeId: 2,
                narrativeName: 'Another Narrative',
                alertType: 'NEW_NARRATIVE',
                severity: 'MEDIUM',
                title: 'E2E Test Alert 2',
                description: 'Another test alert',
                triggeredAt: new Date().toISOString(),
                status: 'ACTIVE',
                metadata: {},
                createdAt: new Date().toISOString(),
              },
              {
                id: 3,
                narrativeId: null,
                narrativeName: null,
                alertType: 'COORDINATED',
                severity: 'CRITICAL',
                title: 'E2E Test Alert 3',
                description: 'Critical test alert',
                triggeredAt: new Date().toISOString(),
                status: 'ACTIVE',
                metadata: {},
                createdAt: new Date().toISOString(),
              },
            ],
            totalElements: 3,
            totalPages: 1,
            number: 0,
            size: 20,
          }),
        })
        return
      }

      // GET /api/v1/alerts/stats
      if (request.method() === 'GET' && url.includes('stats')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active: 3,
            critical: 1,
            high: 1,
            medium: 1,
            low: 0,
          }),
        })
        return
      }

      // POST /api/v1/alerts/bulk/acknowledge
      if (request.method() === 'POST' && url.includes('bulk/acknowledge')) {
        const body = JSON.parse(request.postData() || '{}')
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            acknowledged: body.alertIds?.length || 0,
            requested: body.alertIds?.length || 0,
          }),
        })
        return
      }

      // POST /api/v1/alerts/bulk/resolve
      if (request.method() === 'POST' && url.includes('bulk/resolve')) {
        const body = JSON.parse(request.postData() || '{}')
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            resolved: body.alertIds?.length || 0,
            requested: body.alertIds?.length || 0,
          }),
        })
        return
      }

      // POST /api/v1/alerts/bulk/dismiss
      if (request.method() === 'POST' && url.includes('bulk/dismiss')) {
        const body = JSON.parse(request.postData() || '{}')
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            dismissed: body.alertIds?.length || 0,
            requested: body.alertIds?.length || 0,
          }),
        })
        return
      }

      await route.continue()
    })

    // Mock team API
    await page.route('**/api/v1/team/members', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Test Analyst', email: 'analyst@test.com', role: 'ANALYST' },
        ]),
      })
    })
  })

  test('should display alerts page with alerts list', async ({ page }) => {
    await page.goto('/alerts')

    // Wait for alerts to load
    await expect(page.getByText('E2E Test Alert 1')).toBeVisible()
    await expect(page.getByText('E2E Test Alert 2')).toBeVisible()
    await expect(page.getByText('E2E Test Alert 3')).toBeVisible()
  })

  test('should enter select mode and show select all option', async ({ page }) => {
    await page.goto('/alerts')

    // Wait for page to load
    await expect(page.getByText('E2E Test Alert 1')).toBeVisible()

    // Find and click the Select button
    const selectButton = page.getByRole('button', { name: /select/i })
    await selectButton.click()

    // Should show "Select all" option
    await expect(page.getByText(/select all/i)).toBeVisible()
  })

  test('should select all alerts and show count', async ({ page }) => {
    await page.goto('/alerts')

    // Wait for page to load
    await expect(page.getByText('E2E Test Alert 1')).toBeVisible()

    // Enter select mode
    const selectButton = page.getByRole('button', { name: /select/i })
    await selectButton.click()

    // Click "Select all"
    await page.getByText(/select all/i).click()

    // Should show selection count
    await expect(page.getByText(/3 of 3 selected/i)).toBeVisible()
  })

  test('P0: should successfully bulk acknowledge selected alerts', async ({ page }) => {
    await page.goto('/alerts')

    // Wait for page to load
    await expect(page.getByText('E2E Test Alert 1')).toBeVisible()

    // Enter select mode
    const selectButton = page.getByRole('button', { name: /select/i })
    await selectButton.click()

    // Select all alerts
    await page.getByText(/select all/i).click()

    // Wait for selection count
    await expect(page.getByText(/3 of 3 selected/i)).toBeVisible()

    // Click Acknowledge button (the bulk action one, first in toolbar)
    const acknowledgeButton = page.getByRole('button', { name: /acknowledge/i }).first()
    await acknowledgeButton.click()

    // Should show success message (toast)
    await expect(page.getByText('alerts acknowledged')).toBeVisible({ timeout: 5000 })
  })

  test('should exit select mode after successful bulk operation', async ({ page }) => {
    await page.goto('/alerts')

    // Wait for page to load
    await expect(page.getByText('E2E Test Alert 1')).toBeVisible()

    // Enter select mode
    const selectButton = page.getByRole('button', { name: /select/i })
    await selectButton.click()

    // Select all alerts
    await page.getByText(/select all/i).click()

    // Click Acknowledge button (the bulk action one, first in toolbar)
    const acknowledgeButton = page.getByRole('button', { name: /acknowledge/i }).first()
    await acknowledgeButton.click()

    // After success, select mode should be exited (no "selected" text visible)
    await expect(page.getByText(/selected/i)).not.toBeVisible({ timeout: 5000 })
  })

  test('P0: should handle server error gracefully', async ({ page }) => {
    // Override the bulk acknowledge to return 500
    await page.route('**/api/v1/alerts/bulk/acknowledge', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      })
    })

    await page.goto('/alerts')

    // Wait for page to load
    await expect(page.getByText('E2E Test Alert 1')).toBeVisible()

    // Enter select mode
    const selectButton = page.getByRole('button', { name: /select/i })
    await selectButton.click()

    // Select all alerts
    await page.getByText(/select all/i).click()

    // Click Acknowledge button (the bulk action one, first in toolbar)
    const acknowledgeButton = page.getByRole('button', { name: /acknowledge/i }).first()
    await acknowledgeButton.click()

    // Should show error message
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 5000 })

    // UI should not be broken - alerts should still be visible
    await expect(page.getByText('E2E Test Alert 1')).toBeVisible()
  })

  test('should deselect all when clicking clear selection', async ({ page }) => {
    await page.goto('/alerts')

    // Wait for page to load
    await expect(page.getByText('E2E Test Alert 1')).toBeVisible()

    // Enter select mode
    const selectButton = page.getByRole('button', { name: /select/i })
    await selectButton.click()

    // Select all alerts
    await page.getByText(/select all/i).click()

    // Verify selection
    await expect(page.getByText(/3 of 3 selected/i)).toBeVisible()

    // Click "Deselect all" or similar button to clear
    const deselectButton = page.getByRole('button', { name: /cancel|clear|deselect/i })
    if (await deselectButton.isVisible()) {
      await deselectButton.click()
      // Selection should be cleared
      await expect(page.getByText(/selected/i)).not.toBeVisible()
    }
  })

  test('should show correct severity badges', async ({ page }) => {
    await page.goto('/alerts')

    // Wait for page to load
    await expect(page.getByText('E2E Test Alert 1')).toBeVisible()

    // Check severity badges are visible (use exact match to avoid filter labels)
    await expect(page.getByText('HIGH', { exact: true })).toBeVisible()
    await expect(page.getByText('MEDIUM', { exact: true })).toBeVisible()
    await expect(page.getByText('CRITICAL', { exact: true })).toBeVisible()
  })

  test('should filter alerts by status', async ({ page }) => {
    await page.goto('/alerts')

    // Wait for page to load
    await expect(page.getByText('E2E Test Alert 1')).toBeVisible()

    // Click on a filter button (e.g., "Requires Action")
    const filterButton = page.getByRole('button', { name: /requires action|active/i })
    if (await filterButton.isVisible()) {
      await filterButton.click()
      // Alerts should still be visible (all are active in our mock)
      await expect(page.getByText('E2E Test Alert 1')).toBeVisible()
    }
  })
})

test.describe('Alerts Page - Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Clear any existing auth
    await page.addInitScript(() => {
      localStorage.clear()
    })

    await page.goto('/alerts')

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/)
  })
})
