import { useState } from 'react'
import ProgressBar from './ProgressBar'

function SubtaskList({ taskId, subtasks = [], onAdd, onToggle, onRemove }) {
  const [draft, setDraft]       = useState('')
  const [adding, setAdding]     = useState(false)

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
                <input
                  type="checkbox"
                  checked={sub.done}
                  onChange={() => onToggle?.(taskId, sub.id)}
                />
                <span>{sub.title}</span>
              </label>
              <button
                type="button"
                className="icon-btn subtask-del"
                title="Remove subtask"
                onClick={() => onRemove?.(taskId, sub.id)}
              >
                ✕
              </button>
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
        <button
          type="button"
          className="subtask-new-btn"
          onClick={() => setAdding(true)}
        >
          + subtask
        </button>
      )}
    </div>
  )
}

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
  // subtask handlers for regular tasks
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  // subtask handlers for scheduled items
  onAddScheduledSubtask,
  onToggleScheduledSubtask,
  onRemoveScheduledSubtask,
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
          const checked  = !!completions[task.id]?.[periodKey]
          const subtasks = task.subtasks || []
          const subDone  = subtasks.filter((s) => s.done).length
          return (
            <li key={task.id} className="task-item">
              <div className={`task-row${checked ? ' done' : ''}`}>
                <label className="task-label">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(task.id, periodKey)}
                  />
                  <span>{task.title}</span>
                  {subtasks.length > 0 && (
                    <span className="subtask-count">{subDone}/{subtasks.length}</span>
                  )}
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
              </div>
              <SubtaskList
                taskId={task.id}
                subtasks={subtasks}
                onAdd={onAddSubtask}
                onToggle={onToggleSubtask}
                onRemove={onRemoveSubtask}
              />
            </li>
          )
        })}

        {scheduledItems.map((task) => {
          const subtasks = task.subtasks || []
          const subDone  = subtasks.filter((s) => s.done).length
          return (
            <li key={task.id} className="task-item">
              <div className={`task-row${task.done ? ' done' : ''}`}>
                <label className="task-label">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => onToggleScheduled && onToggleScheduled(task.id)}
                  />
                  <span>{task.title}</span>
                  {subtasks.length > 0 && (
                    <span className="subtask-count">{subDone}/{subtasks.length}</span>
                  )}
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
              </div>
              <SubtaskList
                taskId={task.id}
                subtasks={subtasks}
                onAdd={onAddScheduledSubtask}
                onToggle={onToggleScheduledSubtask}
                onRemove={onRemoveScheduledSubtask}
              />
            </li>
          )
        })}
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
