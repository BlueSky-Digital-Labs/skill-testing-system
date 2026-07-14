import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { useToast } from '@components/Toast'
import {
  ActionsBar,
  AutoRefreshInterval,
  GroupBreakdownTable,
  StatusSummary,
} from '@components/monitoring'
import {
  getMonitoringErrorMessage,
  getTestStatus,
  sendReminders,
} from '@/api/monitoring'
import type { StatusDto } from '@/api/monitoring.types'
import { useCoordinatorAccess } from '@hooks/useCoordinatorAccess'
import { useSystemAdminAccess } from '@hooks/useSystemAdminAccess'
import { useAuth } from '@hooks/useAuth'
import '../admin/admin.css'
import './monitoring.css'

const TEST_ID_STORAGE_KEY = 'monitoring:last-test-id'

export function MonitoringDashboardPage() {
  const { testId: routeTestId } = useParams<{ testId?: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { isAuthenticated } = useAuth()
  const { isCoordinator, isChecking: isCheckingCoordinator } = useCoordinatorAccess()
  const { isSystemAdmin, isChecking: isCheckingAdmin } = useSystemAdminAccess()

  const [selectedTest, setSelectedTest] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<AutoRefreshInterval>(0)
  const [onlyNonStarters, setOnlyNonStarters] = useState(false)
  const [onlyNonCompleters, setOnlyNonCompleters] = useState(true)
  const [status, setStatus] = useState<StatusDto | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSendingReminders, setIsSendingReminders] = useState(false)
  const [isSendingGroupId, setIsSendingGroupId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeTestId = routeTestId?.trim() || selectedTest.trim()
  const canAccess = isCoordinator || isSystemAdmin
  const isCheckingAccess = isCheckingCoordinator || isCheckingAdmin

  useEffect(() => {
    if (routeTestId?.trim()) {
      setSelectedTest(routeTestId.trim())
      sessionStorage.setItem(TEST_ID_STORAGE_KEY, routeTestId.trim())
      return
    }

    const stored = sessionStorage.getItem(TEST_ID_STORAGE_KEY)
    if (stored) {
      setSelectedTest(stored)
    }
  }, [routeTestId])

  const loadStatus = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!activeTestId) {
        setStatus(null)
        setError('Select a test to view monitoring status.')
        return
      }

      if (options?.silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      try {
        const response = await getTestStatus(activeTestId, {
          groupId: groupFilter || undefined,
          includeGroups: true,
        })
        setStatus(response)
      } catch (loadError) {
        setStatus(null)
        setError(getMonitoringErrorMessage(loadError, 'Unable to load monitoring status.'))
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [activeTestId, groupFilter],
  )

  useEffect(() => {
    if (!canAccess || !activeTestId) {
      return
    }
    void loadStatus()
  }, [activeTestId, canAccess, groupFilter, loadStatus])

  useEffect(() => {
    if (!canAccess || !activeTestId || autoRefreshInterval === 0) {
      return
    }

    const timer = window.setInterval(() => {
      void loadStatus({ silent: true })
    }, autoRefreshInterval * 1000)

    return () => window.clearInterval(timer)
  }, [activeTestId, autoRefreshInterval, canAccess, loadStatus])

  const groupOptions = useMemo(() => {
    if (!status) {
      return []
    }
    return status.group_breakdown
  }, [status])

  const handleApplyTest = () => {
    const trimmed = selectedTest.trim()
    if (!trimmed) {
      setError('Enter a test ID to continue.')
      return
    }

    sessionStorage.setItem(TEST_ID_STORAGE_KEY, trimmed)
    navigate(`/monitoring/${encodeURIComponent(trimmed)}`)
  }

  const handleSendReminders = async (groupId?: string) => {
    if (!activeTestId) {
      showToast('Select a test before sending reminders.', 'error')
      return
    }

    if (groupId) {
      setIsSendingGroupId(groupId)
    } else {
      setIsSendingReminders(true)
    }

    try {
      const result = await sendReminders(activeTestId, {
        group_id: groupId,
        only_non_starters: onlyNonStarters,
        only_non_completers: onlyNonCompleters,
      })
      showToast(
        `Sent ${result.sent} of ${result.recipients} reminder(s).`,
        result.sent > 0 ? 'success' : 'info',
      )
      await loadStatus({ silent: true })
    } catch (sendError) {
      showToast(
        getMonitoringErrorMessage(sendError, 'Unable to send reminders.'),
        'error',
      )
    } finally {
      setIsSendingGroupId(null)
      setIsSendingReminders(false)
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isCheckingAccess) {
    return <div className="admin-route-loading">Checking access...</div>
  }

  if (!canAccess) {
    return <Navigate to="/dashboard?access=denied" replace />
  }

  return (
    <DashboardLayout>
      <section className="admin-page monitoring-page">
        <header className="admin-page__header">
          <div>
            <h1>Monitoring dashboard</h1>
            <p>
              Track invite delivery status and send reminder emails for a test.
            </p>
          </div>
        </header>

        {!routeTestId ? (
          <div className="monitoring-test-picker">
            <label htmlFor="monitoring-test-id">
              Test ID
              <input
                id="monitoring-test-id"
                value={selectedTest}
                onChange={(event) => setSelectedTest(event.target.value)}
                placeholder="Enter test UUID"
              />
            </label>
            <Button onClick={handleApplyTest}>Open monitoring</Button>
          </div>
        ) : (
          <p className="monitoring-meta">
            Monitoring test <code>{activeTestId}</code>
          </p>
        )}

        {activeTestId ? (
          <>
            <div className="admin-page__toolbar">
              <label htmlFor="monitoring-group-filter">
                Group filter
                <select
                  id="monitoring-group-filter"
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
                >
                  <option value="">All groups</option>
                  {groupOptions.map((group) => (
                    <option key={group.group_id} value={group.group_id}>
                      {group.group_name || group.group_id}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <ActionsBar
              onlyNonStarters={onlyNonStarters}
              onlyNonCompleters={onlyNonCompleters}
              autoRefreshInterval={autoRefreshInterval}
              isRefreshing={isRefreshing}
              isSendingReminders={isSendingReminders}
              onOnlyNonStartersChange={(value) => {
                setOnlyNonStarters(value)
                if (value) {
                  setOnlyNonCompleters(false)
                }
              }}
              onOnlyNonCompletersChange={(value) => {
                setOnlyNonCompleters(value)
                if (value) {
                  setOnlyNonStarters(false)
                }
              }}
              onAutoRefreshIntervalChange={setAutoRefreshInterval}
              onRefresh={() => void loadStatus({ silent: true })}
              onSendReminders={() => void handleSendReminders()}
            />
          </>
        ) : null}

        {error ? (
          <div className="monitoring-alert monitoring-alert--error" role="alert">
            {error}
          </div>
        ) : null}

        {isLoading ? <p className="monitoring-loading">Loading monitoring status...</p> : null}

        {status ? (
          <>
            <StatusSummary status={status} />
            <GroupBreakdownTable
              groups={status.group_breakdown}
              isSendingGroupId={isSendingGroupId}
              onSendGroupReminders={(groupId) => void handleSendReminders(groupId)}
            />
          </>
        ) : null}
      </section>
    </DashboardLayout>
  )
}
