import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import TaskSection from '../common/TaskSection'
import ScheduledMini from '../common/ScheduledMini'
import { todayKey, dateKey, weekKey, weekRangeLabel, endOfWeek } from '../../utils/dates'
import { buildGoogleCalendarLink } from '../../utils/googleCalendar'
import Backlog from '../common/Backlog'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'office', label: 'Office' },
  { id: 'personal', label: 'Personal' },
]

function GCalButton({ task }) {
  const link = buildGoogleCalendarLink({
    title: task.title,
    details: `${task.category === 'office' ? 'Office' : 'Personal'} task — added from Journey Tracker`,
    date: new Date(),
    frequency: task.frequency,
  })
  return (
    <a
      className="gcal-btn"
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title="Add to Google Calendar (recurring)"
    >
      📅
    </a>
  )
}

function lifeFilterToScheduledCats(filter) {
  if (filter === 'office') return ['work']
  if (filter === 'personal') return ['personal']
  return ['work', 'personal']
}

export default function LifeTasks() {
  const {
    lifeTasks, addLifeTask, removeLifeTask, lifeCompletions, toggleLifeCompletion,
    addLifeSubtask, toggleLifeSubtask, removeLifeSubtask,
    scheduledTasks, toggleScheduledTask, removeScheduledTask,
    addScheduledSubtask, toggleScheduledSubtask, removeScheduledSubtask,
  } = useAppStore()

  const [category, setCategory] = useState('all')
  const [addCategory, setAddCategory] = useState('office')

  const filtered = useMemo(
    () => (category === 'all' ? lifeTasks : lifeTasks.filter((t) => t.category === category)),
    [lifeTasks, category]
  )

  const dailyTasks  = filtered.filter((t) => t.frequency === 'daily')
  const weeklyTasks = filtered.filter((t) => t.frequency === 'weekly')

  const today   = todayKey()
  const weekEnd = dateKey(endOfWeek(new Date(), { weekStartsOn: 1 }))

  const scheduledCats   = lifeFilterToScheduledCats(category)
  const filteredSched   = scheduledTasks.filter((t) => scheduledCats.includes(t.category))
  const lifeSchedDaily  = filteredSched.filter((t) => t.dueDate === today)
  const lifeSchedWeekly = filteredSched.filter((t) => t.dueDate > today && t.dueDate <= weekEnd)

  return (
    <div className="tab-panel">
      <div className="section-header-row">
        <h2>Life Tasks</h2>
        <div className="category-filter">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`phase-pill ${category === c.id ? 'active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <p className="muted">
        Track office &amp; personal to-dos. Tap 📅 on any task to add it to Google Calendar
        (it pre-fills the event so notifications come from Google Calendar itself).
      </p>

      <div className="add-category-toggle">
        <span>New tasks go to:</span>
        <div className="category-filter">
          {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
            <button
              key={c.id}
              className={`phase-pill ${addCategory === c.id ? 'active' : ''}`}
              onClick={() => setAddCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Backlog filter="life" />

      <div className="task-grid task-grid-2">
        <TaskSection
          title="Daily"
          periodLabel="Today"
          tasks={dailyTasks}
          periodKey={todayKey()}
          completions={lifeCompletions}
          onToggle={toggleLifeCompletion}
          onAdd={(title) => addLifeTask({ title, frequency: 'daily', category: addCategory })}
          onRemove={removeLifeTask}
          renderExtra={(task) => <GCalButton task={task} />}
          color="#f97316"
          scheduledItems={lifeSchedDaily}
          onToggleScheduled={toggleScheduledTask}
          onRemoveScheduled={removeScheduledTask}
          onAddSubtask={addLifeSubtask}
          onToggleSubtask={toggleLifeSubtask}
          onRemoveSubtask={removeLifeSubtask}
          onAddScheduledSubtask={addScheduledSubtask}
          onToggleScheduledSubtask={toggleScheduledSubtask}
          onRemoveScheduledSubtask={removeScheduledSubtask}
        />
        <TaskSection
          title="Weekly"
          periodLabel={weekRangeLabel()}
          tasks={weeklyTasks}
          periodKey={weekKey()}
          completions={lifeCompletions}
          onToggle={toggleLifeCompletion}
          onAdd={(title) => addLifeTask({ title, frequency: 'weekly', category: addCategory })}
          onRemove={removeLifeTask}
          renderExtra={(task) => <GCalButton task={task} />}
          color="#f97316"
          scheduledItems={lifeSchedWeekly}
          onToggleScheduled={toggleScheduledTask}
          onRemoveScheduled={removeScheduledTask}
          onAddSubtask={addLifeSubtask}
          onToggleSubtask={toggleLifeSubtask}
          onRemoveSubtask={removeLifeSubtask}
          onAddScheduledSubtask={addScheduledSubtask}
          onToggleScheduledSubtask={toggleScheduledSubtask}
          onRemoveScheduledSubtask={removeScheduledSubtask}
        />
      </div>

      <ScheduledMini categoryIds={['work', 'personal']} accentColor="#f97316" showBuckets={['overdue', 'month', 'upcoming']} />
    </div>
  )
}
