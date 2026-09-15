import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { Card, Empty, GrowText, hrs } from '../common/ui'
import { STUDY_CATEGORY_LIST, StudyCategoryDatalist } from '../common/categories'

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

export const BLOCK_CHOICES = [15, 25, 30, 45, 60]

const hhmmss = (ms) => new Date(Math.max(0, ms)).toISOString().slice(11, 19)

/**
 * Time a session has actually earned. Once a block runs out the clock stops
 * there and waits — so forgetting to stop costs you one block at most, however
 * long you are away.
 */
export function timerElapsedMs(timer, now) {
  if (!timer) return 0
  const blockMs = timer.blockMinutes * 60_000
  const inBlock = timer.blockStartedAt == null ? 0 : Math.min(now - timer.blockStartedAt, blockMs)
  return (timer.bankedMs ?? 0) + Math.max(0, inBlock)
}

export const blockIsUp = (timer, now) =>
  timer?.blockStartedAt != null && now - timer.blockStartedAt >= timer.blockMinutes * 60_000

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

  // Only things still open are worth suggesting — a finished task or a closed
  // revision is not what you are about to sit down and do.
  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled'),
    [tasks]
  )
  const openRevisions = useMemo(() => revisions.filter((r) => !r.completed), [revisions])

  const [blockMinutes, setBlockMinutes] = useLocalStorage('jt.blockMinutes', 30)

  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timer])

  const elapsedMs = timerElapsedMs(timer, now)
  const elapsedLabel = timer ? hhmmss(elapsedMs) : '— not running —'
  const asking = blockIsUp(timer, now)
  const blockLeftMs =
    timer?.blockStartedAt == null ? 0 : timer.blockMinutes * 60_000 - (now - timer.blockStartedAt)

  // One notification per finished block, and the tab title says it too in case
  // notifications are blocked.
  const notifiedFor = useRef(null)
  useEffect(() => {
    if (!asking) {
      document.title = 'Journey Tracker'
      return
    }
    const stamp = timer.blockStartedAt
    if (notifiedFor.current === stamp) return
    notifiedFor.current = stamp
    document.title = `⏰ ${timer.blockMinutes}m done — still studying?`
    try {
      if (window.Notification?.permission === 'granted') {
        new Notification(`${timer.blockMinutes} minutes done`, {
          body: timer.task ? `Still on "${timer.task}"?` : 'Keep going, or stop and log it?',
          tag: 'jt-block',
        })
      }
    } catch {
      // notifications unavailable — the in-page prompt still shows
    }
  }, [asking, timer])

  useEffect(() => () => { document.title = 'Journey Tracker' }, [])

  const startTimer = () => {
    try {
      if (window.Notification?.permission === 'default') Notification.requestPermission()
    } catch {
      // not supported; the in-page prompt is enough
    }
    setTimer({
      startedAt: Date.now(),
      blockStartedAt: Date.now(),
      blockMinutes,
      bankedMs: 0,
      ...pending,
    })
  }

  const continueTimer = () =>
    setTimer({
      ...timer,
      bankedMs: (timer.bankedMs ?? 0) + timer.blockMinutes * 60_000,
      blockStartedAt: Date.now(),
    })

  const stopTimer = () => {
    const startedAt = new Date(timer.startedAt)
    const total = timerElapsedMs(timer, Date.now())
    addSession({
      date: format(startedAt, 'yyyy-MM-dd'),
      start: clockOf(startedAt),
      end: clockOf(new Date(startedAt.getTime() + total)),
      duration: Math.max(0.01, Math.round((total / 3_600_000) * 100) / 100),
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
        {openTasks.map((t) => <option key={t.id} value={t.title} label="task" />)}
        {openRevisions.map((r) => <option key={r.id} value={r.topic} label="revision" />)}
      </datalist>
      <StudyCategoryDatalist />

      <Card
        title="⏱️ Study timer"
        subtitle={`Runs in ${blockMinutes}-minute blocks. When one ends the clock pauses and asks if you're still going, so forgetting to stop costs one block at most.`}
      >
        <div className="timer">
          <div className="timer-clock">{elapsedLabel}</div>
          {timer ? (
            <button className="btn btn-danger" onClick={stopTimer}>⏹ Stop &amp; log</button>
          ) : (
            <button className="btn btn-primary" onClick={startTimer}>▶ Start session</button>
          )}
          <label className="check-line check-line-sm">
            Block
            <select
              className="input input-num"
              value={timer ? timer.blockMinutes : blockMinutes}
              disabled={Boolean(timer)}
              onChange={(e) => setBlockMinutes(Number(e.target.value))}
            >
              {BLOCK_CHOICES.map((n) => <option key={n} value={n}>{n}m</option>)}
            </select>
          </label>
          <div className="timer-meta">
            {timer && !asking && (
              <span>Block ends in <strong>{hhmmss(blockLeftMs)}</strong></span>
            )}
            <span>Remaining today: <strong>{hrs(stats.today.remaining)}</strong></span>
            <span>Minimum win: <strong>{hrs(settings.minWin)}</strong></span>
          </div>
        </div>

        {timer && !asking && (
          <div className="bar-track" style={{ height: 6 }}>
            <div
              className="bar-fill bar-accent"
              style={{ width: `${100 - (blockLeftMs / (timer.blockMinutes * 60_000)) * 100}%` }}
            />
          </div>
        )}

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
            list={STUDY_CATEGORY_LIST}
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

        {asking && (
          <div className="modal-backdrop">
            <div className="modal" role="dialog" aria-modal="true" aria-label="Block finished">
              <h3 className="modal-title">{timer.blockMinutes} minutes done</h3>
              <p className="note">
                {timer.task ? <>Still on <strong>{timer.task}</strong>?</> : 'Still studying?'}
                {' '}The clock is paused at <strong>{hhmmss(elapsedMs)}</strong> and will not count
                the time you spent away.
              </p>
              <div className="modal-actions">
                <button className="btn" type="button" onClick={stopTimer}>
                  ⏹ Stop &amp; log {hhmmss(elapsedMs)}
                </button>
                <button className="btn btn-primary" type="button" onClick={continueTimer}>
                  ▶ Another {timer.blockMinutes} minutes
                </button>
              </div>
            </div>
          </div>
        )}
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
                    <td><input className="cell-input cell-narrow" list={STUDY_CATEGORY_LIST} value={s.category ?? ''} onChange={(e) => updateSession(s.id, { category: e.target.value })} /></td>
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
