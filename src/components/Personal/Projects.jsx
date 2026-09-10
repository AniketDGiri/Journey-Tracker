import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { Bar, Empty, GrowText, pct } from '../common/ui'
import TaskTable, { PRIORITY, EFFORT, CategorySelect } from './TaskTable'

const STATUS = ['Idea', 'Planned', 'Active', 'Paused', 'Done']

const BLANK_TASK = {
  title: '', section: 'todo', priority: 'Medium', effort: 'Medium',
  category: '', start: '', end: '', notes: '',
}

export default function Projects() {
  const {
    projects, addProject, updateProject, removeProject,
    personalTasks, personalSections, addPersonalTask, updatePersonalTask, removePersonalTask,
    stats,
  } = useAppStore()

  const [selected, setSelected] = useState(null)
  const [newProject, setNewProject] = useState('')
  const [draft, setDraft] = useState(BLANK_TASK)

  const stat = useMemo(() => {
    const m = new Map()
    for (const p of projects) m.set(p.id, { total: 0, done: 0 })
    for (const t of personalTasks) {
      const e = m.get(t.projectId)
      if (!e) continue
      e.total++
      if (t.section === 'done') e.done++
    }
    return m
  }, [projects, personalTasks])

  const active = projects.find((p) => p.id === selected) ?? null
  const projectTasks = active ? personalTasks.filter((t) => t.projectId === active.id) : []

  const addTask = (e) => {
    e.preventDefault()
    if (!draft.title.trim() || !active) return
    addPersonalTask({ ...draft, title: draft.title.trim(), projectId: active.id })
    setDraft({ ...BLANK_TASK, section: draft.section, start: draft.start })
  }
  const set = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.value }))

  const unassigned = personalTasks.filter((t) => !t.projectId).length

  return (
    <div className="proj-wrap">
      <form
        className="add-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!newProject.trim()) return
          addProject({ name: newProject.trim(), status: 'Idea', notes: '' })
          setNewProject('')
        }}
      >
        <input
          className="input input-grow"
          placeholder="New project — something you want to build or get done…"
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Add project</button>
      </form>

      {projects.length === 0 ? (
        <Empty>No projects yet. Add one above, then break it into tasks.</Empty>
      ) : (
        <div className="proj-grid">
          {projects.map((p) => {
            const s = stat.get(p.id) ?? { total: 0, done: 0 }
            const ratio = s.total ? s.done / s.total : 0
            return (
              <button
                type="button"
                key={p.id}
                className={`proj-card ${selected === p.id ? 'proj-card-on' : ''}`}
                onClick={() => setSelected(selected === p.id ? null : p.id)}
              >
                <span className="proj-name">{p.name}</span>
                <span className={`chip proj-status proj-${(p.status ?? 'idea').toLowerCase()}`}>
                  {p.status ?? 'Idea'}
                </span>
                <Bar value={ratio} tone={ratio === 1 && s.total > 0 ? 'success' : 'accent'} />
                <span className="proj-meta">
                  {s.total === 0 ? 'No tasks yet' : `${s.done} of ${s.total} done · ${pct(ratio)}`}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {active && (
        <section className="proj-detail">
          <header className="proj-detail-head">
            <GrowText value={active.name} onChange={(e) => updateProject(active.id, { name: e.target.value })} />
            <select
              className="input"
              value={active.status ?? 'Idea'}
              onChange={(e) => updateProject(active.id, { status: e.target.value })}
            >
              {STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button
              className="btn"
              onClick={() => {
                removeProject(active.id)
                setSelected(null)
              }}
              title="Delete the project — its tasks are kept and become unassigned"
            >
              Delete project
            </button>
          </header>

          <textarea
            className="input"
            rows={2}
            placeholder="What is this project, and what does done look like?"
            value={active.notes ?? ''}
            onChange={(e) => updateProject(active.id, { notes: e.target.value })}
          />

          <form className="add-form" onSubmit={addTask}>
            <input className="input input-grow" placeholder={`New task for ${active.name}…`} value={draft.title} onChange={set('title')} />
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
            <input className="input input-dt" type="datetime-local" value={draft.start} onChange={set('start')} title="Starts" />
            <input className="input input-dt" type="datetime-local" value={draft.end} min={draft.start || undefined} onChange={set('end')} title="Ends" />
            <button className="btn btn-primary" type="submit">Add task</button>
          </form>

          <div className="table-scroll">
            <TaskTable
              tasks={projectTasks}
              sections={personalSections}
              projects={projects}
              update={updatePersonalTask}
              remove={removePersonalTask}
              today={stats.today.key}
              emptyLabel="No tasks for this project yet."
            />
          </div>
        </section>
      )}

      {!active && projects.length > 0 && (
        <p className="note note-quiet">
          Pick a project to add its tasks. {unassigned > 0 && `${unassigned} task${unassigned === 1 ? '' : 's'} not attached to any project — assign them from the Project column in List view.`}
        </p>
      )}
    </div>
  )
}
