import { useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { Card } from '../common/ui'
import PersonalList from './PersonalList'
import PersonalBoard from './PersonalBoard'
import Projects from './Projects'
import PersonalDates from './PersonalDates'
import TimeTracker from './TimeTracker'
import PersonalDashboard from './PersonalDashboard'
import { PRIORITY, EFFORT, CategorySelect } from './TaskTable'

const VIEWS = [
  { id: 'list', label: 'List' },
  { id: 'board', label: 'Board' },
  { id: 'dates', label: '🗓️ Dates' },
  { id: 'projects', label: '📁 Projects' },
  { id: 'time', label: '⏳ Time' },
  { id: 'dashboard', label: '📊 Dashboard' },
]

const BLANK = {
  title: '', section: 'todo', priority: 'Medium', effort: 'Medium',
  category: '', start: '', end: '', notes: '', projectId: '',
}

export default function Personal() {
  const {
    personalTasks, personalSections, projects,
    addPersonalTask, updatePersonalTask, removePersonalTask,
    addPersonalSection, stats,
  } = useAppStore()

  const [view, setView] = useState('list')
  const [draft, setDraft] = useState(BLANK)

  const submit = (e) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    addPersonalTask({ ...draft, title: draft.title.trim(), projectId: draft.projectId || null })
    setDraft({ ...BLANK, section: draft.section, start: draft.start })
  }
  const set = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.value }))

  const isTaskView = view === 'list' || view === 'board'
  const listProps = {
    tasks: personalTasks,
    sections: personalSections,
    projects,
    update: updatePersonalTask,
    remove: removePersonalTask,
    today: stats.today.key,
    addSection: addPersonalSection,
  }

  return (
    <Card
      title="🏠 Personal"
      subtitle="Life outside the study plan. Every task lives in one pool, however you add it — so the Dates view always shows all of them."
      actions={
        <div className="view-switch">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`panel-tab ${view === v.id ? 'active' : ''}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      }
      className="card-wide"
    >
      {isTaskView && (
        <form className="add-form" onSubmit={submit}>
          <input className="input input-grow" placeholder="New personal task…" value={draft.title} onChange={set('title')} />
          <select className="input" value={draft.section} onChange={set('section')}>
            {personalSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={draft.priority} onChange={set('priority')} title="Priority">
            {PRIORITY.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="input" value={draft.effort} onChange={set('effort')} title="Effort">
            {EFFORT.map((p) => <option key={p}>{p}</option>)}
          </select>
          <CategorySelect
            className="input"
            value={draft.category}
            onChange={(v) => setDraft((p) => ({ ...p, category: v }))}
          />
          <select className="input" value={draft.projectId} onChange={set('projectId')} title="Project">
            <option value="">No project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="input input-dt" type="datetime-local" value={draft.start} onChange={set('start')} title="Starts" />
          <input className="input input-dt" type="datetime-local" value={draft.end} min={draft.start || undefined} onChange={set('end')} title="Ends" />
          <button className="btn btn-primary" type="submit">Add task</button>
        </form>
      )}

      {view === 'list' && <PersonalList {...listProps} />}
      {view === 'board' && <PersonalBoard {...listProps} />}
      {view === 'dates' && <PersonalDates />}
      {view === 'projects' && <Projects />}
      {view === 'time' && <TimeTracker />}
      {view === 'dashboard' && <PersonalDashboard />}
    </Card>
  )
}
