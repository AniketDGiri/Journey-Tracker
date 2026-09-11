import { useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { Bar, Empty, Stat, pct } from '../common/ui'
import { QUADRANTS, summariseDay, summariseRange } from '../../utils/timeBlocks'
import { isOverdue } from '../../utils/taskDates'

const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
]

export default function PersonalDashboard() {
  const { timeLog, timeConfig, personalTasks, personalSections, stats } = useAppStore()
  const [range, setRange] = useState(7)

  const dateKeys = useMemo(() => {
    const end = parseISO(stats.today.key)
    return Array.from({ length: range }, (_, i) => format(addDays(end, -i), 'yyyy-MM-dd'))
  }, [range, stats.today.key])

  const sum = useMemo(
    () => summariseRange(timeLog, timeConfig, dateKeys),
    [timeLog, timeConfig, dateKeys]
  )

  const daily = useMemo(
    () =>
      [...dateKeys].reverse().map((k) => ({
        key: k,
        label: format(parseISO(k), 'dd MMM'),
        ...summariseDay(timeLog[k], timeConfig),
      })),
    [dateKeys, timeLog, timeConfig]
  )
  const maxHours = Math.max(1, ...daily.map((d) => d.trackedHours))

  // Does time in "important, not urgent" actually track with a good day?
  const happyDays = daily.filter((d) => d.happy === 'yes' && d.trackedSlots > 0)
  const unhappyDays = daily.filter((d) => d.happy === 'no' && d.trackedSlots > 0)
  const avgQ2 = (list) =>
    list.length ? list.reduce((a, d) => a + d.pct.q2, 0) / list.length : null

  const overdue = personalTasks.filter((t) => isOverdue(t, stats.today.key)).length
  const doneCount = personalTasks.filter((t) => t.section === 'done').length

  const byCategory = useMemo(() => {
    const m = new Map()
    for (const t of personalTasks) {
      const c = t.category?.trim() || 'Uncategorised'
      m.set(c, (m.get(c) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [personalTasks])

  return (
    <div className="dash-grid dash-grid-flat">
      <section className="panel panel-wide">
        <header className="panel-head">
          <h3 className="side-title">Where your time actually goes</h3>
          <div className="view-switch">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                className={`panel-tab ${range === r.days ? 'active' : ''}`}
                onClick={() => setRange(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>
        <div className="stat-row">
          <Stat label="Days tracked" value={`${sum.daysTracked} / ${range}`} />
          <Stat label="Hours tracked" value={`${sum.trackedHours}h`} />
          <Stat label="Important work" value={pct(sum.important.yes)} sub="of tracked time" />
          <Stat label="Urgent work" value={pct(sum.urgent.yes)} sub="of tracked time" />
          <Stat
            label="Good days"
            value={sum.happyAnswered ? pct(sum.happyRate) : '—'}
            sub={sum.happyAnswered ? `${sum.happyAnswered} answered` : 'not answered yet'}
          />
        </div>
      </section>

      <section className="panel">
        <h3 className="side-title">Eisenhower split</h3>
        {sum.trackedSlots === 0 ? (
          <Empty>Nothing tracked in this range yet.</Empty>
        ) : (
          <>
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
            <p className="note note-quiet">
              Time in <strong>Important, not urgent</strong> is the one to grow — it's the work that
              stops things becoming urgent later.
            </p>
          </>
        )}
      </section>

      <section className="panel">
        <h3 className="side-title">Does deliberate time make better days?</h3>
        {happyDays.length === 0 && unhappyDays.length === 0 ? (
          <Empty>Answer the daily happiness question a few times to see this.</Empty>
        ) : (
          <div className="cons-list">
            <div className="cons-row cons-row-wide">
              <span className="cons-label">Good days</span>
              <Bar value={avgQ2(happyDays) ?? 0} tone="success" />
              <span className="cons-pct">{happyDays.length ? pct(avgQ2(happyDays)) : '—'}</span>
            </div>
            <div className="cons-row cons-row-wide">
              <span className="cons-label">Bad days</span>
              <Bar value={avgQ2(unhappyDays) ?? 0} />
              <span className="cons-pct">{unhappyDays.length ? pct(avgQ2(unhappyDays)) : '—'}</span>
            </div>
            <p className="note note-quiet">
              Average share of the day spent on important-but-not-urgent work, split by how you
              rated the day ({happyDays.length} good, {unhappyDays.length} bad).
            </p>
          </div>
        )}
      </section>

      <section className="panel panel-wide">
        <h3 className="side-title">Hours tracked per day</h3>
        {sum.daysTracked === 0 ? (
          <Empty>Nothing tracked yet.</Empty>
        ) : (
          <div className="chart">
            {daily.map((d) => (
              <div className="chart-col" key={d.key} title={`${d.label}: ${d.trackedHours}h`}>
                <div className="chart-bar-wrap">
                  <div
                    className={`chart-bar ${d.happy === 'yes' ? 'chart-bar-good' : ''}`}
                    style={{ height: `${(d.trackedHours / maxHours) * 100}%` }}
                  />
                </div>
                <span className="chart-label">{d.label.slice(0, 2)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3 className="side-title">Biggest time sinks</h3>
        {sum.topTasks.length === 0 ? (
          <Empty>Nothing tracked yet.</Empty>
        ) : (
          <div className="sink-list">
            {sum.topTasks.map((t) => (
              <div className="sink-row" key={t.task}>
                <span className="sink-name">{t.task}</span>
                <span className="sink-hours">{t.hours}h</span>
                <div className="sink-bar">
                  <Bar value={t.hours / sum.topTasks[0].hours} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3 className="side-title">To-do list</h3>
        <div className="stat-row">
          <Stat label="Total" value={personalTasks.length} />
          <Stat label="Done" value={doneCount} />
          <Stat label="Overdue" value={overdue} tone={overdue > 0 ? 'alert' : undefined} />
        </div>
        <div className="cons-list">
          {personalSections.map((s) => {
            const n = personalTasks.filter((t) => t.section === s.id).length
            return (
              <div className="cons-row cons-row-wide" key={s.id}>
                <span className="cons-label">{s.name}</span>
                <Bar value={personalTasks.length ? n / personalTasks.length : 0} />
                <span className="cons-pct">{n}</span>
              </div>
            )
          })}
        </div>
        {byCategory.length > 0 && (
          <>
            <h4 className="side-title">By category</h4>
            <div className="chips">
              {byCategory.map(([c, n]) => (
                <span className="chip chip-cat" key={c}>{c} · {n}</span>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
