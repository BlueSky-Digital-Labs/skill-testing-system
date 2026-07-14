import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TestDetailPage } from './TestDetailPage'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('TestDetailPage', () => {
  it('shows placeholder when no questions are provided', () => {
    render(
      <MemoryRouter>
        <TestDetailPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText(/Test question details will appear here once the backend exposes/i),
    ).toBeInTheDocument()
  })

  it('renders version badges for questions with version numbers', () => {
    render(
      <MemoryRouter>
        <TestDetailPage
          testTitle="Algebra quiz"
          questions={[
            {
              id: 'q-1',
              subject: 'Math',
              topic: 'Algebra',
              text: 'What is 2 + 2?',
              points: 2,
              versionNumber: 3,
            },
            {
              id: 'q-2',
              subject: 'Math',
              topic: 'Geometry',
              text: 'Define a triangle.',
              points: 1,
              versionNumber: null,
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Version 3')).toHaveTextContent('v3')
    expect(screen.getAllByText('—')).toHaveLength(1)
    expect(screen.getByText('Algebra quiz')).toBeInTheDocument()
  })
})
