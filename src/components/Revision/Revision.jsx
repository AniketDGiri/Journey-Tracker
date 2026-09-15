import { Fragment, useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { Card, Empty, GrowText, hrs } from '../common/ui'
import RevisionDoneDialog from './RevisionDoneDialog'
import { STUDY_CATEGORY_LIST, StudyCategoryDatalist } from '../common/categories'

const BLANK = { topic: '', category: '', nextReview: '', estHours: 0.25, completed: false, reviewCount: 0, lastReviewed: '', notes: '' }

const ORDER = { '🔴 Overdue': 0, '🟡 Due today': 1, '🟢 Scheduled': 2, '➕ set a date': 3, '✅ Complete': 4 }

export default function Revision() {
  const {
    revisions, days, sessions,
    addRevision, updateRevision, removeRevision, resolveRevision, addSession, stats,
  } = useAppStore()
  const [draft, setDraft] = useState({ ...BLANK, nextReview: stats.today.key })
  const [log, setLog] = useState(null)
  const [doneFor, setDoneFor] = useState(null)

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
    addRevision({ ...draft, topic: draft.topic.trim(), estHours: Number(draft.estHours) || 0 })
    setDraft({ ...BLANK, nextReview: draft.nextReview })
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
  const active = revisions.find((r) => r.id === doneFor) ?? null

  return (
    <Card
      title="🔄 Revision Tracker"
      subtitle="Add a topic and when you want to revise it. Each time you mark it revised, you choose the next date or close it off."
      actions={due > 0 ? <span className="pill pill-warn">{due} due now</span> : null}
      className="card-wide"
    >
      <StudyCategoryDatalist />
      <form className="add-form" onSubmit={submit}>
        <input className="input input-grow" placeholder="Topic to revise…" value={draft.topic} onChange={set('topic')} />
        <input className="input" list={STUDY_CATEGORY_LIST} placeholder="Category" value={draft.category} onChange={set('category')} />
        <input className="input" type="date" value={draft.nextReview} onChange={set('nextReview')} title="Revise on" />
        <input className="input input-num" type="number" min="0" step="0.25" value={draft.estHours} onChange={set('estHours')} title="Estimated hours per revision" />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      {sorted.length === 0 ? (
        <Empty>Nothing to revise yet. Add the first topic you've studied.</Empty>
      ) : (
        <div className="table-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th className="th-text">Topic</th><th>Category</th><th>Next revision</th><th>Status</th>
                <th>Est.</th><th>Actual ＋</th><th>Revised</th><th>Last</th><th>Planned for</th><th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <Fragment key={r.id}>
                  <tr className={`${r.completed ? 'row-done' : ''} ${r.status === '🔴 Overdue' ? 'row-alert' : ''}`}>
                    <td className="td-text"><GrowText value={r.topic} onChange={(e) => updateRevision(r.id, { topic: e.target.value })} /></td>
                    <td><input className="cell-input cell-narrow" list={STUDY_CATEGORY_LIST} value={r.category ?? ''} onChange={(e) => updateRevision(r.id, { category: e.target.value })} /></td>
                    <td>
                      <input
                        className="cell-input"
                        type="date"
                        value={r.nextReview ?? ''}
                        onChange={(e) => updateRevision(r.id, { nextReview: e.target.value, completed: false })}
                      />
                    </td>
                    <td className="nowrap">{r.status}</td>
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
                    <td className="cell-center">{r.reviewCount || '—'}</td>
                    <td className="nowrap muted">{r.lastReviewed || '—'}</td>
                    <td className="nowrap"><Scheduled dates={scheduledById.get(r.id)} /></td>
                    <td className="nowrap">
                      {r.completed ? (
                        <button
                          className="btn btn-sm"
                          onClick={() => updateRevision(r.id, { completed: false, nextReview: stats.today.key })}
                          title="Put this topic back into rotation"
                        >
                          Reopen
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-primary" onClick={() => setDoneFor(r.id)}>
                          Mark revised
                        </button>
                      )}
                      <button className="btn-icon" onClick={() => removeRevision(r.id)} title="Delete topic">✕</button>
                    </td>
                  </tr>
                  {log?.revId === r.id && (
                    <tr className="row-log">
                      <td colSpan={10}>
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
        Est. hours count toward the day you pick the topic for in the Planner.
      </p>

      <RevisionDoneDialog
        revision={active}
        today={stats.today.key}
        onCancel={() => setDoneFor(null)}
        onResolve={(result) => {
          resolveRevision(active.id, result)
          setDoneFor(null)
        }}
      />
    </Card>
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
