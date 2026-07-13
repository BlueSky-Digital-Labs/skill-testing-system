import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueueTable } from './QueueTable'
import type { QueueItem } from '@/api/grading'

const items: QueueItem[] = [
  {
    id: 'queue-1',
    attempt_id: 'attempt-1',
    test_id: 'test-1',
    question_id: 'question-1',
    question_version: '1',
    candidate_display: 'Jane Candidate',
    blind_marking: false,
    response_text: 'Answer text',
    max_points: '10.00',
    topic: 'essay',
    status: 'queued',
    created_at: '2026-07-13T00:00:00.000Z',
    updated_at: '2026-07-13T00:00:00.000Z',
    manual_grade: null,
  },
  {
    id: 'queue-2',
    attempt_id: 'attempt-2',
    test_id: 'test-1',
    question_id: 'question-2',
    question_version: null,
    candidate_display: 'Hidden Candidate',
    blind_marking: true,
    response_text: 'Blind answer',
    max_points: '5.00',
    topic: 'analysis',
    status: 'queued',
    created_at: '2026-07-13T01:00:00.000Z',
    updated_at: '2026-07-13T01:00:00.000Z',
    manual_grade: null,
  },
]

describe('QueueTable', () => {
  it('renders queue rows and grade links', () => {
    render(
      <MemoryRouter>
        <QueueTable items={items} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Jane Candidate')).toBeInTheDocument()
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Grade' })).toHaveLength(2)
    expect(screen.getByText('essay')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<QueueTable items={[]} isLoading />)
    expect(screen.getByText('Loading grading queue...')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    render(<QueueTable items={[]} />)
    expect(screen.getByText('No grading items found.')).toBeInTheDocument()
  })
})
