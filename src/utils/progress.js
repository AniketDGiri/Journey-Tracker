import { dateKey, lastNDays } from './dates'

export function completionRatioForKey(tasks, completions, key) {
  if (tasks.length === 0) return null
  const done = tasks.filter((t) => completions[t.id]?.[key]).length
  return done / tasks.length
}

// Longest current streak of days (ending today or yesterday) where
// all "daily" tasks were fully completed.
export function computeStreak(dailyTasks, completions) {
  if (dailyTasks.length === 0) return 0
  const days = lastNDays(365).reverse() // today first, going backward
  let streak = 0
  for (const day of days) {
    const key = dateKey(day)
    const ratio = completionRatioForKey(dailyTasks, completions, key)
    if (ratio === 1) {
      streak++
    } else {
      // allow "today" to be incomplete-in-progress without breaking the streak yet
      const isToday = dateKey(new Date()) === key
      if (isToday) continue
      break
    }
  }
  return streak
}

export function heatmapData(dailyTasks, completions, days = 98) {
  return lastNDays(days).map((day) => {
    const key   = dateKey(day)
    const total = dailyTasks.length
    const done  = total > 0 ? dailyTasks.filter((t) => completions[t.id]?.[key]).length : 0
    const ratio = total > 0 ? done / total : null
    return { date: day, key, ratio, done, total }
  })
}
