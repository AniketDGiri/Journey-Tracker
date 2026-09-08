import { useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { Bar, Stat, pct } from '../common/ui'
import { QUADRANTS, slotLabel, slotList, summariseDay } from '../../utils/timeBlocks'

const YN = [
  ['', '—'],
  ['y', 'Y'],
  ['n', 'N'],
]

const toBool = (v) => (v === 'y' ? true : v === 'n' ? false : undefined)
const fromBool = (v) => (v === true ? 'y' : v === false ? 'n' : '')

export default function TimeTracker() {
  const { timeLog, timeConfig, setTimeSlot, setTimeDay, updateTimeConfig, stats } = useAppStore()
  const [date, setDate] = useState(stats.today.key)

  const slots = useMemo(() => slotList(timeConfig), [timeConfig])
  const day = timeLog[date]
  const sum = useMemo(() => summariseDay(day, timeConfig), [day, timeConfig])

  const shift = (n) => setDate(format(addDays(parseISO(date), n), 'yyyy-MM-dd'))

  return (
    <div className="time-wrap">
      <div className="time-head">
        <div className="time-nav">
          <button className="btn btn-sm" onClick={() => shift(-1)}>←</button>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn btn-sm" onClick={() => shift(1)}>→</button>
          <button className="btn btn-sm" onClick={() => setDate(stats.today.key)}>Today</button>
          <span className="time-day-label">{format(parseISO(date), 'EEEE dd MMM yyyy')}</span>
        </div>
        <div className="time-cfg">
          <label>
            From
            <input
              className="input input-num" type="number" min="0" max="23"
              value={timeConfig.startHour}
              onChange={(e) => updateTimeConfig({ startHour: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })}
            />
          </label>
          <label>
            To
            <input
              className="input input-num" type="number" min="1" max="24"
              value={timeConfig.endHour}
              onChange={(e) => updateTimeConfig({ endHour: Math.min(24, Math.max(1, Number(e.target.value) || 24)) })}
            />
          </label>
          <label>
            Slot
            <select
              className="input input-num"
              value={timeConfig.interval}
              onChange={(e) => updateTimeConfig({ interval: Number(e.target.value) })}
            >
              {[15, 30, 60].map((n) => <option key={n} value={n}>{n}m</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="time-grid">
        <div className="time-slots">
          <table className="tbl time-tbl">
            <thead>
              <tr>
                <th>Time slot</th>
                <th className="th-text">Task</th>
                <th>Urgent?</th>
                <th>Important?</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const cell = day?.slots?.[slot] ?? {}
                const filled = Boolean(cell.task?.trim())
                return (
                  <tr key={slot} className={filled ? 'time-row-filled' : ''}>
                    <td className="nowrap time-slot">{slotLabel(slot)}</td>
                    <td className="td-text">
                      <input
                        className="cell-input"
                        value={cell.task ?? ''}
                        onChange={(e) => setTimeSlot(date, slot, { task: e.target.value })}
                      />
                    </td>
                    {['urgent', 'important'].map((field) => (
                      <td key={field} className="cell-center">
                        <select
                          className={`cell-input cell-num yn yn-${fromBool(cell[field]) || 'none'}`}
                          value={fromBool(cell[field])}
                          onChange={(e) => setTimeSlot(date, slot, { [field]: toBool(e.target.value) })}
                        >
                          {YN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <aside className="time-side">
          <div className="stat-row">
            <Stat label="Tracked" value={`${sum.trackedHours}h`} sub={`${sum.trackedSlots} of ${sum.totalSlots} slots`} />
            <Stat label="Important" value={pct(sum.important.yes)} />
            <Stat label="Urgent" value={pct(sum.urgent.yes)} />
          </div>

          <h4 className="side-title">Eisenhower matrix</h4>
          <div className="matrix">
            {['q1', 'q2', 'q3', 'q4'].map((id) => {
              const q = QUADRANTS.find((x) => x.id === id)
              return (
                <div className={`matrix-cell matrix-${id}`} key={id}>
                  <span className="matrix-pct">{pct(sum.pct[id])}</span>
                  <span className="matrix-label">{q.label}</span>
                  <span className="matrix-sub">{q.short} · {sum.hours[id]}h</span>
                </div>
              )
            })}
          </div>

          <h4 className="side-title">Task distribution</h4>
          <div className="cons-list">
            {[
              ['Urgent — yes', sum.urgent.yes],
              ['Urgent — no', sum.urgent.no],
              ['Important — yes', sum.important.yes],
              ['Important — no', sum.important.no],
            ].map(([label, v]) => (
              <div className="cons-row cons-row-wide" key={label}>
                <span className="cons-label">{label}</span>
                <Bar value={v} />
                <span className="cons-pct">{pct(v)}</span>
              </div>
            ))}
          </div>

          <h4 className="side-title">Do I feel happy with how the day went?</h4>
          <div className="happy-row">
            {[
              ['yes', '😀 Yes'],
              ['no', '😕 No'],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                className={`btn happy-btn ${sum.happy === v ? `happy-${v}` : ''}`}
                onClick={() => setTimeDay(date, { happy: sum.happy === v ? '' : v })}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            className="input"
            rows={3}
            placeholder="What made the day go the way it did?"
            value={day?.reflection ?? ''}
            onChange={(e) => setTimeDay(date, { reflection: e.target.value })}
          />
        </aside>
      </div>
    </div>
  )
}
