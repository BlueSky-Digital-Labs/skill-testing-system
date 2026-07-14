import type { ResultVisibility, TestSettings } from '@/types/tests'
import '../tests/tests.css'

interface VisibilityPanelProps {
  settings: TestSettings
  disabled?: boolean
  onChange: (settings: TestSettings) => void
}

const VISIBILITY_OPTIONS: Array<{ value: ResultVisibility; label: string }> = [
  { value: 'immediate', label: 'Immediately after submission' },
  { value: 'after_release', label: 'After examiner release' },
  { value: 'never', label: 'Never show to candidates' },
]

export function VisibilityPanel({
  settings,
  disabled = false,
  onChange,
}: VisibilityPanelProps) {
  return (
    <section className="test-builder-panel" aria-labelledby="visibility-panel-heading">
      <h2 id="visibility-panel-heading" className="test-builder-panel__title">
        Result visibility
      </h2>

      <fieldset className="test-builder-field" disabled={disabled}>
        <legend className="test-builder-field__legend">
          When can candidates see their results?
        </legend>
        {VISIBILITY_OPTIONS.map((option) => (
          <label key={option.value} className="test-builder-toggle-row">
            <span>{option.label}</span>
            <input
              type="radio"
              name="result-visibility"
              value={option.value}
              checked={(settings.result_visibility ?? 'after_release') === option.value}
              disabled={disabled}
              onChange={() =>
                onChange({ ...settings, result_visibility: option.value })
              }
            />
          </label>
        ))}
      </fieldset>
    </section>
  )
}
