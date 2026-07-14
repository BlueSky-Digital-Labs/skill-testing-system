import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RolesPage } from './RolesPage'
import * as adminApi from '@/api/admin'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const systemAdminRole = {
  id: 1,
  key: 'SYSTEM_ADMIN',
  name: 'System Administrator',
  description: 'Full platform administration',
  is_active: true,
}

const candidateRole = {
  id: 2,
  key: 'CANDIDATE',
  name: 'Candidate',
  description: 'Takes exams',
  is_active: true,
}

describe('RolesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and renders roles', async () => {
    vi.spyOn(adminApi, 'listRoles').mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [systemAdminRole, candidateRole],
    })

    render(<RolesPage />)

    expect(screen.getByText('Loading roles...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('SYSTEM_ADMIN')).toBeInTheDocument()
    })

    expect(screen.getByText('Candidate')).toBeInTheDocument()
  })

  it('prevents deactivating SYSTEM_ADMIN role in edit modal', async () => {
    vi.spyOn(adminApi, 'listRoles').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [systemAdminRole],
    })

    const user = userEvent.setup()
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getByText('SYSTEM_ADMIN')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const activeCheckbox = screen.getByRole('checkbox', { name: 'Active' })
    expect(activeCheckbox).toBeDisabled()
    expect(
      screen.getByText('The SYSTEM_ADMIN role cannot be deactivated.'),
    ).toBeInTheDocument()
  })

  it('creates a role from the modal', async () => {
    vi.spyOn(adminApi, 'listRoles').mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    vi.spyOn(adminApi, 'createRole').mockResolvedValue(candidateRole)

    const user = userEvent.setup()
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getByText('No roles found.')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Create role' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Key'), 'CANDIDATE')
    await user.type(within(dialog).getByLabelText('Name'), 'Candidate')
    await user.click(within(dialog).getByRole('button', { name: 'Create role' }))

    await waitFor(() => {
      expect(adminApi.createRole).toHaveBeenCalledWith({
        key: 'CANDIDATE',
        name: 'Candidate',
        description: undefined,
      })
    })
  })
})
