import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from './DataTable'

interface Row {
  name: string
  score: number
}

const rows: Row[] = [
  { name: 'Alpha', score: 10 },
  { name: 'Beta', score: 5 },
  { name: 'Gamma', score: 8 },
]

describe('DataTable', () => {
  it('renders rows and supports sorting', async () => {
    const user = userEvent.setup()

    render(
      <DataTable
        columns={[
          { key: 'name', label: 'Name', sortable: true },
          { key: 'score', label: 'Score', sortable: true },
        ]}
        rows={rows}
        rowKey={(row) => row.name}
        pageSize={2}
      />,
    )

    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Score' }))
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Beta')
  })
})
