import { Fragment, useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { Card, Empty, GrowText, hrs } from '../common/ui'

const PRIORITY = ['High', 'Medium', 'Low']
const STATUS = ['Not Started', 'Planned', 'In Progress', 'Completed', 'Deferred', 'Cancelled']
const DIFFICULTY = ['Easy', 'Medium', 'Hard']

const BLANK = {
  title: '', category: '', subcategory: '', priority: 'Medium', estHours: 1,
  dueDate: '', status: 'Not Started', difficulty: 'Medium',
  importance: 'Medium', completedDate: '', notes: '',
}

export default function TaskBank() {
  const { tasks, sessions, days, addTask, updateTask, removeTask, addSession, stats } = useAppStore()
  const [draft, setDraft] = useState(BLANK)
  const [filter, setFilter] = useState('All')
  const [log, setLog] = useState(null)

  // Actual hours roll up from the Study Log by matching the task title.
  const actualByTitle = useMemo(() => {
    const m = new Map()
    for (const s of sessions) {
      if (!s.task) continue
      m.set(s.task, (m.get(s.task) ?? 0) + (Number(s.duration) || 0))
    }
    return m
  }, [sessions])

  // Which days each task has been picked for in the Planner.
  const scheduledById = useMemo(() => {
    const m = new Map()
    for (const d of days) {
      for (const t of d.picked) {
        if (!m.has(t.id)) m.set(t.id, [])
        m.get(t.id).push(d.key)
      }
    }
    return m
  }, [days])

  const shown = filter === 'All' ? tasks : tasks.filter((t) => t.status === filter)

  const submit = (e) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    addTask({ ...draft, title: draft.title.trim(), estHours: Number(draft.estHours) || 0 })
    setDraft(BLANK)
  }

  const set = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.value }))

  // Manual hours go through the Study Log so they count toward the day, streak and XP.
  const submitLog = (e) => {
    e.preventDefault()
    const hours = Number(log.hours)
    if (!log.date || !hours) return
    const task = tasks.find((t) => t.id === log.taskId)
    addSession({
      date: log.date, start: '', end: '', duration: hours,
      category: task?.category ?? '', task: task?.title ?? '',
      focus: 4, energy: 4, notes: '',
    })
    setLog(null)
  }

  return (
    <Card
      title="✅ Task Bank"
      subtitle="Every task you might do lives here, undated. Pick what you'll actually work on each day over in the Daily Planner. Actual hours add up from the Study Log — click one to log hours by hand."
      actions={
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {['All', ...STATUS].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      }
      className="card-wide"
    >
      <form className="add-form" onSubmit={submit}>
        <input className="input input-grow" placeholder="Task…" value={draft.title} onChange={set('title')} />
        <input className="input" placeholder="Category" value={draft.category} onChange={set('category')} />
        <select className="input" value={draft.priority} onChange={set('priority')}>
          {PRIORITY.map((p) => <option key={p}>{p}</option>)}
        </select>
        <input className="input input-num" type="number" min="0" step="0.25" value={draft.estHours} onChange={set('estHours')} title="Estimated hours" />
        <input className="input" type="date" value={draft.dueDate} onChange={set('dueDate')} title="Due date (optional)" />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      {shown.length === 0 ? (
        <Empty>No tasks yet — it starts empty on purpose. Add the first one above.</Empty>
      ) : (
        <div className="table-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th className="th-text">Task</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Est.</th>
                <th>Actual ＋</th>
                <th>Scheduled</th>
                <th>Due</th>
                <th>Status</th>
                <th>Difficulty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => (
                <Fragment key={t.id}>
                <tr className={t.status === 'Completed' ? 'row-done' : ''}>
                  <td className="td-text">
                    <GrowText value={t.title} onChange={(e) => updateTask(t.id, { title: e.target.value })} />
                  </td>
                  <td>
                    <input className="cell-input cell-narrow" value={t.category ?? ''} onChange={(e) => updateTask(t.id, { category: e.target.value })} />
                  </td>
                  <td>
                    <select className="cell-input" value={t.priority ?? 'Medium'} onChange={(e) => updateTask(t.id, { priority: e.target.value })}>
                      {PRIORITY.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="cell-input cell-num" type="number" min="0" step="0.25" value={t.estHours ?? 0} onChange={(e) => updateTask(t.id, { estHours: Number(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <button
                      className="cell-log"
                      type="button"
                      onClick={() => setLog({ taskId: t.id, date: stats.today.key, hours: '' })}
                      title={`Log hours for "${t.title}"`}
                    >
                      <span className="cell-strong">{hrs(actualByTitle.get(t.title) ?? 0)}</span>
                      <span className="cell-log-add">＋</span>
                    </button>
                  </td>
                  <td className="nowrap">
                    <Scheduled dates={scheduledById.get(t.id)} />
                  </td>
                  <td>
                    <input className="cell-input" type="date" value={t.dueDate ?? ''} onChange={(e) => updateTask(t.id, { dueDate: e.target.value })} />
                  </td>
                  <td>
                    <select className="cell-input" value={t.status ?? 'Not Started'} onChange={(e) => updateTask(t.id, { status: e.target.value })}>
                      {STATUS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="cell-input" value={t.difficulty ?? 'Medium'} onChange={(e) => updateTask(t.id, { difficulty: e.target.value })}>
                      {DIFFICULTY.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => removeTask(t.id)} title="Delete task">✕</button>
                  </td>
                </tr>
                {log?.taskId === t.id && (
                  <tr className="row-log">
                    <td colSpan={10}>
                      <form className="log-form" onSubmit={submitLog}>
                        <span>Log hours for <strong>{t.title}</strong></span>
                        <input
                          className="input"
                          type="date"
                          value={log.date}
                          onChange={(e) => setLog((p) => ({ ...p, date: e.target.value }))}
                        />
                        <input
                          className="input input-num"
                          type="number" min="0" step="0.25" placeholder="hours" autoFocus
                          value={log.hours}
                          onChange={(e) => setLog((p) => ({ ...p, hours: e.target.value }))}
                        />
                        <button className="btn btn-primary" type="submit">Log to Study Log</button>
                        <button className="btn" type="button" onClick={() => setLog(null)}>Cancel</button>
                        <span className="note-quiet">These hours count toward that day's total, streak and XP.</span>
                      </form>
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

function Scheduled({ dates }) {
  if (!dates || dates.length === 0) return <span className="muted">backlog</span>
  const last = dates[dates.length - 1]
  return (
    <span title={dates.join(', ')}>
      {last}
      {dates.length > 1 ? <span className="muted"> +{dates.length - 1}</span> : null}
    </span>
  )
}
