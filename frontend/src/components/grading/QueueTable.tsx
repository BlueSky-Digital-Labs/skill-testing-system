import { Link } from 'react-router-dom'
import { displayCandidateName, type QueueItem } from '@/api/grading'

interface QueueTableProps {
  items: QueueItem[]
  isLoading?: boolean
}

export const QueueTable = ({ items, isLoading = false }: QueueTableProps) => {
  if (isLoading) {
    return <div className="grading-panel">Loading grading queue...</div>
  }

  if (items.length === 0) {
    return <div className="grading-panel">No grading items found.</div>
  }

  return (
    <div className="grading-panel grading-table-wrapper">
      <table className="grading-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Topic</th>
            <th>Question</th>
            <th>Max Points</th>
            <th>Status</th>
            <th>Queued</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{displayCandidateName(item)}</td>
              <td>{item.topic}</td>
              <td>{item.question_id}</td>
              <td>{item.max_points}</td>
              <td>{item.status}</td>
              <td>{new Date(item.created_at).toLocaleString()}</td>
              <td>
                <Link
                  to={`/grading/${item.id}`}
                  state={{ queueItem: item }}
                  className="grading-table__link"
                >
                  Grade
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
