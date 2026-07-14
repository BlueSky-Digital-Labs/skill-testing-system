interface QuestionVersionBadgeProps {
  versionNumber?: number | null
}

export function QuestionVersionBadge({ versionNumber }: QuestionVersionBadgeProps) {
  if (versionNumber == null || versionNumber < 1) {
    return null
  }

  return (
    <span className="question-version-badge" aria-label={`Version ${versionNumber}`}>
      v{versionNumber}
    </span>
  )
}
