export interface ReportFilterField {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'datetime-local'
}

export interface ReportFilters {
  [key: string]: string
}

interface FiltersBarProps {
  fields: ReportFilterField[]
  values: ReportFilters
  onChange: (key: string, value: string) => void
  onApply: () => void
  onReset: () => void
  isLoading?: boolean
}

export function FiltersBar({
  fields,
  values,
  onChange,
  onApply,
  onReset,
  isLoading = false,
}: FiltersBarProps) {
  return (
    <form
      className="reports-filters"
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
    >
      <div className="reports-filters__grid">
        {fields.map((field) => (
          <label key={field.key} className="reports-filters__field">
            <span className="reports-filters__label">{field.label}</span>
            <input
              className="reports-filters__input"
              type={field.type ?? 'text'}
              value={values[field.key] ?? ''}
              placeholder={field.placeholder}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="reports-filters__actions">
        <button
          type="submit"
          className="reports-btn reports-btn--primary"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Apply filters'}
        </button>
        <button
          type="button"
          className="reports-btn reports-btn--secondary"
          onClick={onReset}
          disabled={isLoading}
        >
          Reset
        </button>
      </div>
    </form>
  )
}
