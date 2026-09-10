import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { Empty } from '../common/ui'
import TaskTable from './TaskTable'

const FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'all', label: 'All' },
]

function heading(dateKey, today) {
  if (dateKey === 'none') return { title: 'No date', sub: 'Give these a date to schedule them' }
  const days = differenceInCalendarDays(parseISO(dateKey), parseISO(today))
  const date = parseISO(dateKey)
  const long = format(date, 'EEEE dd MMM yyyy')
  if (days < 0) return { title: long, sub: `${-days} day${days === -1 ? '' : 's'} ago`, overdue: true }
  if (days === 0) return { title: `Today · ${long}`, sub: '' }
  if (days === 1) return { title: `Tomorrow · ${long}`, sub: '' }
  return { title: long, sub: `in ${days} days` }
}

export default function PersonalDates() {
  const {
    personalTasks, personalSections, projects,
    updatePersonalTask, removePersonalTask, stats,
  } = useAppStore()
  const [filter, setFilter] = useState('open')
  const today = stats.today.key

  const groups = useMemo(() => {
    const shown =
      filter === 'open' ? personalTasks.filter((t) => t.section !== 'done') : personalTasks

    const map = new Map()
    for (const t of shown) {
      const k = t.dueDate || 'none'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(t)
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'))
    }
    // Dated groups in date order; undated collected at the end.
    return [...map.entries()]
      .sort(([a], [b]) => (a === 'none' ? 1 : b === 'none' ? -1 : a.localeCompare(b)))
      .map(([key, list]) => ({ key, list }))
  }, [personalTasks, filter])

  const overdue = personalTasks.filter(
    (t) => t.dueDate && t.dueDate < today && t.section !== 'done'
  ).length
  const dueToday = personalTasks.filter((t) => t.dueDate === today && t.section !== 'done').length

  return (
    <div className="dates-wrap">
      <div className="dates-head">
        <div className="view-switch">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`panel-tab ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="dates-summary">
          {overdue > 0 && <span className="pill pill-warn">{overdue} overdue</span>}
          <span className="pill">{dueToday} due today</span>
        </span>
      </div>

      {groups.length === 0 ? (
        <Empty>
          Nothing to show. Tasks from the List, Board and Projects views all appear here once
          they have a date.
        </Empty>
      ) : (
        <div className="table-scroll">
          {groups.map(({ key, list }) => {
            const h = heading(key, today)
            return (
              <div className="sec" key={key}>
                <h3 className={`sec-head ${h.overdue ? 'sec-head-over' : ''}`}>
                  {h.title}
                  <span className="sec-count">{list.length}</span>
                  {h.sub && <span className="sec-sub">{h.sub}</span>}
                </h3>
                <TaskTable
                  tasks={list}
                  sections={personalSections}
                  projects={projects}
                  update={updatePersonalTask}
                  remove={removePersonalTask}
                  today={today}
                  showProject
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
