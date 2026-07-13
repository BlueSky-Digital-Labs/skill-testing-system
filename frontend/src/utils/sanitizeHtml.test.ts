import { describe, expect, it } from 'vitest'
import { sanitizeHtmlForPreview } from './sanitizeHtml'

describe('sanitizeHtmlForPreview', () => {
  it('removes script tags and event handlers', () => {
    const input = '<p onclick="alert(1)">Hello</p><script>alert(1)</script>'
    expect(sanitizeHtmlForPreview(input)).toBe('<p>Hello</p>')
  })

  it('removes javascript urls', () => {
    const input = '<a href="javascript:alert(1)">Click</a>'
    expect(sanitizeHtmlForPreview(input)).toBe('<a>Click</a>')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeHtmlForPreview('')).toBe('')
  })
})
