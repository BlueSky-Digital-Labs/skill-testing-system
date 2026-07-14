import { Button } from '@components/atoms/Button'
import type { AssemblyMode, SelectionRule } from '@/types/tests'
import { createDefaultRule } from '@/utils/testBuilder'
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  type Difficulty,
  type QuestionType,
} from '@/types/questionBank'
import '../tests/tests.css'

interface RulesBuilderProps {
  assemblyMode: AssemblyMode
  rules: SelectionRule[]
  disabled?: boolean
  onAssemblyModeChange: (mode: AssemblyMode) => void
  onRulesChange: (rules: SelectionRule[]) => void
}

export function RulesBuilder({
  assemblyMode,
  rules,
  disabled = false,
  onAssemblyModeChange,
  onRulesChange,
}: RulesBuilderProps) {
  const updateRule = (index: number, patch: Partial<SelectionRule>) => {
    onRulesChange(
      rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    )
  }

  const addRule = () => {
    onRulesChange([...rules, createDefaultRule(rules.length)])
  }

  const removeRule = (index: number) => {
    onRulesChange(
      rules
        .filter((_, ruleIndex) => ruleIndex !== index)
        .map((rule, ruleIndex) => ({ ...rule, order: ruleIndex })),
    )
  }

  return (
    <section className="test-builder-panel" aria-labelledby="rules-builder-heading">
      <h2 id="rules-builder-heading" className="test-builder-panel__title">
        Question assembly
      </h2>
      <p className="test-builder-panel__description">
        Choose manual question selection or rule-based assembly for this test.
      </p>

      <div
        className="test-builder-mode-toggle"
        role="group"
        aria-label="Assembly mode"
      >
        <button
          type="button"
          aria-pressed={assemblyMode === 'manual'}
          disabled={disabled}
          onClick={() => onAssemblyModeChange('manual')}
        >
          Manual selection
        </button>
        <button
          type="button"
          aria-pressed={assemblyMode === 'rules'}
          disabled={disabled}
          onClick={() => onAssemblyModeChange('rules')}
        >
          Rule-based selection
        </button>
      </div>

      {assemblyMode === 'rules' ? (
        <div className="test-builder-grid">
          {rules.map((rule, index) => (
            <article
              key={`rule-${index}`}
              className="test-builder-rule-card"
              aria-label={`Selection rule ${index + 1}`}
            >
              <div className="test-builder-field">
                <label htmlFor={`rule-subject-${index}`}>Subject</label>
                <input
                  id={`rule-subject-${index}`}
                  value={rule.subject ?? ''}
                  disabled={disabled}
                  onChange={(event) => updateRule(index, { subject: event.target.value })}
                />
              </div>

              <div className="test-builder-field">
                <label htmlFor={`rule-topic-${index}`}>Topic</label>
                <input
                  id={`rule-topic-${index}`}
                  value={rule.topic ?? ''}
                  disabled={disabled}
                  onChange={(event) => updateRule(index, { topic: event.target.value })}
                />
              </div>

              <div className="test-builder-field">
                <label htmlFor={`rule-difficulty-${index}`}>Difficulty</label>
                <select
                  id={`rule-difficulty-${index}`}
                  value={rule.difficulty ?? ''}
                  disabled={disabled}
                  onChange={(event) =>
                    updateRule(index, {
                      difficulty: event.target.value as Difficulty | '',
                    })
                  }
                >
                  <option value="">Any</option>
                  {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="test-builder-field">
                <label htmlFor={`rule-type-${index}`}>Question type</label>
                <select
                  id={`rule-type-${index}`}
                  value={rule.question_type ?? ''}
                  disabled={disabled}
                  onChange={(event) =>
                    updateRule(index, {
                      question_type: event.target.value as QuestionType | '',
                    })
                  }
                >
                  <option value="">Any</option>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="test-builder-field">
                <label htmlFor={`rule-count-${index}`}>Question count</label>
                <input
                  id={`rule-count-${index}`}
                  type="number"
                  min={1}
                  value={rule.count}
                  disabled={disabled}
                  onChange={(event) =>
                    updateRule(index, { count: Number(event.target.value) || 1 })
                  }
                />
              </div>

              <div className="test-builder-rule-card__actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || rules.length === 1}
                  onClick={() => removeRule(index)}
                >
                  Remove rule
                </Button>
              </div>
            </article>
          ))}

          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={addRule}
          >
            Add rule
          </Button>
        </div>
      ) : (
        <p className="test-builder-panel__description">
          Use the question picker below to choose specific questions for this test.
        </p>
      )}
    </section>
  )
}