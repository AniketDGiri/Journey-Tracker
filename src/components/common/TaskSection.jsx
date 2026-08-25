import { useState } from 'react'
import ProgressBar from './ProgressBar'

export default function TaskSection({
  title,
  periodLabel,
  tasks,
  periodKey,
  completions,
  onToggle,
  onAdd,
  onRemove,
  renderExtra,
  color = '#6366f1',
  emptyHint = 'No tasks yet — add one below.',
  scheduledItems = [],
  onToggleScheduled,
  onRemoveScheduled,
}) {
  const [draft, setDraft] = useState('')

  const regularDone   = tasks.filter((t) => completions[t.id]?.[periodKey]).length
  const scheduledDone = scheduledItems.filter((t) => t.done).length
  const doneCount  = regularDone + scheduledDone
  const totalCount = tasks.length + scheduledItems.length
  const ratio = totalCount ? doneCount / totalCount : 0

  const submit = (e) => {
    e.preventDefault()
    const value = draft.trim()
    if (!value) return
    onAdd(value)
    setDraft('')
  }

  return (
    <div className="task-section">
      <div className="task-section-header">
        <div>
          <h3>{title}</h3>
          {periodLabel && <span className="period-label">{periodLabel}</span>}
        </div>
        <span className={`count-pill${doneCount === totalCount && totalCount > 0 ? ' all-done' : ''}`}>
          {doneCount}/{totalCount}
        </span>
      </div>

      <ProgressBar value={ratio} color={color} />

      <ul className="task-list">
        {totalCount === 0 && (
          <li className="empty-hint">{emptyHint}</li>
        )}
        {tasks.map((task) => {
          const checked = !!completions[task.id]?.[periodKey]
          return (
            <li key={task.id} className={`task-row ${checked ? 'done' : ''}`}>
              <label className="task-label">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(task.id, periodKey)}
                />
                <span>{task.title}</span>
              </label>
              <div className="task-row-actions">
                {renderExtra && renderExtra(task)}
                <button
                  type="button"
                  className="icon-btn"
                  title="Remove task"
                  onClick={() => onRemove(task.id)}
                >
                  ✕
                </button>
              </div>
            </li>
          )
        })}
        {scheduledItems.map((task) => (
          <li key={task.id} className={`task-row${task.done ? ' done' : ''}`}>
            <label className="task-label">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => onToggleScheduled && onToggleScheduled(task.id)}
              />
              <span>{task.title}</span>
            </label>
            <div className="task-row-actions">
              <span className="sched-inline-badge" title="From Schedule tab">📅</span>
              {onRemoveScheduled && (
                <button
                  type="button"
                  className="icon-btn"
                  title="Remove task"
                  onClick={() => onRemoveScheduled(task.id)}
                >
                  ✕
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form className="add-task-form" onSubmit={submit}>
        <input
          type="text"
          placeholder={`Add a ${title.toLowerCase()} task…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
