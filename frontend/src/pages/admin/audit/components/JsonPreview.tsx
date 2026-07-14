interface JsonPreviewProps {
  value: unknown
  className?: string
}

export const JsonPreview = ({ value, className = '' }: JsonPreviewProps) => {
  const formatted = JSON.stringify(value, null, 2)

  return (
    <pre className={`audit-json-preview ${className}`.trim()} tabIndex={0}>
      {formatted}
    </pre>
  )
}
