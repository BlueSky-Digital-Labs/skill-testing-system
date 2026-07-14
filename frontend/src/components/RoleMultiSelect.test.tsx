import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoleMultiSelect } from './RoleMultiSelect'

const roles = [
  {
    id: 1,
    key: 'SYSTEM_ADMIN',
    name: 'System Administrator',
    description: 'Admin',
    is_active: true,
  },
  {
    id: 2,
    key: 'CANDIDATE',
    name: 'Candidate',
    description: 'Takes exams',
    is_active: true,
  },
  {
    id: 3,
    key: 'INACTIVE_ROLE',
    name: 'Inactive',
    description: 'Inactive role',
    is_active: false,
  },
]

describe('RoleMultiSelect', () => {
  it('renders active roles and toggles selection', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <RoleMultiSelect
        roles={roles}
        selectedKeys={['SYSTEM_ADMIN']}
        onChange={onChange}
      />,
    )

    expect(screen.getByText('System Administrator')).toBeInTheDocument()
    expect(screen.getByText('Candidate')).toBeInTheDocument()
    expect(screen.queryByText('Inactive')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/Candidate/i))

    expect(onChange).toHaveBeenCalledWith(['SYSTEM_ADMIN', 'CANDIDATE'])
  })

  it('shows validation error when provided', () => {
    render(
      <RoleMultiSelect
        roles={roles}
        selectedKeys={[]}
        onChange={() => undefined}
        error="Select at least one role."
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one role.')
  })
})
