import { format, endOfWeek, endOfMonth, parseISO } from '../../utils/dates'
import { useAppStore } from '../../store/AppStore'

function dateKey(d) {
  return format(d, 'yyyy-MM-dd')
}

const BUCKET_DEFS = [
  { key: 'overdue',   label: 'Overdue',    color: '#ef4444' },
  { key: 'today',     label: 'Today',      color: 'var(--accent)' },
  { key: 'week',      label: 'This Week',  color: '#0ea5e9' },
  { key: 'month',     label: 'This Month', color: '#22c55e' },
  { key: 'upcoming',  label: 'Upcoming',   color: 'var(--text-muted)' },
]

function bucket(tasks, today, weekEnd, monthEnd) {
  return {
    overdue:  tasks.filter(t => !t.done && t.dueDate < today),
    today:    tasks.filter(t => t.dueDate === today),
    week:     tasks.filter(t => t.dueDate > today && t.dueDate <= weekEnd),
    month:    tasks.filter(t => t.dueDate > weekEnd && t.dueDate <= monthEnd),
    upcoming: tasks.filter(t => t.dueDate > monthEnd),
  }
}

export default function ScheduledMini({ categoryIds, accentColor, showBuckets }) {
  const { scheduledTasks, toggleScheduledTask } = useAppStore()

  const today    = dateKey(new Date())
  const weekEnd  = dateKey(endOfWeek(new Date(), { weekStartsOn: 1 }))
  const monthEnd = dateKey(endOfMonth(new Date()))

  const relevant = scheduledTasks.filter(t => categoryIds.includes(t.category))
  if (relevant.length === 0) return null

  const buckets  = bucket(relevant, today, weekEnd, monthEnd)
  const defs     = showBuckets ? BUCKET_DEFS.filter(b => showBuckets.includes(b.key)) : BUCKET_DEFS
  const nonEmpty = defs.filter(b => buckets[b.key].length > 0)
  if (nonEmpty.length === 0) return null

  const visibleTasks = nonEmpty.flatMap(b => buckets[b.key])
  const totalPending = visibleTasks.filter(t => !t.done).length
  const totalDone    = visibleTasks.filter(t => t.done).length

  return (
    <div className="sched-mini">
      <div className="sched-mini-header">
        <span className="sched-mini-dot" style={{ background: accentColor || 'var(--accent)' }} />
        <span className="sched-mini-title">Scheduled Tasks</span>
        <span className={`count-pill${totalPending === 0 ? ' all-done' : ''}`}>
          {totalDone}/{relevant.length}
        </span>
      </div>

      <div className="sched-mini-groups">
        {defs.filter(b => buckets[b.key].length > 0).map(def => (
          <div key={def.key} className="sched-mini-group">
            <span className="sched-mini-group-label" style={{ color: def.color }}>
              {def.label}
            </span>
            <ul className="task-list">
              {buckets[def.key].map(task => (
                <li key={task.id} className={`task-row${task.done ? ' done' : ''}`}>
                  <label className="task-label">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleScheduledTask(task.id)}
                    />
                    <span>{task.title}</span>
                  </label>
                  <span className="schedule-date-badge">
                    {format(parseISO(task.dueDate), 'MMM d')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
