import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { QueueTable } from '@components/grading/QueueTable'
import { ApiError } from '@/api/auth'
import { listQueue, type QueueItem } from '@/api/grading'
import './GradingPages.css'

const PAGE_SIZE = 10

export const GradingList = () => {
  const [items, setItems] = useState<QueueItem[]>([])
  const [statusFilter, setStatusFilter] = useState<'queued' | 'graded'>('queued')
  const [testIdFilter, setTestIdFilter] = useState('')
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadQueue = useCallback(async (activeCursor?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await listQueue({
        status: statusFilter,
        testId: testIdFilter || undefined,
        limit: PAGE_SIZE,
        cursor: activeCursor,
      })

      setItems(response.results)
      setTotalCount(response.count)
      setNextCursor(response.next_cursor ?? null)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load grading queue.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, testIdFilter])

  useEffect(() => {
    setCursor(undefined)
    setCursorHistory([])
    void loadQueue(undefined)
  }, [loadQueue])

  const handleApplyFilters = () => {
    setCursor(undefined)
    setCursorHistory([])
    void loadQueue(undefined)
  }

  const handleNextPage = () => {
    if (!nextCursor) {
      return
    }

    setCursorHistory((history) => [...history, cursor ?? '0'])
    setCursor(nextCursor)
    void loadQueue(nextCursor)
  }

  const handlePreviousPage = () => {
    if (cursorHistory.length === 0) {
      return
    }

    const previousCursor = cursorHistory[cursorHistory.length - 1]
    setCursorHistory((history) => history.slice(0, -1))
    setCursor(previousCursor === '0' ? undefined : previousCursor)
    void loadQueue(previousCursor === '0' ? undefined : previousCursor)
  }

  return (
    <DashboardLayout>
      <div className="grading-page">
        <div className="grading-page__header">
          <div>
            <h1>Grading Workspace</h1>
            <p>Review queued free-text responses and open a grading workspace.</p>
          </div>
        </div>

        {error && (
          <div className="grading-alert grading-alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="grading-filters">
          <label>
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'queued' | 'graded')}
            >
              <option value="queued">Queued</option>
              <option value="graded">Graded</option>
            </select>
          </label>

          <label>
            Test ID
            <input
              type="text"
              value={testIdFilter}
              onChange={(event) => setTestIdFilter(event.target.value)}
              placeholder="Filter by test ID"
            />
          </label>

          <div className="grading-filters__actions">
            <Button type="button" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>

        <QueueTable items={items} isLoading={isLoading} />

        <div className="grading-pagination">
          <span className="grading-pagination__meta">
            Showing {items.length} of {totalCount} items
          </span>
          <div className="grading-pagination__buttons">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviousPage}
              disabled={cursorHistory.length === 0 || isLoading}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleNextPage}
              disabled={!nextCursor || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
