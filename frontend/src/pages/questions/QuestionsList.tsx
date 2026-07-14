import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { useToast } from '@components/Toast'
import {
  ApiError,
  deleteQuestion,
  listQuestions,
} from '@/api/questionBank'
import type { Question } from '@/types/questionBank'
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  type Difficulty,
  type QuestionType,
} from '@/types/questionBank'
import '../admin/admin.css'
import './questions.css'

const PAGE_SIZE = 20

function matchesSearch(question: Question, query: string): boolean {
  if (!query) {
    return true
  }

  const normalized = query.toLowerCase()
  return (
    question.text.toLowerCase().includes(normalized) ||
    question.subject.toLowerCase().includes(normalized) ||
    question.topic.toLowerCase().includes(normalized)
  )
}

export function QuestionsList() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [questions, setQuestions] = useState<Question[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [appliedSubjectFilter, setAppliedSubjectFilter] = useState('')
  const [appliedTopicFilter, setAppliedTopicFilter] = useState('')
  const [appliedDifficultyFilter, setAppliedDifficultyFilter] = useState('')
  const [appliedTypeFilter, setAppliedTypeFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadQuestions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await listQuestions({
        page,
        subject: appliedSubjectFilter || undefined,
        topic: appliedTopicFilter || undefined,
        difficulty: (appliedDifficultyFilter || undefined) as Difficulty | undefined,
        type: (appliedTypeFilter || undefined) as QuestionType | undefined,
      })
      setQuestions(response.results)
      setTotalCount(response.count)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load questions.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [
    appliedDifficultyFilter,
    appliedSubjectFilter,
    appliedTopicFilter,
    appliedTypeFilter,
    page,
  ])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  const filteredQuestions = useMemo(
    () => questions.filter((question) => matchesSearch(question, appliedQuery)),
    [appliedQuery, questions],
  )

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedQuery(searchQuery.trim())
    setPage(1)
  }

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedSubjectFilter(subjectFilter.trim())
    setAppliedTopicFilter(topicFilter.trim())
    setAppliedDifficultyFilter(difficultyFilter)
    setAppliedTypeFilter(typeFilter)
    setPage(1)
  }

  const handleDeleteQuestion = async (question: Question) => {
    const confirmed = window.confirm(
      `Delete this ${QUESTION_TYPE_LABELS[question.type].toLowerCase()} question? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }

    try {
      await deleteQuestion(question.id)
      showToast('Question deleted successfully.', 'success')
      await loadQuestions()
    } catch (deleteError) {
      const message =
        deleteError instanceof ApiError
          ? deleteError.message
          : 'Unable to delete question.'
      showToast(message, 'error')
    }
  }

  return (
    <DashboardLayout>
      <section className="admin-page questions-page">
        <header className="admin-page__header">
          <div>
            <h1>Question bank</h1>
            <p>Create and manage exam questions for your assessments.</p>
          </div>
          <Button onClick={() => navigate('/questions/new')}>New question</Button>
        </header>

        <form className="admin-page__toolbar questions-page__filters" onSubmit={handleFilterSubmit}>
          <label>
            Subject
            <input
              type="text"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              placeholder="Filter by subject"
            />
          </label>
          <label>
            Topic
            <input
              type="text"
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
              placeholder="Filter by topic"
            />
          </label>
          <label>
            Difficulty
            <select
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value)}
            >
              <option value="">All</option>
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">All</option>
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
        </form>

        <form className="admin-page__toolbar" onSubmit={handleSearchSubmit}>
          <label>
            Search
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search question text on this page"
            />
          </label>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        {error ? (
          <p className="questions-page__status questions-page__status--error" role="alert">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <p className="questions-page__status questions-page__status--info">
            Loading questions...
          </p>
        ) : filteredQuestions.length === 0 ? (
          <p className="questions-page__empty">
            {appliedQuery || appliedSubjectFilter || appliedTopicFilter || appliedDifficultyFilter || appliedTypeFilter
              ? 'No questions match your filters on this page.'
              : 'No questions yet. Create your first question to get started.'}
          </p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Topic</th>
                  <th>Difficulty</th>
                  <th>Type</th>
                  <th>Points</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((question) => (
                  <tr key={question.id}>
                    <td>{question.subject}</td>
                    <td>{question.topic}</td>
                    <td>{DIFFICULTY_LABELS[question.difficulty]}</td>
                    <td>{QUESTION_TYPE_LABELS[question.type]}</td>
                    <td>{question.points}</td>
                    <td>{new Date(question.updated_at).toLocaleString()}</td>
                    <td>
                      <div className="admin-table__actions">
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/questions/${question.id}/edit`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => void handleDeleteQuestion(question)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-page__pagination">
          <span>
            Page {page} of {totalPages} ({totalCount} total)
          </span>
          <div className="admin-table__actions">
            <Button
              variant="secondary"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
    </DashboardLayout>
  )
}
