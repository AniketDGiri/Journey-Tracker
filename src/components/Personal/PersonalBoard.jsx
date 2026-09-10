import { useState } from 'react'
import { CalendarCell } from './PersonalList'
import { isOverdue, rangeLabel, spansDays } from '../../utils/taskDates'

export default function PersonalBoard({ tasks, sections, projects = [], update, remove, today, addSection }) {
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const [newSection, setNewSection] = useState('')

  const drop = (sectionId) => (e) => {
    e.preventDefault()
    if (dragId) update(dragId, { section: sectionId })
    setDragId(null)
    setOverId(null)
  }

  return (
    <div className="board">
      {sections.map((section) => {
        const cards = tasks.filter((t) => t.section === section.id)
        return (
          <div
            key={section.id}
            className={`board-col ${overId === section.id ? 'board-col-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOverId(section.id)
            }}
            onDragLeave={() => setOverId((p) => (p === section.id ? null : p))}
            onDrop={drop(section.id)}
          >
            <header className="board-col-head">
              <span>{section.name}</span>
              <span className="sec-count">{cards.length}</span>
            </header>

            {cards.map((t) => {
              const isDone = section.id === 'done'
              const overdue = isOverdue(t, today)
              return (
                <article
                  key={t.id}
                  className={`board-card ${isDone ? 'board-card-done' : ''} ${dragId === t.id ? 'board-card-drag' : ''}`}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                >
                  <div className="board-card-top">
                    <input
                      type="checkbox"
                      checked={isDone}
                      title="Mark done"
                      onChange={(e) => update(t.id, { section: e.target.checked ? 'done' : 'todo' })}
                    />
                    <span className="board-card-title">{t.title}</span>
                    <button className="btn-icon" onClick={() => remove(t.id)} title="Delete task">✕</button>
                  </div>
                  <div className="chips">
                    {t.priority && <span className={`chip chip-${t.priority.toLowerCase()}`}>{t.priority}</span>}
                    {t.effort && <span className={`chip chip-${t.effort.toLowerCase()}`}>{t.effort}</span>}
                    {t.category && <span className="chip chip-cat">{t.category}</span>}
                    {t.projectId && (
                      <span className="chip chip-proj">
                        📁 {projects.find((p) => p.id === t.projectId)?.name ?? 'Project'}
                      </span>
                    )}
                  </div>
                  <footer className="board-card-foot">
                    <span className={overdue ? 'board-due board-due-over' : 'board-due'}>
                      {rangeLabel(t)}
                      {spansDays(t) && <span className="span-chip">multi-day</span>}
                    </span>
                    <CalendarCell task={t} />
                  </footer>
                  <select
                    className="board-move"
                    value={t.section}
                    onChange={(e) => update(t.id, { section: e.target.value })}
                    title="Move to another section"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>Move to {s.name}</option>
                    ))}
                  </select>
                </article>
              )
            })}

            {cards.length === 0 && <p className="board-empty">Nothing here yet</p>}
          </div>
        )
      })}

      <form
        className="board-add-section"
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
