import type { TestSettings } from '@/types/tests'
import '../tests/tests.css'

interface SettingsPanelProps {
  settings: TestSettings
  disabled?: boolean
  error?: string
  onChange: (settings: TestSettings) => void
}

export function SettingsPanel({
  settings,
  disabled = false,
  error,
  onChange,
}: SettingsPanelProps) {
  const update = (patch: Partial<TestSettings>) => {
    onChange({ ...settings, ...patch })
  }

  return (
    <section className="test-builder-panel" aria-labelledby="settings-panel-heading">
      <h2 id="settings-panel-heading" className="test-builder-panel__title">
        Test settings
      </h2>

      <div className="test-builder-field">
        <label htmlFor="time-limit">Time limit (minutes)</label>
        <input
          id="time-limit"
          type="number"
          min={1}
          value={settings.time_limit_minutes ?? ''}
          disabled={disabled}
          onChange={(event) =>
            update({
              time_limit_minutes: event.target.value
                ? Number(event.target.value)
                : null,
            })
          }
        />
      </div>

      <div className="test-builder-field">
        <label htmlFor="pass-type">Pass type</label>
        <select
          id="pass-type"
          value={settings.pass_type ?? 'percent'}
          disabled={disabled}
          onChange={(event) =>
            update({ pass_type: event.target.value as TestSettings['pass_type'] })
          }
        >
          <option value="percent">Percent</option>
          <option value="absolute">Absolute score</option>
        </select>
      </div>

      <div className="test-builder-field">
        <label htmlFor="passing-score">Passing score</label>
        <input
          id="passing-score"
          type="number"
          min={0}
          value={settings.passing_score ?? ''}
          disabled={disabled}
          onChange={(event) =>
            update({
              passing_score: event.target.value ? Number(event.target.value) : null,
            })
          }
        />
      </div>

      <div className="test-builder-field">
        <label htmlFor="max-attempts">Maximum attempts</label>
        <input
          id="max-attempts"
          type="number"
          min={1}
          value={settings.max_attempts ?? 1}
          disabled={disabled}
          onChange={(event) =>
            update({ max_attempts: Number(event.target.value) || 1 })
          }
        />
      </div>

      <div className="test-builder-field">
        <label htmlFor="opens-at">Availability opens</label>
        <input
          id="opens-at"
          type="datetime-local"
          value={settings.opens_at ?? ''}
          disabled={disabled}
          onChange={(event) => update({ opens_at: event.target.value })}
        />
      </div>

      <div className="test-builder-field">
        <label htmlFor="closes-at">Availability closes</label>
        <input
          id="closes-at"
          type="datetime-local"
          value={settings.closes_at ?? ''}
          disabled={disabled}
          onChange={(event) => update({ closes_at: event.target.value })}
        />
      </div>

      {error ? (
        <p className="test-builder-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
