import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PreviewFooter } from '../PreviewFooter'

describe('PreviewFooter', () => {
  it('calls validate and finish handlers', async () => {
    const user = userEvent.setup()
    const onValidate = vi.fn()
    const onFinish = vi.fn()

    render(
      <PreviewFooter
        canFinish
        isFinishing={false}
        isValidating={false}
        onValidate={onValidate}
        onFinish={onFinish}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Validate current answer' }))
    await user.click(screen.getByRole('button', { name: 'Finish preview session' }))

    expect(onValidate).toHaveBeenCalled()
    expect(onFinish).toHaveBeenCalled()
  })
})
