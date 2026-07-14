import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@store/slices/authSlice'
import { ToastProvider } from '@components/Toast'
import AcceptInvite from './AcceptInvite'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/api/candidates', () => ({
  validateInviteToken: vi.fn(),
  acceptInvite: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    fieldErrors?: Record<string, string>
    constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
      super(message)
      this.status = status
      this.fieldErrors = fieldErrors
    }
  },
}))

import { acceptInvite, validateInviteToken } from '@/api/candidates'

function renderPage(initialEntry = '/accept-invite?token=valid-token') {
  const store = configureStore({
    reducer: { auth: authReducer },
  })

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ToastProvider>
          <Routes>
            <Route path="/accept-invite" element={<AcceptInvite />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </Provider>,
  )
}

describe('AcceptInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an error when the invitation token is invalid', async () => {
    vi.mocked(validateInviteToken).mockResolvedValue({
      valid: false,
      message: 'Invalid or expired token',
    })

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid or expired token')
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument()
  })

  it('renders the acceptance form for a valid token', async () => {
    vi.mocked(validateInviteToken).mockResolvedValue({ valid: true })

    renderPage()

    expect(await screen.findByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument()
  })

  it('submits the acceptance form on success', async () => {
    const user = userEvent.setup()
    vi.mocked(validateInviteToken).mockResolvedValue({ valid: true })
    vi.mocked(acceptInvite).mockResolvedValue({
      user: {
        id: 2,
        email: 'invited@example.com',
        date_joined: '2026-01-01T00:00:00Z',
        is_active: true,
      },
      access: 'access-token',
      refresh: 'refresh-token',
    })

    renderPage()

    await screen.findByLabelText(/^password$/i)
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /accept invitation/i }))

    await waitFor(() => {
      expect(acceptInvite).toHaveBeenCalledWith({
        token: 'valid-token',
        password: 'SecurePass123!',
        first_name: '',
        last_name: '',
      })
    })

    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
  })
})
