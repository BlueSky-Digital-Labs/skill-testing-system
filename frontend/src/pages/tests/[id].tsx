import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { useToast } from '@components/Toast'
import {
  IntegrityPanel,
  LifecycleControls,
  PreviewLauncher,
  QuestionPicker,
  RulesBuilder,
  SettingsPanel,
  TestMetaForm,
  VisibilityPanel,
} from '@components/tests'
import { ApiError } from '@/api/client'
import { listQuestions } from '@/api/questionBank'
import {
  useArchiveTestMutation,
  usePublishTestMutation,
  useTestQuery,
  useUpdateTestMutation,
} from '@/hooks/useTests'
import type { TestFormErrors, TestFormState } from '@/types/tests'
import {
  createEmptyFormState,
  formStateToPayload,
  testToFormState,
  validateTestForm,
} from '@/utils/testBuilder'
import '../admin/admin.css'
import './tests.css'
import '../../components/tests/tests.css'

const QUESTION_PAGE_SIZE = 10

export function TestEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: test, isLoading, error } = useTestQuery(id)
  const updateMutation = useUpdateTestMutation(id ?? '')
  const publishMutation = usePublishTestMutation(id ?? '')
  const archiveMutation = useArchiveTestMutation(id ?? '')

  const [formState, setFormState] = useState<TestFormState>(createEmptyFormState())
  const [errors, setErrors] = useState<TestFormErrors>({})
  const [questionPage, setQuestionPage] = useState(1)
  const [actionError, setActionError] = useState<string | null>(null)

  const isReadOnly = test ? test.lifecycle !== 'draft' : false

  useEffect(() => {
    if (test) {
      setFormState(testToFormState(test))
    }
  }, [test])

  const questionsQuery = useQuery({
    queryKey: ['tests', 'editor-questions', questionPage],
    queryFn: () => listQuestions({ page: questionPage }),
    enabled: formState.assemblyMode === 'manual',
  })

  const validationErrors = useMemo(() => validateTestForm(formState), [formState])

  const updateForm = (patch: Partial<TestFormState>) => {
    setFormState((current) => ({ ...current, ...patch }))
    setErrors((current) => ({ ...current, form: undefined }))
    setActionError(null)
  }

  const persistTest = async () => {
    const nextErrors = validateTestForm(formState)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return false
    }

    if (!id) {
      return false
    }

    try {
      await updateMutation.mutateAsync(formStateToPayload(formState))
      showToast('Test saved.', 'success')
      return true
    } catch (saveError) {
      const message =
        saveError instanceof ApiError ? saveError.message : 'Unable to save test.'
      setActionError(message)
      showToast(message, 'error')
      return false
    }
  }

  const handleSave = async () => {
    await persistTest()
  }

  const handlePublish = async () => {
    const saved = await persistTest()
    if (!saved || !id) {
      return
    }

    try {
      await publishMutation.mutateAsync()
      showToast('Test published.', 'success')
    } catch (publishError) {
      const message =
        publishError instanceof ApiError
          ? publishError.message
          : 'Unable to publish test.'
      setActionError(message)
      showToast(message, 'error')
    }
  }

  const handleArchive = async () => {
    if (!id) {
      return
    }

    try {
      await archiveMutation.mutateAsync()
      showToast('Test archived.', 'success')
    } catch (archiveError) {
      const message =
        archiveError instanceof ApiError
          ? archiveError.message
          : 'Unable to archive test.'
      setActionError(message)
      showToast(message, 'error')
    }
  }

  const handlePreview = () => {
    if (!id) {
      return
    }
    navigate(`/tests/${id}/preview`)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="tests-page__empty" aria-live="polite">
          Loading test...
        </p>
      </DashboardLayout>
    )
  }

  if (error || !test || !id) {
    const message =
      error instanceof ApiError ? error.message : 'Unable to load this test.'
    return (
      <DashboardLayout>
        <p className="test-builder-alert" role="alert">
          {message}
        </p>
        <Link to="/tests">
          <Button type="button" variant="secondary">
            Back to tests
          </Button>
        </Link>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <section className="admin-page tests-page">
        <header className="admin-page__header">
          <div>
            <h1>{formState.title || 'Test builder'}</h1>
            <p>Configure questions, settings, and lifecycle for this test.</p>
          </div>
          <Link to="/tests">
            <Button type="button" variant="secondary">
              Back to tests
            </Button>
          </Link>
        </header>

        <div className="test-builder-grid test-builder-grid--editor">
          <div className="test-builder-grid">
            <TestMetaForm
              value={{
                title: formState.title,
                description: formState.description,
                topicTags: formState.topicTags,
              }}
              errors={errors}
              disabled={isReadOnly}
              onChange={(patch) => updateForm(patch)}
            />

            <RulesBuilder
              assemblyMode={formState.assemblyMode}
              rules={formState.selectionRules}
              disabled={isReadOnly}
              onAssemblyModeChange={(assemblyMode) => updateForm({ assemblyMode })}
              onRulesChange={(selectionRules) => updateForm({ selectionRules })}
            />

            {formState.assemblyMode === 'manual' ? (
              <QuestionPicker
                questions={questionsQuery.data?.results ?? []}
                selectedIds={formState.selectedQuestionIds}
                isLoading={questionsQuery.isLoading}
                error={
                  questionsQuery.error instanceof ApiError
                    ? questionsQuery.error.message
                    : null
                }
                page={questionPage}
                totalCount={questionsQuery.data?.count ?? 0}
                pageSize={QUESTION_PAGE_SIZE}
                disabled={isReadOnly}
                onPageChange={setQuestionPage}
                onSelectionChange={(selectedQuestionIds) =>
                  updateForm({ selectedQuestionIds })
                }
              />
            ) : null}

            {errors.form ? (
              <p className="test-builder-alert" role="alert">
                {errors.form}
              </p>
            ) : null}
          </div>

          <div className="test-builder-grid">
            <SettingsPanel
              settings={formState.settings}
              disabled={isReadOnly}
              error={errors.settings}
              onChange={(settings) => updateForm({ settings })}
            />
            <IntegrityPanel
              settings={formState.settings}
              disabled={isReadOnly}
              onChange={(settings) => updateForm({ settings })}
            />
            <VisibilityPanel
              settings={formState.settings}
              disabled={isReadOnly}
              onChange={(settings) => updateForm({ settings })}
            />
            <LifecycleControls
              lifecycle={test.lifecycle}
              isSaving={updateMutation.isPending}
              isPublishing={publishMutation.isPending}
              isArchiving={archiveMutation.isPending}
              error={actionError}
              validationError={
                Object.keys(validationErrors).length > 0 && !actionError
                  ? 'Fix validation issues before publishing.'
                  : null
              }
              onSave={() => void handleSave()}
              onPublish={() => void handlePublish()}
              onArchive={() => void handleArchive()}
            />
            <PreviewLauncher
              testId={id}
              disabled={isReadOnly}
              onPreview={handlePreview}
            />
          </div>
        </div>
      </section>
    </DashboardLayout>
  )
}
