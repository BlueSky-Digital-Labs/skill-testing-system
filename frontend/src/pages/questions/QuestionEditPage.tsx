import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { useToast } from '@components/Toast'
import {
  ApiError,
  createQuestion,
  getQuestion,
  updateQuestion,
  uploadQuestionImage,
} from '@/api/questionBank'
import type {
  BlankAnswerKey,
  Question,
  QuestionOption,
  QuestionType,
  QuestionVersionSummary,
} from '@/types/questionBank'
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
} from '@/types/questionBank'
import {
  createDefaultOptions,
  createEmptyFormState,
  isQuestionFormValid,
  toWritePayload,
  validateImageFile,
  validateQuestionForm,
  type QuestionFormState,
} from '@/utils/questionBank'
import { SaveVersionConfirmModal } from './components/SaveVersionConfirmModal'
import { VersionHistorySection } from './components/VersionHistorySection'
import '../admin/admin.css'
import './questions.css'

function questionToFormState(question: Question): QuestionFormState {
  return {
    subject: question.subject,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    text: question.text,
    points: question.points,
    options: question.options.map((option, index) => ({
      ...option,
      order: option.order ?? index,
    })),
    blank_answer_keys: question.blank_answer_keys.length
      ? question.blank_answer_keys
      : [{ answer: '', case_sensitive: false }],
  }
}

