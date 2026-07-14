import { useState } from 'react'

interface CopyToClipboardProps {
  value: string
  label?: string
  className?: string
}

export const CopyToClipboard = ({
  value,
  label = 'Copy',
  className = '',
}: CopyToClipboardProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      className={`audit-copy-btn ${className}`.trim()}
      onClick={() => void handleCopy()}
      aria-label={`${label}: ${value}`}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}
