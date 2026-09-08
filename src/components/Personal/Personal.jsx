import { useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { Card } from '../common/ui'
import PersonalList from './PersonalList'
import PersonalBoard from './PersonalBoard'
import TimeTracker from './TimeTracker'
import PersonalDashboard from './PersonalDashboard'

export const PRIORITY = ['High', 'Medium', 'Low']
export const EFFORT = ['Small', 'Medium', 'Large']

const VIEWS = [
  { id: 'list', label: 'List' },
  { id: 'board', label: 'Board' },
  { id: 'time', label: '⏳ Time' },
  { id: 'dashboard', label: '📊 Dashboard' },
]

const BLANK = {
  title: '', section: 'todo', priority: 'Medium', effort: 'Medium',
  category: '', dueDate: '', startTime: '', endTime: '', notes: '',
}

export default function Personal() {
  const {
    personalTasks, personalSections,
    addPersonalTask, updatePersonalTask, removePersonalTask,
    addPersonalSection, stats,
  } = useAppStore()

  const [view, setView] = useState('list')
  const [draft, setDraft] = useState(BLANK)

  const submit = (e) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    addPersonalTask({ ...draft, title: draft.title.trim() })
    setDraft({ ...BLANK, section: draft.section, dueDate: draft.dueDate })
  }
  const set = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.value }))

  const isTaskView = view === 'list' || view === 'board'
  const listProps = {
    tasks: personalTasks,
    sections: personalSections,
    update: updatePersonalTask,
    remove: removePersonalTask,
    today: stats.today.key,
    addSection: addPersonalSection,
  }

  return (
    <Card
      title="🏠 Personal"
      subtitle="Life outside the study plan — a to-do list, a day-by-day time log, and what they add up to."
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
          <input className="input" placeholder="Category" value={draft.category} onChange={set('category')} />
          <input className="input" type="date" value={draft.dueDate} onChange={set('dueDate')} title="Date" />
          <input className="input input-time" type="time" value={draft.startTime} onChange={set('startTime')} title="Start time" />
          <input className="input input-time" type="time" value={draft.endTime} onChange={set('endTime')} title="End time" />
          <button className="btn btn-primary" type="submit">Add task</button>
        </form>
      )}

      {view === 'list' && <PersonalList {...listProps} />}
      {view === 'board' && <PersonalBoard {...listProps} />}
      {view === 'time' && <TimeTracker />}
      {view === 'dashboard' && <PersonalDashboard />}
    </Card>
  )
}
