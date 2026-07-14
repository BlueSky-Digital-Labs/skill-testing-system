import { describe, expect, it } from 'vitest'
import { filterValidEmails, parseAndDedupeEmails } from './groupEmails'

describe('groupEmails utilities', () => {
  it('parses comma, semicolon, and newline separated emails', () => {
    const result = parseAndDedupeEmails(
      'one@example.com, two@example.com;\nthree@example.com',
    )

    expect(result).toEqual([
      'one@example.com',
      'two@example.com',
      'three@example.com',
    ])
  })

  it('deduplicates emails case-insensitively', () => {
    const result = parseAndDedupeEmails('A@Example.com\na@example.com')

    expect(result).toEqual(['a@example.com'])
  })

  it('filters valid and invalid email addresses', () => {
    const { valid, invalid } = filterValidEmails([
      'good@example.com',
      'not-an-email',
      'also-good@example.org',
    ])

    expect(valid).toEqual(['good@example.com', 'also-good@example.org'])
    expect(invalid).toEqual(['not-an-email'])
  })
})
