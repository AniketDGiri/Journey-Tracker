import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { Card, Empty, GrowText, hrs } from '../common/ui'

const toMinutes = (t) => {
  const [h, m] = (t || '').split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

// Sessions that run past midnight wrap to the next day rather than going negative.
function durationFrom(start, end) {
  const a = toMinutes(start)
  const b = toMinutes(end)
  if (a === null || b === null) return null
  const mins = b - a + (b < a ? 1440 : 0)
  return Math.round((mins / 60) * 100) / 100
}

const clockOf = (d) => format(d, 'HH:mm')

export default function StudyLog() {
  const { sessions, addSession, updateSession, removeSession, tasks, revisions, settings, stats } = useAppStore()
  const [timer, setTimer] = useLocalStorage('jt.timer', null)
  const [now, setNow] = useState(() => Date.now())
  const [draft, setDraft] = useState({
    date: stats.today.key, start: '', end: '', duration: '', category: '', task: '', focus: 4, energy: 4, notes: '',
  })
  // What the timer is tracking. Held on the timer itself once running, so it
  // survives a reload mid-session.
  const [pending, setPending] = useState({ task: '', category: '', focus: 4 })
  const tracking = timer ?? pending
  const setTracking = (k) => (e) => {
    const v = k === 'focus' ? Number(e.target.value) : e.target.value
    if (timer) setTimer({ ...timer, [k]: v })
    else setPending((p) => ({ ...p, [k]: v }))
  }

  // Categories already in use, so the timer can offer them without a fixed list.
  const categories = useMemo(() => {
    const set = new Set()
    for (const x of sessions) if (x.category?.trim()) set.add(x.category.trim())
    for (const t of tasks) if (t.category?.trim()) set.add(t.category.trim())
    return [...set].sort()
  }, [sessions, tasks])

  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timer])

  const elapsed = timer ? (now - timer.startedAt) / 3_600_000 : 0
  const elapsedLabel = timer
    ? new Date(Math.max(0, now - timer.startedAt)).toISOString().slice(11, 19)
    : '— not running —'

  const stopTimer = () => {
    const startedAt = new Date(timer.startedAt)
    const endedAt = new Date()
    addSession({
      date: format(startedAt, 'yyyy-MM-dd'),
      start: clockOf(startedAt),
      end: clockOf(endedAt),
      duration: Math.max(0.01, Math.round(elapsed * 100) / 100),
      category: timer.category ?? '',
      task: timer.task ?? '',
      focus: timer.focus ?? 4,
      energy: 4,
      notes: '',
    })
    setPending({ task: timer.task ?? '', category: timer.category ?? '', focus: timer.focus ?? 4 })
    setTimer(null)
  }

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.start || '').localeCompare(a.start || '')),
    [sessions]
  )

  const submit = (e) => {
    e.preventDefault()
    const auto = durationFrom(draft.start, draft.end)
    const duration = draft.duration !== '' ? Number(draft.duration) : auto
    if (!draft.date || !duration) return
    addSession({ ...draft, duration, focus: Number(draft.focus), energy: Number(draft.energy) })
    setDraft((p) => ({ ...p, start: '', end: '', duration: '', notes: '' }))
  }

  const set = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.value }))

  return (
    <>
      <datalist id="task-titles">
        {tasks.map((t) => <option key={t.id} value={t.title} label="task" />)}
        {revisions.map((r) => <option key={r.id} value={r.topic} label="revision" />)}
      </datalist>
      <datalist id="study-categories">
        {categories.map((c) => <option key={c} value={c} />)}
      </datalist>

      <Card title="⏱️ Study timer" subtitle="Start it when you sit down. Stopping writes the session straight into the log.">
        <div className="timer">
          <div className="timer-clock">{elapsedLabel}</div>
          {timer ? (
            <button className="btn btn-danger" onClick={stopTimer}>⏹ Stop session</button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setTimer({ startedAt: Date.now(), ...pending })}
            >
              ▶ Start session
            </button>
          )}
          <div className="timer-meta">
            <span>Remaining today: <strong>{hrs(stats.today.remaining)}</strong></span>
            <span>Minimum win: <strong>{hrs(settings.minWin)}</strong></span>
          </div>
        </div>

        <div className="timer-fields">
          <input
            className="input input-grow"
            list="task-titles"
            placeholder="What are you working on? (task or revision topic)"
            value={tracking.task ?? ''}
            onChange={setTracking('task')}
          />
          <input
            className="input"
            list="study-categories"
            placeholder="Category"
            value={tracking.category ?? ''}
            onChange={setTracking('category')}
          />
          <label className="check-line check-line-sm">
            Focus
            <select className="input input-num" value={tracking.focus ?? 4} onChange={setTracking('focus')}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <p className="note note-quiet">
          {timer
            ? 'Still editable while running — whatever is here when you stop is what gets logged.'
            : 'Set these before you start and the session logs itself with them attached.'}
        </p>
      </Card>

      <Card
        title="⏱️ Study Log"
        subtitle="One row per session. Type start and end and the duration fills itself, or just type the hours. Multiple sessions a day add up."
        className="card-wide"
      >
        <form className="add-form" onSubmit={submit}>
          <input className="input" type="date" value={draft.date} onChange={set('date')} />
          <input className="input input-time" type="time" value={draft.start} onChange={set('start')} title="Start" />
          <input className="input input-time" type="time" value={draft.end} onChange={set('end')} title="End" />
          <input
            className="input input-num"
            type="number" min="0" step="0.25"
            placeholder={durationFrom(draft.start, draft.end)?.toFixed(2) ?? 'hours'}
            value={draft.duration}
            onChange={set('duration')}
            title="Duration (h) — overrides start/end"
          />
          <input className="input input-grow" list="task-titles" placeholder="Task or revision topic" value={draft.task} onChange={set('task')} />
          <select className="input input-num" value={draft.focus} onChange={set('focus')} title="Focus 1–5">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className="btn btn-primary" type="submit">Log</button>
        </form>

        {sorted.length === 0 ? (
          <Empty>No sessions logged yet. One session starts everything.</Empty>
        ) : (
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th><th>Start</th><th>End</th><th>Duration</th>
                  <th>Category</th><th className="th-wide">Task</th>
                  <th>Focus</th><th>Energy</th><th className="th-wide">Notes</th><th>XP</th><th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.id}>
                    <td><input className="cell-input" type="date" value={s.date ?? ''} onChange={(e) => updateSession(s.id, { date: e.target.value })} /></td>
                    <td><input className="cell-input cell-narrow" type="time" value={s.start ?? ''} onChange={(e) => updateSession(s.id, { start: e.target.value, duration: durationFrom(e.target.value, s.end) ?? s.duration })} /></td>
                    <td><input className="cell-input cell-narrow" type="time" value={s.end ?? ''} onChange={(e) => updateSession(s.id, { end: e.target.value, duration: durationFrom(s.start, e.target.value) ?? s.duration })} /></td>
                    <td><input className="cell-input cell-num" type="number" min="0" step="0.25" value={s.duration ?? 0} onChange={(e) => updateSession(s.id, { duration: Number(e.target.value) || 0 })} /></td>
                    <td><input className="cell-input cell-narrow" list="study-categories" value={s.category ?? ''} onChange={(e) => updateSession(s.id, { category: e.target.value })} /></td>
                    <td><input className="cell-input" list="task-titles" value={s.task ?? ''} onChange={(e) => updateSession(s.id, { task: e.target.value })} /></td>
                    <td>
                      <select className="cell-input cell-num" value={s.focus ?? 3} onChange={(e) => updateSession(s.id, { focus: Number(e.target.value) })}>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="cell-input cell-num" value={s.energy ?? 3} onChange={(e) => updateSession(s.id, { energy: Number(e.target.value) })}>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                    <td className="td-text"><GrowText value={s.notes} onChange={(e) => updateSession(s.id, { notes: e.target.value })} /></td>
                    <td className="cell-strong">{Math.round((s.duration ?? 0) * settings.xpHour)}</td>
                    <td><button className="btn-icon" onClick={() => removeSession(s.id)} title="Delete session">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="note note-quiet">
          Session XP here is indicative — the day's real XP is capped at {settings.xpCap} on the Daily Planner.
        </p>
      </Card>
    </>
  )
}
