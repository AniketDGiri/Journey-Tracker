import { addDays, format } from 'date-fns'
import { key } from '../../engine/days'
import { weekStartOf } from '../../engine/weeks'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const LEGEND = [
  ['🔥', 'excellent'],
  ['🟩', 'productive'],
  ['🟨', 'partial'],
  ['🟥', 'missed'],
  ['⬜', 'future'],
  ['▫', 'weekend — optional, never counted against you'],
]

const CLASS = { '🔥': 'hm-fire', '🟩': 'hm-good', '🟨': 'hm-part', '🟥': 'hm-miss', '⬜': 'hm-future', '▫': 'hm-rest' }

export default function Heatmap({ days, today }) {
  const byKey = new Map(days.map((d) => [d.key, d]))
  const start = addDays(weekStartOf(new Date(`${today}T00:00:00`)), -56)
  const cols = Array.from({ length: 13 }, (_, w) => addDays(start, w * 7))

  return (
    <div className="hm">
      <div className="hm-scroll">
        <div className="hm-months">
          <div className="hm-spacer" />
          {cols.map((c, i) => {
            const label = format(c, 'MMM')
            const prev = i > 0 ? format(cols[i - 1], 'MMM') : null
            return (
              <div className="hm-month" key={key(c)}>
                {label === prev ? '' : label}
              </div>
            )
          })}
        </div>
        {DOW.map((name, row) => (
          <div className="hm-row" key={name}>
            <div className="hm-day-label">{name}</div>
            {cols.map((c) => {
              const d = byKey.get(key(addDays(c, row)))
              const status = d?.status ?? ''
              const k = d?.key ?? key(addDays(c, row))
              return (
                <div
                  key={k}
                  className={`hm-cell ${CLASS[status] ?? 'hm-none'} ${k === today ? 'hm-today' : ''}`}
                  title={
                    d
                      ? `${format(d.date, 'EEE dd MMM')} — ${d.future ? 'upcoming' : `${d.actual.toFixed(2)}h`}`
                      : ''
                  }
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="hm-legend">
        {LEGEND.map(([icon, text]) => (
          <span key={text}>
            {icon} {text}
          </span>
        ))}
      </div>
    </div>
  )
}
