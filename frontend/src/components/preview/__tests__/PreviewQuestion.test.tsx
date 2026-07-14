import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PreviewQuestion } from '../PreviewQuestion'

const mcqQuestion = {
  id: 'q-1',
  type: 'MCQ' as const,
  text: '2 + 2 = ?',
  points: 1,
  options: [
    { id: 'opt-1', label: 'A', value: '4', is_correct: true, order: 0 },
    { id: 'opt-2', label: 'B', value: '5', is_correct: false, order: 1 },
  ],
}

describe('PreviewQuestion', () => {
  it('renders MCQ options in provided order', () => {
    render(
      <PreviewQuestion
        question={mcqQuestion}
        optionOrder={['opt-2', 'opt-1']}
        value={{}}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('2 + 2 = ?')).toBeInTheDocument()
    expect(screen.getByLabelText('5')).toBeInTheDocument()
    expect(screen.getByLabelText('4')).toBeInTheDocument()
  })

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PreviewQuestion
        question={mcqQuestion}
        optionOrder={['opt-1', 'opt-2']}
        value={{}}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByLabelText('4'))
    expect(onChange).toHaveBeenCalledWith({ selected_option: 'A' })
  })
})
