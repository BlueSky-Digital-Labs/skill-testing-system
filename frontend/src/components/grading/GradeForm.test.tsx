import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GradeForm } from './GradeForm'

describe('GradeForm', () => {
  afterEach(() => {
    cleanup()
  })
  it('submits awarded points and feedback', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()

    render(<GradeForm maxPoints="10.00" onSubmit={handleSubmit} />)

    await user.type(screen.getByLabelText(/Awarded Points/i), '8.5')
    await user.type(screen.getByLabelText('Feedback'), 'Strong response')
    await user.click(screen.getByRole('button', { name: 'Submit Grade' }))

    expect(handleSubmit).toHaveBeenCalledWith({
      awardedPoints: '8.5',
      feedback: 'Strong response',
    })
  })

  it('validates awarded points against max points', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()

    render(<GradeForm maxPoints="5.00" onSubmit={handleSubmit} />)

    await user.type(screen.getByRole('spinbutton', { name: /Awarded Points/i }), '6')
    await user.click(screen.getByRole('button', { name: 'Submit Grade' }))

    expect(handleSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Awarded points cannot exceed 5.00.')
  })

  it('shows server-side error message', () => {
    render(
      <GradeForm
        maxPoints="10.00"
        onSubmit={vi.fn()}
        error="This response has already been graded."
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This response has already been graded.',
    )
  })
})
