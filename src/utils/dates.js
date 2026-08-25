import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  differenceInCalendarDays,
  isSameDay,
  parseISO,
} from 'date-fns'

export const todayKey = () => format(new Date(), 'yyyy-MM-dd')

export const dateKey = (date) => format(date, 'yyyy-MM-dd')

// ISO-ish week key: year + week-start date, so weeks are stable regardless of locale
export const weekKey = (date = new Date()) =>
  format(startOfWeek(date, { weekStartsOn: 1 }), "'W'yyyy-MM-dd")

export const monthKey = (date = new Date()) => format(date, 'yyyy-MM')

export const weekRangeLabel = (date = new Date()) => {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`
}

export const monthLabel = (date = new Date()) => format(date, 'MMMM yyyy')

export const daysUntil = (isoDateString) => {
  const target = parseISO(isoDateString)
  return differenceInCalendarDays(target, new Date())
}

export const isToday = (date) => isSameDay(date, new Date())

// Build the last N days (oldest first) for a heatmap, ending today
export function lastNDays(n) {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    days.push(addDays(new Date(), -i))
  }
  return days
}

export function startOfMonthKey(date = new Date()) {
  return format(startOfMonth(date), 'yyyy-MM-dd')
}

export { format, addDays, startOfWeek, endOfWeek, endOfMonth, parseISO, differenceInCalendarDays }
