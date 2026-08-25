import { useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import {
  todayKey,
  weekRangeLabel,
  monthLabel,
  format,
  endOfWeek,
  endOfMonth,
  parseISO,
} from '../../utils/dates'

function dateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

export const CATEGORIES = [
  { id: 'study',    label: 'Study Plan', color: '#6366f1' },
  { id: 'work',     label: 'Work',       color: '#0ea5e9' },
  { id: 'personal', label: 'Personal',   color: '#22c55e' },
]

export function getCat(id) {
  return CATEGORIES.find(c => c.id === id) || null
}

function CategoryBadge({ categoryId }) {
  const cat = getCat(categoryId)
  if (!cat) return null
  return (
    <span
      className="sched-cat-badge"
      style={{ background: cat.color + '20', color: cat.color }}
    >
      {cat.label}
    </span>
  )
}

function SubtaskBlock({ taskId, subtasks = [], onAdd, onToggle, onRemove }) {
  const [draft, setDraft]   = useState('')
  const [adding, setAdding] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    const v = draft.trim()
    if (!v) { setAdding(false); return }
    onAdd?.(taskId, v)
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="subtask-block">
      {subtasks.length > 0 && (
        <ul className="subtask-list">
          {subtasks.map((sub) => (
            <li key={sub.id} className={`subtask-row${sub.done ? ' done' : ''}`}>
              <label className="task-label">
                <input type="checkbox" checked={sub.done} onChange={() => onToggle?.(taskId, sub.id)} />
                <span>{sub.title}</span>
              </label>
              <button type="button" className="icon-btn subtask-del" onClick={() => onRemove?.(taskId, sub.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <form className="subtask-add-form" onSubmit={submit}>
          <input
            autoFocus
            type="text"
            placeholder="Subtask name…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (!draft.trim()) setAdding(false) }}
          />
          <button type="submit">Add</button>
          <button type="button" className="icon-btn" onClick={() => setAdding(false)}>✕</button>
        </form>
      ) : (
        <button type="button" className="subtask-new-btn" onClick={() => setAdding(true)}>+ subtask</button>
      )}
    </div>
  )
}

function ScheduleGroup({ title, subtitle, accent, tasks, onToggle, onRemove, onAddSubtask, onToggleSubtask, onRemoveSubtask, emptyText }) {
  const pending = tasks.filter((t) => !t.done).length

  return (
    <div className="schedule-group">
      <div className="schedule-group-header">
        <span className="schedule-group-dot" style={{ background: accent }} />
        <span className="schedule-group-title">{title}</span>
        {subtitle && <span className="schedule-group-sub">{subtitle}</span>}
        {tasks.length > 0 && (
          <span className={`count-pill${pending === 0 ? ' all-done' : ''}`}>
            {tasks.length - pending}/{tasks.length}
          </span>
        )}
      </div>

      {tasks.length === 0 && emptyText ? (
        <p className="schedule-empty">{emptyText}</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => {
            const subtasks = task.subtasks || []
            const subDone  = subtasks.filter((s) => s.done).length
            return (
              <li key={task.id} className="task-item">
                <div className={`task-row${task.done ? ' done' : ''}`}>
                  <label className="task-label">
                    <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
                    <span>{task.title}</span>
                    {subtasks.length > 0 && (
                      <span className="subtask-count">{subDone}/{subtasks.length}</span>
                    )}
                  </label>
                  <div className="task-row-actions">
                    {task.category && <CategoryBadge categoryId={task.category} />}
                    <span className="schedule-date-badge">{format(parseISO(task.dueDate), 'MMM d')}</span>
                    <button type="button" className="icon-btn" title="Remove task" onClick={() => onRemove(task.id)}>✕</button>
                  </div>
                </div>
                <SubtaskBlock
                  taskId={task.id}
                  subtasks={subtasks}
                  onAdd={onAddSubtask}
                  onToggle={onToggleSubtask}
                  onRemove={onRemoveSubtask}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function Schedule() {
  const {
    scheduledTasks, addScheduledTask, removeScheduledTask, toggleScheduledTask,
    addScheduledSubtask, toggleScheduledSubtask, removeScheduledSubtask,
  } = useAppStore()

  const [title, setTitle]       = useState('')
  const [dueDate, setDueDate]   = useState(todayKey())
  const [category, setCategory] = useState('study')
  const [filter, setFilter]     = useState('all')

  const today    = todayKey()
  const weekEnd  = dateKey(endOfWeek(new Date(), { weekStartsOn: 1 }))
  const monthEnd = dateKey(endOfMonth(new Date()))

  const visible = filter === 'all'
    ? scheduledTasks
    : scheduledTasks.filter(t => t.category === filter)

  const sorted    = [...visible].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const overdue   = sorted.filter(t => !t.done && t.dueDate < today)
  const todayT    = sorted.filter(t => t.dueDate === today)
  const weekT     = sorted.filter(t => t.dueDate > today && t.dueDate <= weekEnd)
  const monthT    = sorted.filter(t => t.dueDate > weekEnd && t.dueDate <= monthEnd)
  const upcomingT = sorted.filter(t => t.dueDate > monthEnd)

  const handleAdd = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || !dueDate) return
    addScheduledTask({ title: trimmed, dueDate, category })
    setTitle('')
    setDueDate(todayKey())
  }

  return (
    <div className="tab-panel">
      <div className="section-header-row">
        <h2>Schedule</h2>
      </div>
      <p className="muted">
        Add tasks with a due date and a label — they automatically appear in the relevant tab.
      </p>

      {/* Add form */}
      <form className="schedule-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          className="schedule-add-input"
          placeholder="What needs to be done?"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <input
          type="date"
          className="schedule-add-date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
        {/* Category selector */}
        <div className="sched-cat-select">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              className={`sched-cat-pill${category === c.id ? ' active' : ''}`}
              style={category === c.id
                ? { borderColor: c.color, color: c.color, background: c.color + '18' }
                : {}}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button type="submit" className="schedule-add-btn">Add task</button>
      </form>

      {/* Filter pills */}
      <div className="sched-filter-row">
        <span className="sched-filter-label">Show:</span>
        {[{ id: 'all', label: 'All' }, ...CATEGORIES].map(c => (
          <button
            key={c.id}
            type="button"
            className={`phase-pill${filter === c.id ? ' active' : ''}`}
            style={filter === c.id && c.color
              ? { borderColor: c.color, color: c.color, background: c.color + '18' }
              : {}}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grouped task lists */}
      <div className="schedule-columns">
        {overdue.length > 0 && (
          <ScheduleGroup
            title="Overdue"
            accent="#ef4444"
            tasks={overdue}
            onToggle={toggleScheduledTask}
            onRemove={removeScheduledTask}
            onAddSubtask={addScheduledSubtask}
            onToggleSubtask={toggleScheduledSubtask}
            onRemoveSubtask={removeScheduledSubtask}
          />
        )}
        <ScheduleGroup
          title="Today"
          subtitle={format(new Date(), 'EEEE, MMMM d')}
          accent="var(--accent)"
          tasks={todayT}
          onToggle={toggleScheduledTask}
          onRemove={removeScheduledTask}
          emptyText="Nothing due today — enjoy the clear slate!"
        />
        <ScheduleGroup
          title="This Week"
          subtitle={weekRangeLabel()}
          accent="#0ea5e9"
          tasks={weekT}
          onToggle={toggleScheduledTask}
          onRemove={removeScheduledTask}
          emptyText="Nothing else due this week."
        />
        <ScheduleGroup
          title="This Month"
          subtitle={monthLabel()}
          accent="#22c55e"
          tasks={monthT}
          onToggle={toggleScheduledTask}
          onRemove={removeScheduledTask}
          emptyText="Nothing else due this month."
        />
        {upcomingT.length > 0 && (
          <ScheduleGroup
            title="Upcoming"
            accent="var(--text-muted)"
            tasks={upcomingT}
            onToggle={toggleScheduledTask}
            onRemove={removeScheduledTask}
            onAddSubtask={addScheduledSubtask}
            onToggleSubtask={toggleScheduledSubtask}
            onRemoveSubtask={removeScheduledSubtask}
          />
        )}
      </div>
    </div>
  )
}
