import { Fragment, useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { Card, Empty, GrowText, hrs } from '../common/ui'

const BLANK = { topic: '', category: '', firstStudied: '', confidence: 3, estHours: 0.25, r1Done: false, r2Done: false, r3Done: false, notes: '' }

const ORDER = { '🔴 Overdue': 0, '🟡 Due today': 1, '🟢 Scheduled': 2, '➕ add first-studied date': 3, '✅ cycle complete': 4 }

export default function Revision() {
  const { revisions, days, sessions, addRevision, updateRevision, removeRevision, addSession, stats } = useAppStore()
  const [draft, setDraft] = useState({ ...BLANK, firstStudied: stats.today.key })
  const [log, setLog] = useState(null)

  // Actual hours roll up from the Study Log by matching the topic name.
  const actualByTopic = useMemo(() => {
    const m = new Map()
    for (const s of sessions) {
      if (!s.task) continue
      m.set(s.task, (m.get(s.task) ?? 0) + (Number(s.duration) || 0))
    }
    return m
  }, [sessions])

  const submitLog = (e) => {
    e.preventDefault()
    const hours = Number(log.hours)
    if (!log.date || !hours) return
    const rev = revisions.find((r) => r.id === log.revId)
    addSession({
      date: log.date, start: '', end: '', duration: hours,
      category: rev?.category ?? '', task: rev?.topic ?? '',
      focus: 4, energy: 4, notes: '',
    })
    setLog(null)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!draft.topic.trim()) return
    addRevision({ ...draft, topic: draft.topic.trim(), confidence: Number(draft.confidence), estHours: Number(draft.estHours) || 0 })
    setDraft({ ...BLANK, firstStudied: draft.firstStudied })
  }
  const set = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.value }))

  // Which days each topic has been picked for in the Planner.
  const scheduledById = useMemo(() => {
    const m = new Map()
    for (const d of days) {
      for (const r of d.pickedRevisions) {
        if (!m.has(r.id)) m.set(r.id, [])
        m.get(r.id).push(d.key)
      }
    }
    return m
  }, [days])

  const sorted = [...revisions].sort(
    (a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || (a.nextReview ?? '').localeCompare(b.nextReview ?? '')
  )
  const due = revisions.filter((r) => r.status === '🔴 Overdue' || r.status === '🟡 Due today').length

  return (
    <Card
      title="🔄 Revision Tracker"
      subtitle="Add a topic and the review dates schedule themselves from your confidence — low confidence means tighter intervals."
      actions={due > 0 ? <span className="pill pill-warn">{due} due now</span> : null}
      className="card-wide"
    >
      <form className="add-form" onSubmit={submit}>
        <input className="input input-grow" placeholder="Topic…" value={draft.topic} onChange={set('topic')} />
        <input className="input" placeholder="Category" value={draft.category} onChange={set('category')} />
        <input className="input" type="date" value={draft.firstStudied} onChange={set('firstStudied')} title="First studied" />
        <select className="input input-num" value={draft.confidence} onChange={set('confidence')} title="Confidence 1–5">
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <input className="input input-num" type="number" min="0" step="0.25" value={draft.estHours} onChange={set('estHours')} title="Estimated hours per review" />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      {sorted.length === 0 ? (
        <Empty>Nothing to revise yet. Add the first topic you've studied.</Empty>
      ) : (
        <div className="table-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th className="th-text">Topic</th><th>Category</th><th>First studied</th><th>Conf.</th><th>Est.</th><th>Actual ＋</th>
                <th>R1</th><th>✓</th><th>R2</th><th>✓</th><th>R3</th><th>✓</th>
                <th>Next review</th><th>Status</th><th>Scheduled</th><th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <Fragment key={r.id}>
                <tr className={r.status === '🔴 Overdue' ? 'row-alert' : ''}>
                  <td className="td-text"><GrowText value={r.topic} onChange={(e) => updateRevision(r.id, { topic: e.target.value })} /></td>
                  <td><input className="cell-input cell-narrow" value={r.category ?? ''} onChange={(e) => updateRevision(r.id, { category: e.target.value })} /></td>
                  <td><input className="cell-input" type="date" value={r.firstStudied ?? ''} onChange={(e) => updateRevision(r.id, { firstStudied: e.target.value })} /></td>
                  <td>
                    <select className="cell-input cell-num" value={r.confidence ?? 3} onChange={(e) => updateRevision(r.id, { confidence: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="cell-input cell-num" type="number" min="0" step="0.25" value={r.estHours ?? 0} onChange={(e) => updateRevision(r.id, { estHours: Number(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <button
                      className="cell-log"
                      type="button"
                      onClick={() => setLog({ revId: r.id, date: stats.today.key, hours: '' })}
                      title={`Log hours for "${r.topic}"`}
                    >
                      <span className="cell-strong">{hrs(actualByTopic.get(r.topic) ?? 0)}</span>
                      <span className="cell-log-add">＋</span>
                    </button>
                  </td>
                  {[0, 1, 2].map((i) => (
                    <Review key={i} due={r.dues[i]} done={r[`r${i + 1}Done`] === true} onToggle={(v) => updateRevision(r.id, { [`r${i + 1}Done`]: v })} />
                  ))}
                  <td className="nowrap cell-strong">{r.nextReview ?? '—'}</td>
                  <td className="nowrap">{r.status}</td>
                  <td className="nowrap"><Scheduled dates={scheduledById.get(r.id)} /></td>
                  <td><button className="btn-icon" onClick={() => removeRevision(r.id)} title="Delete topic">✕</button></td>
                </tr>
                {log?.revId === r.id && (
                  <tr className="row-log">
                    <td colSpan={16}>
                      <form className="log-form" onSubmit={submitLog}>
                        <span>Log hours for <strong>{r.topic}</strong></span>
                        <input className="input" type="date" value={log.date} onChange={(e) => setLog((p) => ({ ...p, date: e.target.value }))} />
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
      <p className="note note-quiet">
        Intervals are measured from the first-studied date: confidence 1–2 → +1/+4/+10 days, 3 → +2/+7/+21, 4–5 → +3/+10/+30.
        Est. hours count toward the day you pick the topic for in the Planner.
      </p>
    </Card>
  )
}

function Review({ due, done, onToggle }) {
  return (
    <>
      <td className="nowrap muted">{due ?? '—'}</td>
      <td className="cell-center">
        <input type="checkbox" checked={done} onChange={(e) => onToggle(e.target.checked)} />
      </td>
    </>
  )
}

function Scheduled({ dates }) {
  if (!dates || dates.length === 0) return <span className="muted">—</span>
  const last = dates[dates.length - 1]
  return (
    <span title={dates.join(', ')}>
      {last}
      {dates.length > 1 ? <span className="muted"> +{dates.length - 1}</span> : null}
    </span>
  )
}
