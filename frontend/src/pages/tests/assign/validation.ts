export interface AssignFormValues {
  userIds: string
  groupIds: string
  opensAt: string
  dueAt: string
  closesAt: string
  maxAttempts: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
}

export interface AssignFormErrors {
  userIds?: string
  groupIds?: string
  opensAt?: string
  dueAt?: string
  closesAt?: string
  maxAttempts?: string
  form?: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseIdList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function validateAssignForm(values: AssignFormValues): AssignFormErrors {
  const errors: AssignFormErrors = {}
  const userIds = parseIdList(values.userIds)
  const groupIds = parseIdList(values.groupIds)

  if (userIds.length === 0 && groupIds.length === 0) {
    errors.form = 'Enter at least one user ID or group ID.'
  }

  const invalidUserIds = userIds.filter((id) => !UUID_PATTERN.test(id))
  if (invalidUserIds.length > 0) {
    errors.userIds = `Invalid user UUID(s): ${invalidUserIds.join(', ')}`
  }

  const invalidGroupIds = groupIds.filter((id) => !UUID_PATTERN.test(id))
  if (invalidGroupIds.length > 0) {
    errors.groupIds = `Invalid group UUID(s): ${invalidGroupIds.join(', ')}`
  }

  if (!values.opensAt) {
    errors.opensAt = 'Opens at is required.'
  }

  const opensAtDate = values.opensAt ? new Date(values.opensAt) : null
  const dueAtDate = values.dueAt ? new Date(values.dueAt) : null
  const closesAtDate = values.closesAt ? new Date(values.closesAt) : null

  if (opensAtDate && Number.isNaN(opensAtDate.getTime())) {
    errors.opensAt = 'Opens at must be a valid date.'
  }

  if (dueAtDate && Number.isNaN(dueAtDate.getTime())) {
    errors.dueAt = 'Due at must be a valid date.'
  }

  if (closesAtDate && Number.isNaN(closesAtDate.getTime())) {
    errors.closesAt = 'Closes at must be a valid date.'
  }

  if (opensAtDate && dueAtDate && dueAtDate < opensAtDate) {
    errors.dueAt = 'Due at must be on or after opens at.'
  }

  if (dueAtDate && closesAtDate && closesAtDate < dueAtDate) {
    errors.closesAt = 'Closes at must be on or after due at.'
  }

  if (opensAtDate && closesAtDate && closesAtDate < opensAtDate) {
    errors.closesAt = 'Closes at must be on or after opens at.'
  }

  if (!Number.isFinite(values.maxAttempts) || values.maxAttempts < 1) {
    errors.maxAttempts = 'Max attempts must be at least 1.'
  }

  return errors
}

export function parseAssigneeIds(value: string): string[] {
  return parseIdList(value)
}
