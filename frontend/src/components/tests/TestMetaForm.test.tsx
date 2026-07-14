import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestMetaForm } from './TestMetaForm'

describe('TestMetaForm', () => {
  const onChange = vi.fn()

  beforeEach(() => {
    onChange.mockReset()
  })

  it('renders test meta fields', () => {
    render(
      <TestMetaForm
        value={{ title: 'Algebra', description: 'Quiz', topicTags: 'math' }}
        onChange={onChange}
      />,
    )

    expect(screen.getByLabelText('Test name')).toHaveValue('Algebra')
    expect(screen.getByLabelText('Description')).toHaveValue('Quiz')
    expect(screen.getByLabelText('Topic tags')).toHaveValue('math')
  })

  it('calls onChange when the title changes', async () => {
    const user = userEvent.setup()

    render(
      <TestMetaForm
        value={{ title: '', description: '', topicTags: '' }}
        onChange={onChange}
      />,
    )

    await user.type(screen.getByLabelText('Test name'), 'New test')

    expect(onChange).toHaveBeenCalled()
  })

  it('shows validation errors', () => {
    render(
      <TestMetaForm
        value={{ title: '', description: '', topicTags: '' }}
        errors={{ title: 'Test name is required.' }}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Test name is required.')
  })
})
