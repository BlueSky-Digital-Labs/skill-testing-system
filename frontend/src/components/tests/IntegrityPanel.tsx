import type { TestSettings } from '@/types/tests'
import '../tests/tests.css'

interface IntegrityPanelProps {
  settings: TestSettings
  disabled?: boolean
  onChange: (settings: TestSettings) => void
}

export function IntegrityPanel({
  settings,
  disabled = false,
  onChange,
}: IntegrityPanelProps) {
  const update = (patch: Partial<TestSettings>) => {
    onChange({ ...settings, ...patch })
  }

  return (
    <section className="test-builder-panel" aria-labelledby="integrity-panel-heading">
      <h2 id="integrity-panel-heading" className="test-builder-panel__title">
        Integrity and display
      </h2>

      <div className="test-builder-toggle-row">
        <label htmlFor="shuffle-questions">Shuffle questions</label>
        <input
          id="shuffle-questions"
          type="checkbox"
          checked={Boolean(settings.shuffle_questions)}
          disabled={disabled}
          onChange={(event) => update({ shuffle_questions: event.target.checked })}
        />
      </div>

      <div className="test-builder-toggle-row">
        <label htmlFor="shuffle-options">Shuffle answer options</label>
        <input
          id="shuffle-options"
          type="checkbox"
          checked={Boolean(settings.shuffle_options)}
          disabled={disabled}
          onChange={(event) => update({ shuffle_options: event.target.checked })}
        />
      </div>

      <div className="test-builder-toggle-row">
        <label htmlFor="show-correct-answers">Show correct answers in review</label>
        <input
          id="show-correct-answers"
          type="checkbox"
          checked={Boolean(settings.show_correct_answers)}
          disabled={disabled}
          onChange={(event) => update({ show_correct_answers: event.target.checked })}
        />
      </div>

      <div className="test-builder-toggle-row">
        <label htmlFor="show-explanations">Show explanations in review</label>
        <input
          id="show-explanations"
          type="checkbox"
          checked={Boolean(settings.show_explanations)}
          disabled={disabled}
          onChange={(event) => update({ show_explanations: event.target.checked })}
        />
      </div>
    </section>
  )
}
