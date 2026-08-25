import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/AppStore'
import { todayKey, dateKey, weekKey, monthKey } from '../../utils/dates'
import { subDays, subWeeks, subMonths } from 'date-fns'

// Maps life-task category to scheduled-task category
function lifeToSchedCat(lifeCategory) {
  return lifeCategory === 'office' ? 'work' : 'personal'
}

const FREQ_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

function periodLabel(frequency) {
  if (frequency === 'daily')   return 'Yesterday'
  if (frequency === 'weekly')  return 'Last week'
  if (frequency === 'monthly') return 'Last month'
  return ''
}

export default function Backlog({ filter = 'all' }) {
  const {
    studyTasks, studyCompletions, toggleStudyCompletion,
    lifeTasks,  lifeCompletions,  toggleLifeCompletion,
    addScheduledTask,
  } = useAppStore()

  const [rescheduleId, setRescheduleId]     = useState(null) // composite `${id}-${missedKey}`
  const [rescheduleDate, setRescheduleDate] = useState(todayKey)

  const prevDay   = dateKey(subDays(new Date(), 1))
  const prevWeek  = weekKey(subWeeks(new Date(), 1))
  const prevMonth = monthKey(subMonths(new Date(), 1))

  const studyItems = useMemo(() => {
    if (filter === 'life') return []
    return [
      ...studyTasks
        .filter(t => t.frequency === 'daily'   && !studyCompletions[t.id]?.[prevDay])
        .map(t => ({ ...t, missedKey: prevDay,   type: 'study' })),
      ...studyTasks
        .filter(t => t.frequency === 'weekly'  && !studyCompletions[t.id]?.[prevWeek])
        .map(t => ({ ...t, missedKey: prevWeek,  type: 'study' })),
      ...studyTasks
        .filter(t => t.frequency === 'monthly' && !studyCompletions[t.id]?.[prevMonth])
        .map(t => ({ ...t, missedKey: prevMonth, type: 'study' })),
    ]
  }, [studyTasks, studyCompletions, filter, prevDay, prevWeek, prevMonth])

  const lifeItems = useMemo(() => {
    if (filter === 'study') return []
    return [
      ...lifeTasks
        .filter(t => t.frequency === 'daily'  && !lifeCompletions[t.id]?.[prevDay])
        .map(t => ({ ...t, missedKey: prevDay,  type: 'life' })),
      ...lifeTasks
        .filter(t => t.frequency === 'weekly' && !lifeCompletions[t.id]?.[prevWeek])
        .map(t => ({ ...t, missedKey: prevWeek, type: 'life' })),
    ]
  }, [lifeTasks, lifeCompletions, filter, prevDay, prevWeek])

  const items = [...studyItems, ...lifeItems]
  if (items.length === 0) return null

  const markDone = (item) => {
    if (item.type === 'study') toggleStudyCompletion(item.id, item.missedKey)
    else                       toggleLifeCompletion(item.id, item.missedKey)
  }

  const confirmReschedule = (item) => {
    const date = rescheduleDate || todayKey()
    addScheduledTask({
      title:    item.title,
      dueDate:  date,
      category: item.type === 'study' ? 'study' : lifeToSchedCat(item.category),
    })
    // retroactively complete the missed period so item leaves backlog
    if (item.type === 'study') toggleStudyCompletion(item.id, item.missedKey)
    else                       toggleLifeCompletion(item.id, item.missedKey)
    setRescheduleId(null)
  }

  return (
    <div className="backlog-card">
      <div className="backlog-header">
        <span className="backlog-icon">⏰</span>
        <h3 className="backlog-title">Backlog</h3>
        <span className="count-pill">{items.length} missed</span>
      </div>
      <p className="muted backlog-sub">
        Tasks not completed in the previous period. Mark done or reschedule to a new date.
      </p>

      <ul className="backlog-list">
        {items.map((item) => {
          const key          = `${item.id}-${item.missedKey}`
          const isRescheduling = rescheduleId === key
          return (
            <li key={key} className="backlog-item">
              <div className="backlog-item-left">
                <span className={`backlog-freq backlog-freq-${item.frequency}`}>
                  {FREQ_LABEL[item.frequency]}
                </span>
                <span className="backlog-item-title">{item.title}</span>
                <span className="backlog-missed">{periodLabel(item.frequency)}</span>
              </div>

              <div className="backlog-item-actions">
                {isRescheduling ? (
                  <>
                    <input
                      type="date"
                      className="backlog-date-input"
                      value={rescheduleDate}
                      min={todayKey()}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                    />
                    <button
                      className="backlog-btn backlog-btn-confirm"
                      onClick={() => confirmReschedule(item)}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setRescheduleId(null)}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <button className="backlog-btn backlog-btn-done" onClick={() => markDone(item)}>
                      ✓ Done
                    </button>
                    <button
                      className="backlog-btn backlog-btn-sched"
                      onClick={() => {
                        setRescheduleId(key)
                        setRescheduleDate(todayKey())
                      }}
                    >
                      📅 Reschedule
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
