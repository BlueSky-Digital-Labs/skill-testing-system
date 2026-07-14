import type { TestFormErrors, TestFormState } from '@/types/tests'
import './tests.css'

interface TestMetaFormProps {
  value: Pick<TestFormState, 'title' | 'description' | 'topicTags'>
  errors?: TestFormErrors
  disabled?: boolean
  onChange: (patch: Partial<Pick<TestFormState, 'title' | 'description' | 'topicTags'>>) => void
}

export function TestMetaForm({
  value,
  errors,
  disabled = false,
  onChange,
}: TestMetaFormProps) {
  return (
    <section className="test-builder-panel" aria-labelledby="test-meta-heading">
      <h2 id="test-meta-heading" className="test-builder-panel__title">
        Test details
      </h2>
      <p className="test-builder-panel__description">
        Name the test and add topic tags to help examiners find it later.
      </p>

      <div className="test-builder-field">
        <label htmlFor="test-title">Test name</label>
        <input
          id="test-title"
          name="title"
          type="text"
          value={value.title}
          disabled={disabled}
          aria-invalid={Boolean(errors?.title)}
          aria-describedby={errors?.title ? 'test-title-error' : undefined}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        {errors?.title ? (
          <p id="test-title-error" className="test-builder-field__error" role="alert">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="test-builder-field">
        <label htmlFor="test-topic-tags">Topic tags</label>
        <input
          id="test-topic-tags"
          name="topicTags"
          type="text"
          value={value.topicTags}
          disabled={disabled}
          placeholder="algebra, geometry"
          onChange={(event) => onChange({ topicTags: event.target.value })}
        />
      </div>

      <div className="test-builder-field">
        <label htmlFor="test-description">Description</label>
        <textarea
          id="test-description"
          name="description"
          value={value.description}
          disabled={disabled}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </div>
    </section>
  )
}
