import { useMemo } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { Card } from '../common/ui'

const CLOSED = new Set(['Completed', 'Cancelled'])

const late = (dateKey, today) => {
  const n = differenceInCalendarDays(parseISO(today), parseISO(dateKey))
  return `${n} day${n === 1 ? '' : 's'} late`
}

/** Task Bank tasks due today and revisions to do today — plus anything overdue. */
export default function DueToday() {
  const { tasks, revisions, sessions, stats } = useAppStore()
  const today = stats.today.key

  const loggedByName = useMemo(() => {
    const m = new Map()
    for (const s of sessions) {
      if (s.task) m.set(s.task, (m.get(s.task) ?? 0) + (Number(s.duration) || 0))
    }
    return m
  }, [sessions])

  const { dueToday, overdue } = useMemo(() => {
    const items = []
    for (const t of tasks) {
      if (!t.dueDate || CLOSED.has(t.status)) continue
      const est = Number(t.estHours) || 0
      const left = Math.max(0, est - (loggedByName.get(t.title) ?? 0))
      items.push({
        id: t.id,
        kind: 'task',
        title: t.title,
        date: t.dueDate,
        meta: [t.category, est ? `${Math.round(left * 10) / 10}h left` : null, t.status],
      })
    }
    for (const r of revisions) {
      if (!r.nextReview || r.completed) continue
      items.push({
        id: r.id,
        kind: 'revision',
        title: r.topic,
        date: r.nextReview,
        meta: [r.category, r.estHours ? `${r.estHours}h` : null, r.reviewCount ? `revised ${r.reviewCount}×` : 'first revision'],
      })
    }
    const byDate = (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
    return {
      dueToday: items.filter((x) => x.date === today).sort(byDate),
      overdue: items.filter((x) => x.date < today).sort(byDate),
    }
  }, [tasks, revisions, loggedByName, today])

  const taskCount = dueToday.filter((x) => x.kind === 'task').length
  const revCount = dueToday.length - taskCount
  const subtitle =
    dueToday.length === 0 && overdue.length === 0
      ? 'Nothing due — a clear day'
      : [
          taskCount && `${taskCount} task${taskCount === 1 ? '' : 's'}`,
          revCount && `${revCount} revision${revCount === 1 ? '' : 's'}`,
          overdue.length && `${overdue.length} overdue`,
        ].filter(Boolean).join(' · ')

  return (
    <Card title="📌 Due today" subtitle={subtitle}>
      <DueList label="Today" items={dueToday} today={today} defaultOpen>
        Nothing in the Task Bank or Revision Tracker is due today.
      </DueList>
      {overdue.length > 0 && <DueList label="Overdue" items={overdue} today={today} over />}
    </Card>
  )
}

/**
 * A collapsible group. Today starts open; Overdue starts folded so a long
 * backlog doesn't push the rest of the dashboard down, but its count stays in
 * the header in red so it can't be missed.
 */
function DueList({ label, items, today, over = false, defaultOpen = false, children }) {
  return (
    <details className="due-group" open={defaultOpen}>
      <summary className={`due-label ${over ? 'due-label-over' : ''}`}>
        {label}
        <span className="sec-count">{items.length}</span>
      </summary>
      {items.length === 0 ? (
        <p className="note note-quiet">{children}</p>
      ) : (
      <ul className="due-list">
        {items.map((x) => (
          <li className={`due-item ${over ? 'due-item-over' : ''}`} key={`${x.kind}-${x.id}`}>
            <span className="due-kind" title={x.kind === 'task' ? 'Task Bank task' : 'Revision'}>
              {x.kind === 'task' ? '✅' : '🔄'}
            </span>
            <span className="due-title">{x.title}</span>
            <span className="due-meta">
              {[over ? late(x.date, today) : null, ...x.meta].filter(Boolean).join(' · ')}
            </span>
          </li>
        ))}
      </ul>
      )}
    </details>
  )
}
