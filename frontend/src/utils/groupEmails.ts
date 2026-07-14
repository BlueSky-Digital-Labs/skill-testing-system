const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseAndDedupeEmails(input: string): string[] {
  const parts = input.split(/[\n,;]+/)
  const seen = new Set<string>()
  const emails: string[] = []

  for (const part of parts) {
    const email = part.trim().toLowerCase()
    if (!email || seen.has(email)) {
      continue
    }
    seen.add(email)
    emails.push(email)
  }

  return emails
}

export function filterValidEmails(emails: string[]): {
  valid: string[]
  invalid: string[]
} {
  const valid: string[] = []
  const invalid: string[] = []

  for (const email of emails) {
    if (EMAIL_PATTERN.test(email)) {
      valid.push(email)
    } else {
      invalid.push(email)
    }
  }

  return { valid, invalid }
}
