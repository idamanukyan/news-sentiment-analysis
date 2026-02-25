import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from '../pages/LoginPage'
import { authApi } from '../services/api'

// Mock the api module
vi.mock('../services/api', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderLoginPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    renderLoginPage()

    expect(screen.getByText(/AIIM/)).toBeTruthy()
    expect(screen.getByPlaceholderText(/email/i)).toBeTruthy()
    expect(screen.getByPlaceholderText(/password/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy()
  })

  it('should display validation error for empty fields', async () => {
    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await userEvent.click(submitButton)

    // Form should not be submitted with empty fields (HTML5 validation)
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('should call login API with correct credentials', async () => {
    const mockResponse = {
      data: {
        token: 'jwt-token',
        expiresIn: 86400000,
        email: 'admin@aiim.am',
        name: 'Admin',
        role: 'ADMIN',
      },
    }
    vi.mocked(authApi.login).mockResolvedValue(mockResponse)

    renderLoginPage()

    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await userEvent.type(emailInput, 'admin@aiim.am')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('admin@aiim.am', 'password123')
    })
  })

  it('should display error message on login failure', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'))

    renderLoginPage()

    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await userEvent.type(emailInput, 'admin@aiim.am')
    await userEvent.type(passwordInput, 'wrongpassword')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeTruthy()
    })
  })
})
