import { Fragment, useMemo, useState } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { Card, Empty, GrowText, hrs } from '../common/ui'
import { STUDY_CATEGORY_LIST, StudyCategoryDatalist } from '../common/categories'

const PRIORITY = ['High', 'Medium', 'Low']
const STATUS = ['Not Started', 'Planned', 'In Progress', 'Completed', 'Deferred', 'Cancelled']
const DIFFICULTY = ['Easy', 'Medium', 'Hard']

// Each status gets its own collapsible section. Work you're on comes first;
// finished and cancelled work is folded away until you want it.
const GROUPS = [
  { status: 'In Progress', icon: '🔵', open: true, always: true },
  { status: 'Not Started', icon: '⚪', open: true, always: true },
  { status: 'Planned', icon: '🗓️', open: true },
  { status: 'Deferred', icon: '⏸️', open: true },
  { status: 'Completed', icon: '✅', open: false, always: true },
  { status: 'Cancelled', icon: '🚫', open: false },
]

const BLANK = {
  title: '', category: '', subcategory: '', priority: 'Medium', estHours: 1,
  dueDate: '', status: 'Not Started', difficulty: 'Medium',
  importance: 'Medium', completedDate: '', notes: '',
}

/**
 * Hours per day for every day from `fromKey` to the due date, both included —
 * a task added on the 7th and due on the 9th has three days, so 6h at 2h/day.
 * A due date that has already passed still counts as one day.
 */
function estimateFor(fromKey, dueKey, perDay) {
  if (!dueKey) return null
  const days = Math.max(1, differenceInCalendarDays(parseISO(dueKey), parseISO(fromKey)) + 1)
  return Math.round(days * perDay * 100) / 100
}

