import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultSummary } from './ResultSummary'
import type { CombinedResult } from '@/api/grading'

const sampleResult: CombinedResult = {
  id: 'result-1',
  attempt_id: 'attempt-1',
  test_id: 'test-1',
  total_awarded: '12.00',
  total_max: '15.00',
  by_topic: {
    essay: { awarded: '8.00', max: '10.00' },
    objective: { awarded: '4.00', max: '5.00' },
  },
  passed: true,
  created_at: '2026-07-13T00:00:00.000Z',
  updated_at: '2026-07-13T00:00:00.000Z',
}

describe('ResultSummary', () => {
  it('renders combined totals and topic breakdown', () => {
    render(<ResultSummary result={sampleResult} />)

    expect(screen.getByText('Combined Result')).toBeInTheDocument()
    expect(screen.getByText('Passed')).toBeInTheDocument()
    expect(screen.getByText('12.00')).toBeInTheDocument()
    expect(screen.getByText('15.00')).toBeInTheDocument()
    expect(screen.getByText('essay')).toBeInTheDocument()
    expect(screen.getByText('objective')).toBeInTheDocument()
  })

  it('renders empty state when result is missing', () => {
    render(<ResultSummary result={null} />)
    expect(screen.getByText('No combined result available yet.')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(<ResultSummary result={null} isLoading />)
    expect(screen.getByText('Loading combined result...')).toBeInTheDocument()
  })
})
