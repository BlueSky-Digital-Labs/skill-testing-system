import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RulesBuilder } from './RulesBuilder'

describe('RulesBuilder', () => {
  it('switches assembly mode', async () => {
    const user = userEvent.setup()
    const onAssemblyModeChange = vi.fn()

    render(
      <RulesBuilder
        assemblyMode="manual"
        rules={[
          {
            subject: '',
            topic: '',
            difficulty: '',
            question_type: '',
            count: 1,
            order: 0,
          },
        ]}
        onAssemblyModeChange={onAssemblyModeChange}
        onRulesChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Rule-based selection' }))

    expect(onAssemblyModeChange).toHaveBeenCalledWith('rules')
  })

  it('renders rule fields in rules mode', () => {
    render(
      <RulesBuilder
        assemblyMode="rules"
        rules={[
          {
            subject: 'Math',
            topic: 'Algebra',
            difficulty: '',
            question_type: '',
            count: 2,
            order: 0,
          },
        ]}
        onAssemblyModeChange={vi.fn()}
        onRulesChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Subject')).toHaveValue('Math')
    expect(screen.getByLabelText('Question count')).toHaveValue(2)
  })
})
