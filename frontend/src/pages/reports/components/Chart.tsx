export interface ChartDatum {
  label: string
  value: number
}

interface ChartProps {
  title: string
  data: ChartDatum[]
  valueFormatter?: (value: number) => string
  emptyMessage?: string
}

export function Chart({
  title,
  data,
  valueFormatter = (value) => String(value),
  emptyMessage = 'No chart data available.',
}: ChartProps) {
  if (data.length === 0) {
    return <p className="reports-empty">{emptyMessage}</p>
  }

  const maxValue = Math.max(...data.map((entry) => entry.value), 1)

  return (
    <section className="reports-chart" aria-label={title}>
      <h3 className="reports-chart__title">{title}</h3>
      <div className="reports-chart__bars">
        {data.map((entry) => {
          const heightPercent = Math.max((entry.value / maxValue) * 100, 4)
          return (
            <div key={entry.label} className="reports-chart__bar-group">
              <div
                className="reports-chart__bar"
                style={{ height: `${heightPercent}%` }}
                title={`${entry.label}: ${valueFormatter(entry.value)}`}
              >
                <span className="reports-chart__value">
                  {valueFormatter(entry.value)}
                </span>
              </div>
              <span className="reports-chart__label">{entry.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
