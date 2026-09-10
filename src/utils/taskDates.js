import { addDays, format, parseISO } from 'date-fns'

// A personal task carries `start` and `end` as 'YYYY-MM-DDTHH:mm'. Midnight on
// both ends means "no particular time", which is how an all-day task is stored
// without needing a separate flag.
export const dayOf = (dt) => (dt || '').slice(0, 10)
export const timeOf = (dt) => (dt || '').slice(11, 16)

export const isAllDay = (task) => {
  const s = timeOf(task.start)
  const e = timeOf(task.end)
  return (!s || s === '00:00') && (!e || e === '00:00')
}

/** The day a task is judged against: when it ends, or when it starts. */
export const dueDay = (task) => dayOf(task.end) || dayOf(task.start)
export const startDay = (task) => dayOf(task.start) || dayOf(task.end)

export const isOverdue = (task, today) => {
  const d = dueDay(task)
  return Boolean(d) && d < today && task.section !== 'done'
}

export const spansDays = (task) => {
  const a = startDay(task)
  const b = dueDay(task)
  return Boolean(a && b && a !== b)
}

/** Every calendar day a task touches, so a multi-day task shows on each of them. */
export function coveredDays(task, cap = 120) {
  const a = startDay(task)
  const b = dueDay(task) || a
  if (!a) return []
  const days = []
  let cursor = parseISO(a)
  const last = parseISO(b < a ? a : b)
  while (cursor <= last && days.length < cap) {
    days.push(format(cursor, 'yyyy-MM-dd'))
    cursor = addDays(cursor, 1)
  }
  return days
}

/** Short human label: "12 Sep", "12 Sep 18:00", "12 Sep → 14 Sep". */
export function rangeLabel(task) {
  const a = startDay(task)
  const b = dueDay(task)
  if (!a) return 'No date'
  const allDay = isAllDay(task)
  const one = (day, time) =>
    `${format(parseISO(day), 'dd MMM')}${!allDay && time && time !== '00:00' ? ` ${time}` : ''}`
  const from = one(a, timeOf(task.start))
  if (!b || b === a) return from
  return `${from} → ${one(b, timeOf(task.end))}`
}

/**
 * Brings a task written under the old {dueDate, startTime, endTime} shape onto
 * the start/end pair. Missing times become midnight rather than an invented
 * working hour.
 */
export function migrateTask(task) {
  if (task.start !== undefined || task.end !== undefined) return task
  const { dueDate, startTime, endTime, ...rest } = task
  if (!dueDate) return { ...rest, start: '', end: '' }
  return {
    ...rest,
    start: `${dueDate}T${startTime || '00:00'}`,
    end: `${dueDate}T${endTime || startTime || '00:00'}`,
  }
}
