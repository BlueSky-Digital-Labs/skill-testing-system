import { Button } from '@components/atoms/Button'
import './monitoring.css'

export type AutoRefreshInterval = 0 | 15 | 30 | 60

interface ActionsBarProps {
  onlyNonStarters: boolean
  onlyNonCompleters: boolean
  autoRefreshInterval: AutoRefreshInterval
  isRefreshing: boolean
  isSendingReminders: boolean
  onOnlyNonStartersChange: (value: boolean) => void
  onOnlyNonCompletersChange: (value: boolean) => void
  onAutoRefreshIntervalChange: (value: AutoRefreshInterval) => void
  onRefresh: () => void
  onSendReminders: () => void
}

export function ActionsBar({
  onlyNonStarters,
  onlyNonCompleters,
  autoRefreshInterval,
  isRefreshing,
  isSendingReminders,
  onOnlyNonStartersChange,
  onOnlyNonCompletersChange,
  onAutoRefreshIntervalChange,
  onRefresh,
  onSendReminders,
}: ActionsBarProps) {
  return (
    <section className="monitoring-actions" aria-label="Monitoring actions">
      <div className="monitoring-actions__filters">
        <label>
          <input
            type="checkbox"
            checked={onlyNonStarters}
            onChange={(event) => onOnlyNonStartersChange(event.target.checked)}
          />
          Only non-starters
        </label>
        <label>
          <input
            type="checkbox"
            checked={onlyNonCompleters}
            onChange={(event) => onOnlyNonCompletersChange(event.target.checked)}
          />
          Only non-completers
        </label>
      </div>

      <div className="monitoring-actions__controls">
        <label htmlFor="monitoring-auto-refresh">
          Auto refresh
          <select
            id="monitoring-auto-refresh"
            value={autoRefreshInterval}
            onChange={(event) =>
              onAutoRefreshIntervalChange(Number(event.target.value) as AutoRefreshInterval)
            }
          >
            <option value={0}>Off</option>
            <option value={15}>Every 15s</option>
            <option value={30}>Every 30s</option>
            <option value={60}>Every 60s</option>
          </select>
        </label>

        <Button variant="outline" isLoading={isRefreshing} onClick={onRefresh}>
          Refresh
        </Button>
        <Button isLoading={isSendingReminders} onClick={onSendReminders}>
          Send reminders
        </Button>
      </div>
    </section>
  )
}
