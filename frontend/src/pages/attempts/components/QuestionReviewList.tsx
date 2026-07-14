import type { AttemptReviewItem, DisclosureMode } from '../api'

interface QuestionReviewListProps {
  items: AttemptReviewItem[]
  disclosure: DisclosureMode
}

export function QuestionReviewList({ items, disclosure }: QuestionReviewListProps) {
  const showCorrectness = disclosure === 'score_and_feedback'
  const showFeedback = disclosure === 'score_and_feedback'

  return (
    <section className="attempt-completion__panel" aria-label="Question review">
      <h2 className="attempt-completion__panel-title">Question Review</h2>
      <div className="attempt-completion__table-wrapper">
        <table className="attempt-completion__table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Type</th>
              <th>Awarded</th>
              <th>Max</th>
              {showCorrectness && <th>Correct</th>}
              {showFeedback && <th>Feedback</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.question_id}>
                <td>{item.question_id}</td>
                <td>{item.question_type}</td>
                <td>{item.awarded_points ?? '—'}</td>
                <td>{item.max_points}</td>
                {showCorrectness && (
                  <td>
                    {item.is_correct === null ? (
                      '—'
                    ) : (
                      <span
                        className={`attempt-completion__correctness ${
                          item.is_correct
                            ? 'attempt-completion__correctness--correct'
                            : 'attempt-completion__correctness--incorrect'
                        }`}
                      >
                        {item.is_correct ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </td>
                )}
                {showFeedback && (
                  <td>{item.feedback?.trim() ? item.feedback : '—'}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