const byDue = (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
const byCompleted = (a, b) => (b.completedDate || '').localeCompare(a.completedDate || '')

export default function TaskBank() {
  const {
    tasks, sessions, days, addTask, updateTask, removeTask, addSession, stats, settings,
    addSubtask, toggleSubtask, updateSubtask, removeSubtask,
  } = useAppStore()
  const today = stats.today.key
  const perDay = Number(settings.taskHoursPerDay) || 2
  const [draft, setDraft] = useState(BLANK)
  const [log, setLog] = useState(null)
  const [openSubs, setOpenSubs] = useState(null)

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

  const grouped = useMemo(() => {
    const m = new Map(GROUPS.map((g) => [g.status, []]))
    for (const t of tasks) {
      const s = m.has(t.status) ? t.status : 'Not Started'
      m.get(s).push(t)
    }
    for (const [s, list] of m) list.sort(s === 'Completed' ? byCompleted : byDue)
    return m
  }, [tasks])

  const submit = (e) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    addTask({
      ...draft,
      title: draft.title.trim(),
      estHours: Number(draft.estHours) || 0,
      createdOn: today,
    })
    setDraft(BLANK)
  }

  const set = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.value }))

  // Picking a due date fills the estimate in; it stays editable afterwards.
  const setDraftDue = (e) => {
    const dueDate = e.target.value
    setDraft((p) => ({ ...p, dueDate, estHours: estimateFor(today, dueDate, perDay) ?? p.estHours }))
  }

  const changeDue = (t, dueDate) =>
    updateTask(t.id, {
      dueDate,
      ...(dueDate ? { estHours: estimateFor(t.createdOn || today, dueDate, perDay) } : {}),
    })

  const changeStatus = (t, status) =>
    updateTask(t.id, {
      status,
      completedDate: status === 'Completed' ? t.completedDate || today : '',
    })

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

  const renderRow = (t) => (
                <Fragment key={t.id}>
                <tr className={t.status === 'Completed' ? 'row-done' : ''}>
                  <td className="td-text">
                    <TaskName
                      task={t}
                      logged={actualByTitle.get(t.title) ?? 0}
                      onChange={(e) => updateTask(t.id, { title: e.target.value })}
                    />
                  </td>
                  <td>
                    <input className="cell-input cell-narrow" list={STUDY_CATEGORY_LIST} value={t.category ?? ''} onChange={(e) => updateTask(t.id, { category: e.target.value })} />
                  </td>
                  <td>
                    <select className="cell-input" value={t.priority ?? 'Medium'} onChange={(e) => updateTask(t.id, { priority: e.target.value })}>
                      {PRIORITY.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      className="cell-input cell-num"
                      type="number" min="0" step="0.25"
                      value={t.estHours ?? 0}
                      title={`Set automatically from the due date at ${perDay}h a day — edit it to override`}
                      onChange={(e) => updateTask(t.id, { estHours: Number(e.target.value) || 0 })}
                    />
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
                    <button
                      className="cell-log"
                      type="button"
                      onClick={() => setOpenSubs(openSubs === t.id ? null : t.id)}
                      title="Break this task into steps"
                    >
                      <span className="cell-strong">
                        {(t.subtasks?.length ?? 0) === 0
                          ? '—'
                          : `${t.subtasks.filter((x) => x.done).length}/${t.subtasks.length}`}
                      </span>
                      <span className="cell-log-add">＋</span>
                    </button>
                  </td>
                  <td className="nowrap">
                    <Scheduled dates={scheduledById.get(t.id)} />
                  </td>
                  <td>
                    <input className="cell-input" type="date" value={t.dueDate ?? ''} onChange={(e) => changeDue(t, e.target.value)} />
                  </td>
                  <td>
                    <select className="cell-input" value={t.status ?? 'Not Started'} onChange={(e) => changeStatus(t, e.target.value)}>
                      {STATUS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="cell-center">
                    <DifficultyDot
                      value={t.difficulty}
                      onChange={(difficulty) => updateTask(t.id, { difficulty })}
                    />
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => removeTask(t.id)} title="Delete task">✕</button>
                  </td>
                </tr>
                {openSubs === t.id && (
                  <tr className="row-log">
                    <td colSpan={11}>
                      <Subtasks
                        task={t}
                        today={today}
                        perDay={perDay}
                        add={addSubtask}
                        toggle={toggleSubtask}
                        update={updateSubtask}
                        remove={removeSubtask}
                      />
                    </td>
                  </tr>
                )}
                {log?.taskId === t.id && (
                  <tr className="row-log">
                    <td colSpan={11}>
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
  )

  return (
    <Card
      title="✅ Task Bank"
      subtitle={`Every task you might do lives here. Pick what you'll work on each day in the Daily Planner. Give a task a due date and its estimate fills in at ${perDay}h a day.`}
      className="card-wide"
    >
      <StudyCategoryDatalist />
      <form className="add-form" onSubmit={submit}>
        <input className="input input-grow" placeholder="Task…" value={draft.title} onChange={set('title')} />
        <input className="input" list={STUDY_CATEGORY_LIST} placeholder="Category" value={draft.category} onChange={set('category')} />
        <select className="input" value={draft.priority} onChange={set('priority')}>
          {PRIORITY.map((p) => <option key={p}>{p}</option>)}
        </select>
        <input className="input" type="date" value={draft.dueDate} onChange={setDraftDue} title="Due date — sets the estimate" />
        <input
          className="input input-num"
          type="number" min="0" step="0.25"
          value={draft.estHours}
          onChange={set('estHours')}
          title={`Estimated hours — filled in from the due date at ${perDay}h a day`}
        />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      {tasks.length === 0 ? (
        <Empty>No tasks yet — it starts empty on purpose. Add the first one above.</Empty>
      ) : (
        GROUPS.filter((g) => g.always || grouped.get(g.status).length > 0).map((g) => {
          const list = grouped.get(g.status)
          const hours = list.reduce((a, t) => a + (Number(t.estHours) || 0), 0)
          return (
            <details className="tb-group" key={g.status} open={g.open}>
              <summary className="tb-group-head">
                <span>{g.icon} {g.status}</span>
                <span className="sec-count">{list.length}</span>
                {list.length > 0 && g.status !== 'Completed' && (
                  <span className="tb-group-hours">{hrs(hours)} estimated</span>
                )}
              </summary>
              {list.length === 0 ? (
                <p className="sec-empty">Nothing {g.status.toLowerCase()} right now.</p>
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
                        <th>Steps</th>
                        <th>Scheduled</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th title="Difficulty — click a dot to change it">Diff.</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>{list.map(renderRow)}</tbody>
                  </table>
                </div>
              )}
            </details>
          )
        })
      )}
    </Card>
  )
}

/** Difficulty as a single dot: 🟢 Easy → 🟡 Medium → 🔴 Hard, click to cycle. */
function DifficultyDot({ value, onChange }) {
  const current = DIFFICULTY.includes(value) ? value : 'Medium'
  const next = DIFFICULTY[(DIFFICULTY.indexOf(current) + 1) % DIFFICULTY.length]
  return (
    <button
      type="button"
      className={`diff-dot diff-${current.toLowerCase()}`}
      onClick={() => onChange(next)}
      title={`${current} — click for ${next}`}
      aria-label={`Difficulty: ${current}. Click to change to ${next}.`}
    />
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

/**
 * The last day a step needs, at `perDay` hours a day from its start — the same
 * rule as a task's estimate, run the other way. 4h at 2h/day from the 7th ends
 * on the 8th.
 */
function stepEndFor(start, hours, perDay) {
  if (!start || !(hours > 0)) return ''
  const days = Math.max(1, Math.ceil(hours / perDay))
  return format(addDays(parseISO(start), days - 1), 'yyyy-MM-dd')
}

const STEP_BLANK = { title: '', hours: '', start: '', end: '' }

function Subtasks({ task, today, perDay, add, toggle, update, remove }) {
  const [draft, setDraft] = useState({ ...STEP_BLANK, start: today })
  // Until you pick an end date yourself, it follows the hours and start.
  const [endTouched, setEndTouched] = useState(false)
  const list = task.subtasks ?? []
  const done = list.filter((x) => x.done).length
  const stepHours = list.reduce((a, x) => a + (Number(x.hours) || 0), 0)
  const est = Number(task.estHours) || 0

  const setField = (k) => (e) => {
    const value = e.target.value
    setDraft((p) => {
      const next = { ...p, [k]: value }
      if (k !== 'end' && !endTouched) next.end = stepEndFor(next.start, Number(next.hours), perDay)
      return next
    })
    if (k === 'end') setEndTouched(true)
  }

  return (
    <div className="subs">
      <div className="subs-head">
        <strong>Steps for “{task.title}”</strong>
        {list.length > 0 && <span className="sec-count">{done} of {list.length} done</span>}
        {stepHours > 0 && (
          <span className={`subs-hours ${est && stepHours > est ? 'subs-hours-over' : ''}`}>
            {hrs(stepHours)} in steps{est ? ` of ${hrs(est)} estimated` : ''}
            {est && stepHours > est ? ' — more than the estimate' : ''}
          </span>
        )}
      </div>

      {list.length === 0 ? (
        <p className="day-task-empty">
          No steps yet. Steps are a checklist with their own hours and dates — they don't change
          your logged hours or scores.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="tbl subs-tbl">
            <thead>
              <tr>
                <th />
                <th className="th-text">Step</th>
                <th>Hours</th>
                <th>Start</th>
                <th>End</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr className={x.done ? 'row-done' : ''} key={x.id}>
                  <td className="cell-center">
                    <input type="checkbox" checked={x.done} onChange={() => toggle(task.id, x.id)} />
                  </td>
                  <td className="td-text">
                    <GrowText value={x.title} onChange={(e) => update(task.id, x.id, { title: e.target.value })} />
                  </td>
                  <td>
                    <input
                      className="cell-input cell-num"
                      type="number" min="0" step="0.25"
                      value={x.hours ?? ''}
                      onChange={(e) => update(task.id, x.id, { hours: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      type="date"
                      value={x.start ?? ''}
                      onChange={(e) => update(task.id, x.id, { start: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      type="date"
                      value={x.end ?? ''}
                      min={x.start || undefined}
                      onChange={(e) => update(task.id, x.id, { end: e.target.value })}
                    />
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => remove(task.id, x.id)} title="Delete step">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="add-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.title.trim()) return
          add(task.id, { ...draft, title: draft.title.trim(), hours: Number(draft.hours) || 0 })
          // Carry on from where this step ends, so a chain of steps lines up.
          setDraft({ ...STEP_BLANK, start: draft.end || draft.start || today })
          setEndTouched(false)
        }}
      >
        <input className="input input-grow" placeholder="Add a step…" value={draft.title} onChange={setField('title')} />
        <input
          className="input input-num"
          type="number" min="0" step="0.25"
          placeholder="hours"
          value={draft.hours}
          onChange={setField('hours')}
          title="How many hours this step will take"
        />
        <input className="input" type="date" value={draft.start} onChange={setField('start')} title="Start date" />
        <input
          className="input"
          type="date"
          value={draft.end}
          min={draft.start || undefined}
          onChange={setField('end')}
          title={`End date — worked out from the hours at ${perDay}h a day until you set it`}
        />
        <button className="btn btn-primary" type="submit">Add step</button>
      </form>
    </div>
  )
}

const OPEN_WITH_PROGRESS = (task, logged) =>
  logged > 0 && Number(task.estHours) > 0 && task.status !== 'Completed' && task.status !== 'Cancelled'

/** The name doubles as its own progress bar: hours logged against the estimate. */
function TaskName({ task, logged, onChange }) {
  if (!OPEN_WITH_PROGRESS(task, logged)) {
    return <GrowText value={task.title} onChange={onChange} />
  }
  const est = Number(task.estHours)
  const ratio = logged / est
  const over = ratio > 1
  return (
    <div
      className={`task-fill ${over ? 'task-fill-over' : ''}`}
      style={{ '--fill': `${Math.min(100, ratio * 100)}%` }}
      title={`${logged}h of ${est}h — ${Math.round(ratio * 100)}%${over ? ' (over estimate)' : ''}`}
    >
      <GrowText value={task.title} onChange={onChange} />
    </div>
  )
}
