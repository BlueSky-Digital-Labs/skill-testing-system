import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@store/slices/authSlice'
import { ToastProvider } from '@components/Toast'
import SelfRegister from './SelfRegister'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/api/candidates', () => ({
  selfRegister: vi.fn(),
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

import { selfRegister } from '@/api/candidates'

function renderPage() {
  const store = configureStore({
    reducer: { auth: authReducer },
  })

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ToastProvider>
          <SelfRegister />
        </ToastProvider>
      </MemoryRouter>
    </Provider>,
  )
}

describe('SelfRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the registration form', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows validation errors for invalid submission', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
  })

  it('submits registration and navigates on success', async () => {
    const user = userEvent.setup()
    vi.mocked(selfRegister).mockResolvedValue({
      user: {
        id: 1,
        email: 'candidate@example.com',
        date_joined: '2026-01-01T00:00:00Z',
        is_active: true,
      },
      access: 'access-token',
      refresh: 'refresh-token',
    })

    renderPage()

    await user.type(screen.getByLabelText(/^email$/i), 'candidate@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(selfRegister).toHaveBeenCalledWith({
        email: 'candidate@example.com',
        password: 'SecurePass123!',
        password_confirm: 'SecurePass123!',
        first_name: '',
        last_name: '',
      })
    })

    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
  })
})
