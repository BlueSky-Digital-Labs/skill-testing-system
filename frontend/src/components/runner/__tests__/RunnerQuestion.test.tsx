import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RunnerQuestion } from '../RunnerQuestion'

const baseQuestion = {
  id: 'q-1',
  type: 'MCQ' as const,
  text: 'Pick one option',
  points: 1,
  version: 1,
  options: [
    { id: 'opt-2', label: 'B', value: 'Beta', is_correct: true, order: 1 },
    { id: 'opt-1', label: 'A', value: 'Alpha', is_correct: false, order: 0 },
  ],
}

describe('RunnerQuestion', () => {
  it('renders options in server-provided order', () => {
    render(
      <RunnerQuestion
        question={baseQuestion}
        optionOrder={['opt-2', 'opt-1']}
        value={{}}
        onChange={vi.fn()}
      />,
    )

    const labels = screen.getAllByText(/Alpha|Beta/).map((node) => node.textContent)
    expect(labels).toEqual(['Beta', 'Alpha'])
  })

  it('emits answer changes for MCQ selections', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RunnerQuestion
        question={baseQuestion}
        optionOrder={['opt-1', 'opt-2']}
        value={{}}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByLabelText('Beta'))
    expect(onChange).toHaveBeenCalledWith({ selected_option: 'B' })
  })
})
