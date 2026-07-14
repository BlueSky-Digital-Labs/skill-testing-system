import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@components/atoms/Button'

interface PreviewLauncherProps {
  testId: string
  hasUnsavedChanges?: boolean
}

export function PreviewLauncher({
  testId,
  hasUnsavedChanges = false,
}: PreviewLauncherProps) {
  const navigate = useNavigate()
  const previewPath = `/tests/${testId}/preview`

  const handleClick = () => {
    if (
      hasUnsavedChanges &&
      !window.confirm(
        'You have unsaved changes on this test. Leave and start preview anyway?',
      )
    ) {
      return
    }

    navigate(previewPath)
  }

  if (hasUnsavedChanges) {
    return (
      <Button type="button" variant="secondary" onClick={handleClick}>
        Preview test
      </Button>
    )
  }

  return (
    <Link to={previewPath}>
      <Button type="button" variant="secondary">
        Preview test
      </Button>
    </Link>
  )
}
