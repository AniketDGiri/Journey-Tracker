import { format, addDays, startOfWeek, endOfWeek } from '../../utils/dates'

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

// Count-based shading (like GitHub): 0→empty, 1→light, 2→medium, 3+→dark
// Ratio-based would always jump 0→darkest when there is only 1 task.
function colorFor(done, total) {
  if (!total) return 'var(--heat-0)'
  if (done === 0) return 'var(--heat-0)'
  if (done === 1) return 'var(--heat-1)'
  if (done < total) return 'var(--heat-2)'
  return 'var(--heat-3)'
}

export default function Heatmap({ data }) {
  if (!data || data.length === 0) return null

  // Build a date → entry lookup
  const dateMap = new Map(data.map((d) => [format(d.date, 'yyyy-MM-dd'), d]))

  const firstDate = data[0].date
  const lastDate = data[data.length - 1].date

  // Snap to Monday of first week and Sunday of last week so the grid is rectangle
  const gridStart = startOfWeek(firstDate, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(lastDate, { weekStartsOn: 1 })

  // Build week columns: each column = Mon..Sun
  const weeks = []
  let cur = gridStart
  while (cur <= gridEnd) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const day = addDays(cur, d)
      const key = format(day, 'yyyy-MM-dd')
      const entry = dateMap.get(key)
      week.push(entry ? { ...entry, outside: false } : { date: day, key, ratio: null, outside: true })
    }
    weeks.push(week)
    cur = addDays(cur, 7)
  }

  // Month label: show abbreviation only at the first column of a new month
  const monthLabels = weeks.map((week, wi) => {
    const d = week[0].date
    if (wi === 0) return format(d, 'MMM')
    const prev = weeks[wi - 1][0].date
    return format(d, 'M') !== format(prev, 'M') ? format(d, 'MMM') : ''
  })

  return (
    <div className="heatmap-gh">
      {/* Month labels row */}
      <div className="heatmap-gh-months-row">
        <div className="heatmap-gh-spacer" />
        <div className="heatmap-gh-month-labels">
          {weeks.map((_, wi) => (
            <div key={wi} className="heatmap-gh-month-slot">
              {monthLabels[wi]}
            </div>
          ))}
        </div>
      </div>

      {/* Day labels + cell grid */}
      <div className="heatmap-gh-body">
        <div className="heatmap-gh-day-labels">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="heatmap-gh-day-label">{label}</div>
          ))}
        </div>
        <div className="heatmap-gh-grid">
          {weeks.map((week, wi) => (
            <div key={wi} className="heatmap-col">
              {week.map((d) => (
                <div
                  key={d.key}
                  className={`heatmap-cell${d.outside ? ' heatmap-cell-out' : ''}`}
                  style={{ background: d.outside ? 'var(--surface-3)' : colorFor(d.done, d.total) }}
                  title={
                    d.outside
                      ? ''
                      : `${format(d.date, 'EEE, MMM d')} — ${
                          d.total === 0 || d.total == null
                            ? 'no tasks'
                            : `${d.done}/${d.total} done`
                        }`
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span>Less</span>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="heatmap-cell" style={{ background: `var(--heat-${i})` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
