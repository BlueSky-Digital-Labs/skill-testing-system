import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Filters } from './Filters'
import { defaultAuditFilters } from '../constants'

describe('Filters', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders labeled filter inputs', () => {
    render(
      <Filters
        values={defaultAuditFilters}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Actor')).toBeInTheDocument()
    expect(screen.getByLabelText('Action')).toBeInTheDocument()
    expect(screen.getByLabelText('Entity Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Entity ID')).toBeInTheDocument()
    expect(screen.getByLabelText('From')).toBeInTheDocument()
    expect(screen.getByLabelText('To')).toBeInTheDocument()
  })

  it('debounces filter changes', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()

    render(
      <Filters
        values={defaultAuditFilters}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('e.g. CREATE'), {
      target: { value: 'CREATE' },
    })

    expect(onChange).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onChange).toHaveBeenCalledWith({
      ...defaultAuditFilters,
      action: 'CREATE',
    })
  })

  it('resets filters immediately', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()

    render(
      <Filters
        values={{ ...defaultAuditFilters, action: 'DELETE' }}
        onChange={vi.fn()}
        onReset={onReset}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalled()
  })
})
