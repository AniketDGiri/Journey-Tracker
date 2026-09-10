import { useState } from 'react'
import TaskTable from './TaskTable'

export { CalendarCell } from './TaskTable'

export default function PersonalList({ tasks, sections, projects, update, remove, today, addSection }) {
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
            <TaskTable
              tasks={rows}
              sections={sections}
              projects={projects}
              update={update}
              remove={remove}
              today={today}
              showProject
            />
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
