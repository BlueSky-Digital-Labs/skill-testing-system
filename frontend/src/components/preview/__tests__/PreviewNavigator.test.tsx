import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PreviewNavigator } from '../PreviewNavigator'
import { DEFAULT_PREVIEW_INTEGRITY } from '@/api/tests'

describe('PreviewNavigator', () => {
  it('renders question chips and prev/next controls', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()

    render(
      <PreviewNavigator
        questionIds={['q-1', 'q-2']}
        currentIndex={0}
        answeredQuestionIds={new Set(['q-1'])}
        integrity={DEFAULT_PREVIEW_INTEGRITY}
        onSelect={vi.fn()}
        onPrevious={vi.fn()}
        onNext={onNext}
      />,
    )

    expect(screen.getByLabelText('Go to question 1, answered')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next question' }))
    expect(onNext).toHaveBeenCalled()
  })
})
