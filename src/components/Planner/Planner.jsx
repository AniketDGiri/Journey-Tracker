import { Fragment, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { Card, Empty, GrowText, hrs, pct } from '../common/ui'

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 }
const CLOSED = new Set(['Completed', 'Cancelled'])

export default function Planner() {
  const { days, setDayInput, stats, settings } = useAppStore()
  const months = [...new Set(days.map((d) => format(d.date, 'yyyy-MM')))]
  const [month, setMonth] = useState(() => stats.today.key.slice(0, 7))
  const [open, setOpen] = useState(() => stats.today.key)
  const rows = days.filter((d) => d.key.startsWith(month))

  return (
    <Card
      title="📅 Daily Planner"
      subtitle="Click a day to pick what you'll work on from the Task Bank. Everything else computes itself. Mon–Fri are required; Sat/Sun are bonus."
      actions={
        <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>
              {format(new Date(`${m}-01T00:00:00`), 'MMMM yyyy')}
            </option>
          ))}
        </select>
      }
      className="card-wide"
    >
      {rows.length === 0 ? (
        <Empty>No days in this month.</Empty>
      ) : (
        <div className="table-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th />
                <th>Date</th>
                <th>Day</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Left</th>
                <th>%</th>
                <th className="th-wide">Main task</th>
                <th>Done</th>
                <th title="Study tasks and revisions picked for the day">Items</th>
                <th>Prod.</th>
                <th>XP</th>
                <th>Win</th>
                <th>Streak</th>
                <th>Protect</th>
                <th className="th-wide">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <Fragment key={d.key}>
                  <tr
                    className={`${d.key === stats.today.key ? 'row-today' : ''} ${d.future ? 'row-future' : ''} ${!d.required ? 'row-weekend' : ''}`}
                  >
                    <td>
                      <button
                        type="button"
                        className={`row-toggle ${open === d.key ? 'row-toggle-open' : ''}`}
                        onClick={() => setOpen(open === d.key ? null : d.key)}
                        title="Pick tasks for this day"
                      >
                        ▸
                      </button>
                    </td>
                    <td className="nowrap">{format(d.date, 'dd MMM')}</td>
                    <td className="nowrap">
                      {d.dow} {d.required ? '' : '·'}
                    </td>
                    <td>{d.planned ? hrs(d.planned) : '—'}</td>
                    <td className="cell-strong">{d.future ? '—' : hrs(d.actual)}</td>
                    <td>{d.remaining === null ? '—' : hrs(d.remaining)}</td>
                    <td>{d.completion === null ? '—' : pct(d.completion)}</td>
                    <td className="td-text">
                      <GrowText
                        value={d.mainTask}
                        placeholder={d.future ? '' : 'one thing that matters'}
                        onChange={(e) => setDayInput(d.key, { mainTask: e.target.value })}
                      />
                    </td>
                    <td className="cell-center">
                      <input
                        type="checkbox"
                        checked={d.mainTaskDone}
                        onChange={(e) => setDayInput(d.key, { mainTaskDone: e.target.checked })}
                      />
                    </td>
                    <td className="nowrap">
                      {d.itemsPlanned ? `${d.itemsCompleted}/${d.itemsPlanned}` : '—'}
                    </td>
                    <td>{d.productivity === null ? '—' : pct(d.productivity)}</td>
                    <td>{d.xp || '—'}</td>
                    <td className="nowrap">{d.minWinLabel}</td>
                    <td>{d.streak ?? '—'}</td>
                    <td className="cell-center">
                      {d.required && !d.future && !d.win ? (
                        <input
                          type="checkbox"
                          checked={d.protect}
                          title={`Spend a recovery token to hold your streak (${stats.streak.tokensAvail} of ${settings.maxTokens} left)`}
                          onChange={(e) => setDayInput(d.key, { protect: e.target.checked })}
                        />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="td-text">
                      <GrowText
                        value={d.notes}
                        onChange={(e) => setDayInput(d.key, { notes: e.target.value })}
                      />
                    </td>
                  </tr>
                  {open === d.key && (
                    <tr className="row-panel">
                      <td colSpan={16}>
                        <DayPanel day={d} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function DayPanel({ day }) {
  const { tasks, pickTask, unpickTask, setTaskDone, setDayInput } = useAppStore()
  const [tab, setTab] = useState('tasks')
  const [q, setQ] = useState('')
  // Backfilling a past day means picking tasks that are already finished.
  const [showDone, setShowDone] = useState(false)

  const over = day.planned > day.target && day.target > 0

  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const pickedIds = new Set(day.picked.map((t) => t.id))
    return tasks
      .filter((t) => !pickedIds.has(t.id) && (showDone || !CLOSED.has(t.status)))
      .filter((t) =>
        !needle ||
        `${t.title} ${t.category ?? ''} ${t.subcategory ?? ''}`.toLowerCase().includes(needle)
      )
      .sort((a, b) => {
        const aClosed = CLOSED.has(a.status) ? 1 : 0
        const bClosed = CLOSED.has(b.status) ? 1 : 0
        const aOver = a.dueDate && a.dueDate < day.key ? 0 : 1
        const bOver = b.dueDate && b.dueDate < day.key ? 0 : 1
        return (
          aClosed - bClosed ||
          aOver - bOver ||
          (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
          a.title.localeCompare(b.title)
        )
      })
      .slice(0, 50)
  }, [tasks, q, showDone, day.key, day.picked])

  return (
    <div className="day-panel">
      <div className="day-panel-head">
        <strong>{format(day.date, 'EEEE dd MMM')}</strong>
        <span className={over ? 'day-planned day-planned-over' : 'day-planned'}>
          Picked {hrs(day.planned)}
          {day.target > 0 ? ` of ${hrs(day.target)} target` : ' (bonus day)'}
          {over ? ' — more than you can fit' : ''}
        </span>
      </div>

      <div className="panel-tabs">
        <button
          type="button"
          className={`panel-tab ${tab === 'tasks' ? 'active' : ''}`}
          onClick={() => setTab('tasks')}
        >
          Tasks {day.tasksPlanned ? `${day.tasksCompleted}/${day.tasksPlanned}` : ''}
        </button>
        <button
          type="button"
          className={`panel-tab ${tab === 'revisions' ? 'active' : ''}`}
          onClick={() => setTab('revisions')}
        >
          Revisions {day.revisionsPlanned ? `${day.revisionsDone}/${day.revisionsPlanned}` : ''}
        </button>
      </div>

      {tab === 'revisions' ? (
        <RevisionSection day={day} />
      ) : (
      <>
      <ul className="day-tasks">
        {day.picked.length === 0 && (
          <li className="day-task-empty">Nothing picked yet — choose from the Task Bank below.</li>
        )}
        {day.picked.map((t) => {
          const done = day.doneIds.has(t.id)
          return (
            <li className={`day-task ${done ? 'day-task-done' : ''}`} key={t.id}>
              <input
                type="checkbox"
                checked={done}
                onChange={(e) => setTaskDone(day.key, t.id, e.target.checked)}
                title="Finished this task"
              />
              <span className="day-task-title">{t.title}</span>
              <span className="day-task-meta">
                {[t.category, t.priority, t.estHours ? `${t.estHours}h` : null].filter(Boolean).join(' · ')}
              </span>
              <button
                type="button"
                className="btn-icon"
                title="Make this the day's main task"
                onClick={() => setDayInput(day.key, { mainTask: t.title })}
              >
                ★
              </button>
              <button
                type="button"
                className="btn-icon"
                title="Remove from this day"
                onClick={() => unpickTask(day.key, t.id)}
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>

      <div className="day-picker">
        <div className="picker-controls">
          <input
            className="input input-grow"
            placeholder="Search the Task Bank…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="check-line check-line-sm">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            Include finished
          </label>
        </div>
        {candidates.length === 0 ? (
          <p className="note note-quiet">
            {tasks.length === 0
              ? 'Your Task Bank is empty — add tasks there first.'
              : showDone
                ? 'Nothing left to pick that matches.'
                : 'Nothing open that matches — tick "Include finished" to pick tasks you already completed.'}
          </p>
        ) : (
          <ul className="picker-list">
            {candidates.map((t) => {
              const overdue = t.dueDate && t.dueDate < day.key
              return (
                <li key={t.id}>
                  <button type="button" className="picker-item" onClick={() => pickTask(day.key, t.id)}>
                    <span className="picker-add">＋</span>
                    <span className="picker-title">{t.title}</span>
                    <span className="picker-meta">
                      {[
                        overdue ? `🔴 due ${t.dueDate}` : t.dueDate ? `due ${t.dueDate}` : null,
                        t.category,
                        t.priority,
                        t.estHours ? `${t.estHours}h` : null,
                        t.status !== 'Not Started' ? t.status : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      </>
      )}
    </div>
  )
}

const DUE_RANK = { '🔴 Overdue': 0, '🟡 Due today': 1, '🟢 Scheduled': 2 }

function RevisionSection({ day }) {
  const { revisions, pickRevision, unpickRevision, setRevisionDone } = useAppStore()
  const [q, setQ] = useState('')
  // Show every open topic by default. Hiding anything not yet due made a topic
  // you had just added invisible until its first review came round.
  const [onlyDue, setOnlyDue] = useState(false)

  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const pickedIds = new Set(day.pickedRevisions.map((r) => r.id))
    return revisions
      .filter((r) => !pickedIds.has(r.id) && r.status !== '✅ cycle complete')
      .filter((r) => !onlyDue || (r.nextReview && r.nextReview <= day.key))
      .filter((r) => !needle || `${r.topic} ${r.category ?? ''}`.toLowerCase().includes(needle))
      .sort(
        (a, b) =>
          (DUE_RANK[a.status] ?? 3) - (DUE_RANK[b.status] ?? 3) ||
          (a.nextReview ?? '').localeCompare(b.nextReview ?? '') ||
          a.topic.localeCompare(b.topic)
      )
      .slice(0, 50)
  }, [revisions, q, onlyDue, day.key, day.pickedRevisions])

  return (
    <>
      <ul className="day-tasks">
        {day.pickedRevisions.length === 0 && (
          <li className="day-task-empty">
            No revisions picked for this day yet — each day has its own list, so pick again below.
          </li>
        )}
        {day.pickedRevisions.map((r) => {
          const done = day.revisionDoneIds.has(r.id)
          return (
            <li className={`day-task ${done ? 'day-task-done' : ''}`} key={r.id}>
              <input
                type="checkbox"
                checked={done}
                onChange={(e) => setRevisionDone(day.key, r.id, e.target.checked)}
                title="Mark this review done"
              />
              <span className="day-task-title">{r.topic}</span>
              <span className="day-task-meta">
                {[r.category, r.nextReview ? `next ${r.nextReview}` : null, r.status]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <button
                type="button"
                className="btn-icon"
                title="Remove from this day"
                onClick={() => unpickRevision(day.key, r.id)}
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>

      <div className="day-picker">
        <div className="picker-controls">
          <input
            className="input input-grow"
            placeholder="Search revision topics…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="check-line check-line-sm">
            <input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} />
            Only what's due
          </label>
        </div>
        {candidates.length === 0 ? (
          <p className="note note-quiet">
            {revisions.length === 0
              ? 'Your Revision Tracker is empty — add topics there first.'
              : onlyDue
                ? 'Nothing due by this day — untick "Only what’s due" to revise something early.'
                : 'Nothing left to pick that matches.'}
          </p>
        ) : (
          <ul className="picker-list">
            {candidates.map((r) => (
              <li key={r.id}>
                <button type="button" className="picker-item" onClick={() => pickRevision(day.key, r.id)}>
                  <span className="picker-add">＋</span>
                  <span className="picker-title">{r.topic}</span>
                  <span className="picker-meta">
                    {[r.status, r.category, r.nextReview ? `due ${r.nextReview}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
