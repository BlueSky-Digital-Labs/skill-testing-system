import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonPreview } from './JsonPreview'

describe('JsonPreview', () => {
  it('renders formatted JSON', () => {
    render(<JsonPreview value={{ action: 'CREATE', count: 2 }} />)

    expect(screen.getByText(/"action": "CREATE"/)).toBeInTheDocument()
    expect(screen.getByText(/"count": 2/)).toBeInTheDocument()
  })
})

describe('CopyToClipboard', () => {
  it('copies value to clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    })

    const { CopyToClipboard } = await import('./CopyToClipboard')
    render(<CopyToClipboard value="hash-value" label="Copy hash" />)

    await user.click(screen.getByRole('button', { name: 'Copy hash: hash-value' }))
    expect(writeText).toHaveBeenCalledWith('hash-value')
    expect(screen.getByText('Copied')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })
})
