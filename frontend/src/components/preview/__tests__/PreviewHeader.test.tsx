import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PreviewHeader } from '../PreviewHeader'

describe('PreviewHeader', () => {
  it('renders preview badge, title, and timer', () => {
    render(
      <PreviewHeader
        testTitle="Algebra quiz"
        remainingSeconds={125}
        validationMessage="Validated: 1.00 / 1.00 points"
        validationState="success"
      />,
    )

    expect(screen.getByText('Preview mode')).toBeInTheDocument()
    expect(screen.getByText('Algebra quiz')).toBeInTheDocument()
    expect(screen.getByLabelText('Time remaining 2:05')).toBeInTheDocument()
    expect(screen.getByText('Validated: 1.00 / 1.00 points')).toBeInTheDocument()
  })
})
