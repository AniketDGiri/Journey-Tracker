export const DEFAULT_TIME_CONFIG = { startHour: 4, endHour: 23, interval: 30 }

const pad = (n) => String(n).padStart(2, '0')

/** The slot labels for a day, e.g. 04:00, 04:30, … */
export function slotList({ startHour, endHour, interval }) {
  const slots = []
  for (let m = startHour * 60; m < endHour * 60; m += interval) {
    slots.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`)
  }
  return slots
}

export function slotLabel(slot) {
  const [h, m] = slot.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${pad(m)} ${suffix}`
}

const QUADRANTS = [
  { id: 'q1', label: 'Urgent + Important', short: 'Do now', urgent: true, important: true },
  { id: 'q2', label: 'Important, not urgent', short: 'Schedule', urgent: false, important: true },
  { id: 'q3', label: 'Urgent, not important', short: 'Delegate', urgent: true, important: false },
  { id: 'q4', label: 'Neither', short: 'Drop', urgent: false, important: false },
]

export { QUADRANTS }

const share = (n, total) => (total > 0 ? n / total : 0)

/**
 * Eisenhower breakdown of one day's slots. Only slots with a task count —
 * empty slots are untracked time, not "neither urgent nor important".
 */
export function summariseDay(dayLog, config) {
  const slots = dayLog?.slots ?? {}
  const filled = Object.values(slots).filter((s) => s?.task?.trim())
  const hoursPer = config.interval / 60

  const counts = Object.fromEntries(QUADRANTS.map((q) => [q.id, 0]))
  let urgentYes = 0
  let importantYes = 0
  for (const s of filled) {
    const u = s.urgent === true
    const i = s.important === true
    if (u) urgentYes++
    if (i) importantYes++
    const q = QUADRANTS.find((x) => x.urgent === u && x.important === i)
    counts[q.id]++
  }

  const total = filled.length
  return {
    trackedSlots: total,
    trackedHours: Math.round(total * hoursPer * 100) / 100,
    totalSlots: slotList(config).length,
    counts,
    hours: Object.fromEntries(
      QUADRANTS.map((q) => [q.id, Math.round(counts[q.id] * hoursPer * 100) / 100])
    ),
    pct: Object.fromEntries(QUADRANTS.map((q) => [q.id, share(counts[q.id], total)])),
    urgent: { yes: share(urgentYes, total), no: share(total - urgentYes, total) },
    important: { yes: share(importantYes, total), no: share(total - importantYes, total) },
    happy: dayLog?.happy ?? '',
  }
}

/** Same shape as a day, aggregated across many, plus the time spent per task name. */
export function summariseRange(timeLog, config, dateKeys) {
  const hoursPer = config.interval / 60
  const counts = Object.fromEntries(QUADRANTS.map((q) => [q.id, 0]))
  const byTask = new Map()
  let total = 0
  let urgentYes = 0
  let importantYes = 0
  let daysTracked = 0
  let happyYes = 0
  let happyAnswered = 0

  for (const k of dateKeys) {
    const day = timeLog[k]
    if (!day) continue
    const filled = Object.values(day.slots ?? {}).filter((s) => s?.task?.trim())
    if (filled.length > 0) daysTracked++
    if (day.happy === 'yes' || day.happy === 'no') {
      happyAnswered++
      if (day.happy === 'yes') happyYes++
    }
    for (const s of filled) {
      total++
      const u = s.urgent === true
      const i = s.important === true
      if (u) urgentYes++
      if (i) importantYes++
      counts[QUADRANTS.find((x) => x.urgent === u && x.important === i).id]++
      const name = s.task.trim()
      byTask.set(name, (byTask.get(name) ?? 0) + hoursPer)
    }
  }

  return {
    daysTracked,
    trackedSlots: total,
    trackedHours: Math.round(total * hoursPer * 100) / 100,
    counts,
    hours: Object.fromEntries(
      QUADRANTS.map((q) => [q.id, Math.round(counts[q.id] * hoursPer * 100) / 100])
    ),
    pct: Object.fromEntries(QUADRANTS.map((q) => [q.id, share(counts[q.id], total)])),
    urgent: { yes: share(urgentYes, total), no: share(total - urgentYes, total) },
    important: { yes: share(importantYes, total), no: share(total - importantYes, total) },
    happyRate: share(happyYes, happyAnswered),
    happyAnswered,
    topTasks: [...byTask.entries()]
      .map(([task, hours]) => ({ task, hours: Math.round(hours * 100) / 100 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8),
  }
}
