import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsersPage } from './UsersPage'
import * as adminApi from '@/api/admin'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const sampleRole = {
  id: 1,
  key: 'SYSTEM_ADMIN',
  name: 'System Administrator',
  description: '',
  is_active: true,
}

const sampleUser = {
  id: 10,
  email: 'user@example.com',
  username: 'user@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  roles: [sampleRole],
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and renders users', async () => {
    vi.spyOn(adminApi, 'listUsers').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleUser],
    })
    vi.spyOn(adminApi, 'listRoles').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleRole],
    })

    render(<UsersPage />)

    expect(screen.getByText('Loading users...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })

    expect(screen.getByText('System Administrator')).toBeInTheDocument()
  })

  it('opens create user modal and submits form', async () => {
    vi.spyOn(adminApi, 'listUsers').mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    vi.spyOn(adminApi, 'listRoles').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleRole],
    })
    vi.spyOn(adminApi, 'createUser').mockResolvedValue(sampleUser)

    const user = userEvent.setup()
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('No users found.')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Create user' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Email'), 'new@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }))

    await waitFor(() => {
      expect(adminApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          roles: [],
        }),
      )
    })
  })

  it('toggles user activation from the table', async () => {
    vi.spyOn(adminApi, 'listUsers').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleUser],
    })
    vi.spyOn(adminApi, 'listRoles').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleRole],
    })
    vi.spyOn(adminApi, 'updateUser').mockResolvedValue({
      ...sampleUser,
      is_active: false,
    })

    const user = userEvent.setup()
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => {
      expect(adminApi.updateUser).toHaveBeenCalledWith(10, { is_active: false })
    })
  })
})
