import { useState } from 'react'
import { GrowText } from '../common/ui'
import { useAppStore } from '../../store/AppStore'
import { calendarLink } from '../../utils/googleCalendar'
import { isOverdue, rangeLabel, spansDays } from '../../utils/taskDates'

const NEW = '__new__'

/**
 * Category picker. A task's existing value is always offered even if it is not
 * in the list, so a category can never be silently lost, and "New category…"
 * swaps in a text box rather than sending you to a settings screen.
 */
export function CategorySelect({ value, onChange, className = 'cell-input cell-narrow' }) {
  const { personalCategories, addPersonalCategory } = useAppStore()
  const [adding, setAdding] = useState(false)

  const options = personalCategories.includes(value) || !value
    ? personalCategories
    : [...personalCategories, value]

  if (adding) {
    const commit = (name) => {
      const clean = name.trim()
      if (clean) {
        addPersonalCategory(clean)
        onChange(clean)
      }
      setAdding(false)
    }
    return (
      <input
        className={className}
        autoFocus
        placeholder="New category…"
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(e.target.value) }
          if (e.key === 'Escape') setAdding(false)
        }}
      />
    )
  }

  return (
    <select
      className={className}
      value={value ?? ''}
      onChange={(e) => (e.target.value === NEW ? setAdding(true) : onChange(e.target.value))}
    >
      <option value="">— none —</option>
      {options.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value={NEW}>＋ New category…</option>
    </select>
  )
}

export const PRIORITY = ['High', 'Medium', 'Low']
export const EFFORT = ['Small', 'Medium', 'Large']

export function CalendarCell({ task }) {
  if (!task.start && !task.end) return <span className="muted">—</span>
  return (
    <a
      className="link-btn"
      href={calendarLink(task)}
      target="_blank"
      rel="noreferrer"
      title="Open Google Calendar with this event prefilled"
    >
      📅 add ↗
    </a>
  )
}

/**
 * The one task row used by the List, Projects and Date views, so a task looks
 * and edits the same wherever you meet it.
 */
export default function TaskTable({
  tasks, sections, projects = [], update, remove, today,
  showProject = false, showSection = true, emptyLabel = 'No tasks here.',
}) {
  const cols = 9 + (showProject ? 1 : 0) + (showSection ? 1 : 0)

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th />
          <th className="th-text">Name</th>
          <th>Starts</th>
          <th>Ends</th>
          <th>When</th>
          <th>Priority</th>
          <th>Effort</th>
          <th>Category</th>
          {showProject && <th>Project</th>}
          <th>Calendar</th>
          {showSection && <th>Section</th>}
          <th />
        </tr>
      </thead>
      <tbody>
        {tasks.length === 0 && (
          <tr><td colSpan={cols} className="sec-empty">{emptyLabel}</td></tr>
        )}
        {tasks.map((t) => {
          const isDone = t.section === 'done'
          const overdue = isOverdue(t, today)
          return (
            <tr key={t.id} className={`${isDone ? 'row-done' : ''} ${overdue ? 'row-alert' : ''}`}>
              <td className="cell-center">
                <input
                  type="checkbox"
                  checked={isDone}
                  title="Mark done"
                  onChange={(e) => update(t.id, { section: e.target.checked ? 'done' : 'todo' })}
                />
              </td>
              <td className="td-text">
                <GrowText value={t.title} onChange={(e) => update(t.id, { title: e.target.value })} />
              </td>
              <td>
                <input
                  className="cell-input cell-dt"
                  type="datetime-local"
                  value={t.start ?? ''}
                  onChange={(e) => update(t.id, { start: e.target.value })}
                />
              </td>
              <td>
                <input
                  className="cell-input cell-dt"
                  type="datetime-local"
                  value={t.end ?? ''}
                  min={t.start || undefined}
                  onChange={(e) => update(t.id, { end: e.target.value })}
                />
              </td>
              <td className="nowrap">
                {rangeLabel(t)}
                {spansDays(t) && <span className="span-chip">multi-day</span>}
              </td>
              <td>
                <select className={`cell-input chip chip-${(t.priority ?? '').toLowerCase()}`} value={t.priority ?? 'Medium'} onChange={(e) => update(t.id, { priority: e.target.value })}>
                  {PRIORITY.map((p) => <option key={p}>{p}</option>)}
                </select>
              </td>
              <td>
                <select className={`cell-input chip chip-${(t.effort ?? '').toLowerCase()}`} value={t.effort ?? 'Medium'} onChange={(e) => update(t.id, { effort: e.target.value })}>
                  {EFFORT.map((p) => <option key={p}>{p}</option>)}
                </select>
              </td>
              <td>
                <CategorySelect
                  value={t.category}
                  onChange={(v) => update(t.id, { category: v })}
                />
              </td>
              {showProject && (
                <td>
                  <select className="cell-input" value={t.projectId ?? ''} onChange={(e) => update(t.id, { projectId: e.target.value || null })}>
                    <option value="">— none —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
              )}
              <td className="nowrap"><CalendarCell task={t} /></td>
              {showSection && (
                <td>
                  <select className="cell-input" value={t.section} onChange={(e) => update(t.id, { section: e.target.value })}>
                    {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </td>
              )}
              <td><button className="btn-icon" onClick={() => remove(t.id)} title="Delete task">✕</button></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