function OptionEditor({
  options,
  type,
  onChange,
  error,
}: {
  options: QuestionOption[]
  type: QuestionType
  onChange: (options: QuestionOption[]) => void
  error?: string
}) {
  const isSingleCorrect = type === 'MCQ' || type === 'TRUE_FALSE'

  const updateOption = (index: number, patch: Partial<QuestionOption>) => {
    const next = options.map((option, optionIndex) => {
      if (optionIndex !== index) {
        if (isSingleCorrect && patch.is_correct) {
          return { ...option, is_correct: false }
        }
        return option
      }
      return { ...option, ...patch }
    })
    onChange(next)
  }

  const addOption = () => {
    const label = String.fromCharCode(65 + options.length)
    onChange([
      ...options,
      {
        label,
        value: '',
        is_correct: false,
        order: options.length,
      },
    ])
  }

  const removeOption = (index: number) => {
    onChange(
      options
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, optionIndex) => ({
          ...option,
          label: String.fromCharCode(65 + optionIndex),
          order: optionIndex,
        })),
    )
  }

  return (
    <fieldset className="questions-editor__fieldset">
      <legend>Answer options</legend>
      {error ? (
        <p className="questions-editor__field-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="questions-editor__options">
        {options.map((option, index) => (
          <div key={`${option.label}-${index}`} className="questions-editor__option-row">
            <label>
              Label
              <input
                type="text"
                value={option.label}
                onChange={(event) => updateOption(index, { label: event.target.value })}
                disabled={type === 'TRUE_FALSE'}
              />
            </label>
            <label className="questions-editor__option-value">
              Value
              <input
                type="text"
                value={option.value}
                onChange={(event) => updateOption(index, { value: event.target.value })}
                disabled={type === 'TRUE_FALSE'}
              />
            </label>
            <label className="questions-editor__checkbox">
              <input
                type={isSingleCorrect ? 'radio' : 'checkbox'}
                name="correct-option"
                checked={option.is_correct}
                onChange={() => updateOption(index, { is_correct: true })}
              />
              Correct
            </label>
            {type !== 'TRUE_FALSE' ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => removeOption(index)}
                disabled={options.length <= 2}
              >
                Remove
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      {type !== 'TRUE_FALSE' ? (
        <Button type="button" variant="secondary" onClick={addOption}>
          Add option
        </Button>
      ) : null}
    </fieldset>
  )
}

function BlankAnswerEditor({
  blankAnswerKeys,
  onChange,
  error,
}: {
  blankAnswerKeys: BlankAnswerKey[]
  onChange: (keys: BlankAnswerKey[]) => void
  error?: string
}) {
  const updateKey = (index: number, patch: Partial<BlankAnswerKey>) => {
    onChange(
      blankAnswerKeys.map((key, keyIndex) =>
        keyIndex === index ? { ...key, ...patch } : key,
      ),
    )
  }

  const addKey = () => {
    onChange([...blankAnswerKeys, { answer: '', case_sensitive: false }])
  }

  const removeKey = (index: number) => {
    onChange(blankAnswerKeys.filter((_, keyIndex) => keyIndex !== index))
  }

  return (
    <fieldset className="questions-editor__fieldset">
      <legend>Accepted answers</legend>
      {error ? (
        <p className="questions-editor__field-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="questions-editor__options">
        {blankAnswerKeys.map((key, index) => (
          <div key={`blank-${index}`} className="questions-editor__option-row">
            <label className="questions-editor__option-value">
              Answer
              <input
                type="text"
                value={key.answer}
                onChange={(event) => updateKey(index, { answer: event.target.value })}
              />
            </label>
            <label className="questions-editor__checkbox">
              <input
                type="checkbox"
                checked={key.case_sensitive}
                onChange={(event) =>
                  updateKey(index, { case_sensitive: event.target.checked })
                }
              />
              Case sensitive
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={() => removeKey(index)}
              disabled={blankAnswerKeys.length <= 1}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" onClick={addKey}>
        Add accepted answer
      </Button>
    </fieldset>
  )
}

export function QuestionEditPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [form, setForm] = useState<QuestionFormState>(createEmptyFormState())
  const [initialSnapshot, setInitialSnapshot] = useState(
    JSON.stringify(createEmptyFormState()),
  )
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [latestVersionNumber, setLatestVersionNumber] = useState<number | null>(null)
  const [versionHistory, setVersionHistory] = useState<
    QuestionVersionSummary[] | undefined
  >(undefined)
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false)

  const showVersionWarning =
    isEditMode && latestVersionNumber != null && latestVersionNumber >= 1

  const isDirty = useMemo(
    () => JSON.stringify(form) !== initialSnapshot || imageFile !== null,
    [form, imageFile, initialSnapshot],
  )

  const blocker = useBlocker(isDirty && !isSaving)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm(
        'You have unsaved changes. Leave this page anyway?',
      )
      if (confirmed) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty && !isSaving) {
        event.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, isSaving])

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(existingImageUrl)
      return
    }

    const objectUrl = URL.createObjectURL(imageFile)
    setImagePreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [existingImageUrl, imageFile])

  const applyLoadedQuestion = useCallback((question: Question) => {
    const nextForm = questionToFormState(question)
    setForm(nextForm)
    setInitialSnapshot(JSON.stringify(nextForm))
    setExistingImageUrl(question.image)
    setLatestVersionNumber(
      typeof question.latest_version_number === 'number'
        ? question.latest_version_number
        : null,
    )
    setVersionHistory(question.version_history)
  }, [])

  const loadQuestion = useCallback(async () => {
    if (!id) {
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      const question = await getQuestion(id)
      applyLoadedQuestion(question)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to load question.'
      setLoadError(message)
      setLatestVersionNumber(null)
      setVersionHistory(undefined)
    } finally {
      setIsLoading(false)
    }
  }, [applyLoadedQuestion, id])

  useEffect(() => {
    if (isEditMode) {
      void loadQuestion()
    }
  }, [isEditMode, loadQuestion])

  const updateForm = (patch: Partial<QuestionFormState>) => {
    setForm((current) => {
      const next = { ...current, ...patch }
      if (patch.type && patch.type !== current.type) {
        next.options = createDefaultOptions(patch.type)
        next.blank_answer_keys =
          patch.type === 'FILL_IN_BLANK'
            ? [{ answer: '', case_sensitive: false }]
            : []
      }
      return next
    })
    setFieldErrors({})
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const validationError = validateImageFile(file)
    if (validationError) {
      setImageError(validationError)
      event.target.value = ''
      return
    }

    setImageError(null)
    setImageFile(file)
  }

  const performSave = async () => {
    setIsSaving(true)
    setFieldErrors({})

    try {
      const payload = toWritePayload(form)
      let savedQuestion: Question

      if (isEditMode && id) {
        savedQuestion = await updateQuestion(id, payload)
        showToast('Question updated successfully.', 'success')
      } else {
        savedQuestion = await createQuestion(payload)
        showToast('Question created successfully.', 'success')
      }

      if (imageFile) {
        savedQuestion = await uploadQuestionImage(savedQuestion.id, imageFile)
        showToast(
          isEditMode ? 'Question image updated.' : 'Question image uploaded.',
          'success',
        )
      }

      applyLoadedQuestion(savedQuestion)
      setImageFile(null)
      setShowSaveConfirmModal(false)
      navigate('/questions')
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors ?? {})
        showToast(error.message, 'error')
      } else {
        showToast('Unable to save question.', 'error')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateQuestionForm(form)
    if (imageError) {
      validationErrors.image = imageError
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }

    if (showVersionWarning) {
      setShowSaveConfirmModal(true)
      return
    }

    await performSave()
  }

  const canSave = isQuestionFormValid(form) && !imageError && !isSaving

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="questions-page__status questions-page__status--info">
          Loading question...
        </p>
      </DashboardLayout>
    )
  }

  if (loadError) {
    return (
      <DashboardLayout>
        <section className="admin-page questions-page">
          <p className="questions-page__status questions-page__status--error" role="alert">
            {loadError}
          </p>
          <Link to="/questions">Back to question bank</Link>
        </section>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <section className="admin-page questions-page">
        <header className="admin-page__header">
          <div>
            <div className="questions-page__title-row">
              <h1>{isEditMode ? 'Edit question' : 'New question'}</h1>
              {latestVersionNumber != null && latestVersionNumber >= 1 ? (
                <span className="questions-page__version-label">
                  Version: v{latestVersionNumber}
                </span>
              ) : null}
            </div>
            <p>Author a question with type-specific answer configuration.</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/questions')}>
            Back to list
          </Button>
        </header>

        {showVersionWarning ? (
          <div
            className="questions-page__version-warning"
            role="status"
            aria-live="polite"
          >
            Edits create a new version and do not change published tests.
          </div>
        ) : null}

        {isEditMode ? (
          <VersionHistorySection versionHistory={versionHistory} />
        ) : null}

        <form className="questions-editor" onSubmit={(event) => void handleSubmit(event)}>
          <div className="questions-editor__grid">
            <label>
              Subject
              <input
                type="text"
                value={form.subject}
                onChange={(event) => updateForm({ subject: event.target.value })}
              />
              {fieldErrors.subject ? (
                <span className="questions-editor__field-error">{fieldErrors.subject}</span>
              ) : null}
            </label>

            <label>
              Topic
              <input
                type="text"
                value={form.topic}
                onChange={(event) => updateForm({ topic: event.target.value })}
              />
              {fieldErrors.topic ? (
                <span className="questions-editor__field-error">{fieldErrors.topic}</span>
              ) : null}
            </label>

            <label>
              Difficulty
              <select
                value={form.difficulty}
                onChange={(event) =>
                  updateForm({
                    difficulty: event.target.value as QuestionFormState['difficulty'],
                  })
                }
              >
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
                value={form.type}
                onChange={(event) =>
                  updateForm({ type: event.target.value as QuestionType })
                }
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Points
              <input
                type="number"
                min={1}
                value={form.points}
                onChange={(event) =>
                  updateForm({ points: Number(event.target.value) || 1 })
                }
              />
              {fieldErrors.points ? (
                <span className="questions-editor__field-error">{fieldErrors.points}</span>
              ) : null}
            </label>
          </div>

          <label className="questions-editor__full-width">
            Question text
            <textarea
              rows={5}
              value={form.text}
              onChange={(event) => updateForm({ text: event.target.value })}
            />
            {fieldErrors.text ? (
              <span className="questions-editor__field-error">{fieldErrors.text}</span>
            ) : null}
          </label>

          <div className="questions-editor__image">
            <label>
              Image
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </label>
            {imageError || fieldErrors.image ? (
              <span className="questions-editor__field-error">
                {imageError ?? fieldErrors.image}
              </span>
            ) : null}
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt="Question preview"
                className="questions-editor__image-preview"
              />
            ) : (
              <p className="questions-page__hint">Optional image for the question stem.</p>
            )}
          </div>

          {form.type === 'MCQ' || form.type === 'MULTI_SELECT' || form.type === 'TRUE_FALSE' ? (
            <OptionEditor
              options={form.options}
              type={form.type}
              onChange={(options) => updateForm({ options })}
              error={fieldErrors.options}
            />
          ) : null}

          {form.type === 'FILL_IN_BLANK' ? (
            <BlankAnswerEditor
              blankAnswerKeys={form.blank_answer_keys}
              onChange={(blank_answer_keys) => updateForm({ blank_answer_keys })}
              error={fieldErrors.blank_answer_keys}
            />
          ) : null}

          {form.type === 'FREE_TEXT' ? (
            <p className="questions-page__hint">
              Free-text questions are graded manually. No answer options are required.
            </p>
          ) : null}

          <div className="questions-editor__actions">
            <Button type="submit" isLoading={isSaving} disabled={!canSave}>
              {isEditMode ? 'Save changes' : 'Create question'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/questions')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </section>

      <SaveVersionConfirmModal
        isOpen={showSaveConfirmModal}
        isSaving={isSaving}
        onConfirm={() => void performSave()}
        onCancel={() => setShowSaveConfirmModal(false)}
      />
    </DashboardLayout>
  )
}