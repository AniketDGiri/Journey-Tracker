import { useState } from 'react'
import { GrowText } from '../common/ui'
import { PRIORITY, EFFORT } from './Personal'
import { calendarLink } from '../../utils/googleCalendar'

export function CalendarCell({ task }) {
  if (!task.dueDate) return <span className="muted">—</span>
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

export default function PersonalList({ tasks, sections, update, remove, today, addSection }) {
  const [newSection, setNewSection] = useState('')

  return (
    <div className="table-scroll">
      {sections.map((section) => {
        const rows = tasks.filter((t) => t.section === section.id)
        return (
          <div className="sec" key={section.id}>
            <h3 className="sec-head">
              {section.name} <span className="sec-count">{rows.length}</span>
            </h3>
            <table className="tbl">
              <thead>
                <tr>
                  <th />
                  <th className="th-text">Name</th>
                  <th>Date</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Priority</th>
                  <th>Effort</th>
                  <th>Category</th>
                  <th>Calendar</th>
                  <th>Section</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={11} className="sec-empty">No tasks here.</td></tr>
                )}
                {rows.map((t) => (
                  <tr key={t.id} className={t.dueDate && t.dueDate < today && section.id !== 'done' ? 'row-alert' : ''}>
                    <td className="cell-center">
                      <input
                        type="checkbox"
                        checked={t.section === 'done'}
                        title="Mark done"
                        onChange={(e) => update(t.id, { section: e.target.checked ? 'done' : 'todo' })}
                      />
                    </td>
                    <td className="td-text">
                      <GrowText value={t.title} onChange={(e) => update(t.id, { title: e.target.value })} />
                    </td>
                    <td><input className="cell-input" type="date" value={t.dueDate ?? ''} onChange={(e) => update(t.id, { dueDate: e.target.value })} /></td>
                    <td><input className="cell-input cell-narrow" type="time" value={t.startTime ?? ''} onChange={(e) => update(t.id, { startTime: e.target.value })} /></td>
                    <td><input className="cell-input cell-narrow" type="time" value={t.endTime ?? ''} onChange={(e) => update(t.id, { endTime: e.target.value })} /></td>
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
                    <td><input className="cell-input cell-narrow" value={t.category ?? ''} onChange={(e) => update(t.id, { category: e.target.value })} /></td>
                    <td className="nowrap"><CalendarCell task={t} /></td>
                    <td>
                      <select className="cell-input" value={t.section} onChange={(e) => update(t.id, { section: e.target.value })}>
                        {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td><button className="btn-icon" onClick={() => remove(t.id)} title="Delete task">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      <form
        className="add-section"
        onSubmit={(e) => {
          e.preventDefault()
          if (!newSection.trim()) return
          addSection(newSection.trim())
          setNewSection('')
        }}
      >
        <input className="input" placeholder="New section…" value={newSection} onChange={(e) => setNewSection(e.target.value)} />
        <button className="btn" type="submit">＋ Add section</button>
      </form>
    </div>
  )
}
