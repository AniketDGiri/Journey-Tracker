import { dayOf, isAllDay, timeOf } from './taskDates'

// Stays in UTC: going through local time shifts the result back a day for any
// timezone ahead of UTC, and Google treats an all-day event's end as exclusive.
function nextDay(date) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/** Opens Google Calendar with the event prefilled — the user presses Save. */
export function calendarLink(task) {
  const startDay = dayOf(task.start) || dayOf(task.end)
  if (!startDay) return null
  const endDay = dayOf(task.end) || startDay
  const stamp = (d, t) => `${d.replace(/-/g, '')}${t ? `T${t.replace(':', '')}00` : ''}`
  // An all-day span ends the day after the last day, since Google's end is exclusive.
  const dates = isAllDay(task)
    ? `${stamp(startDay)}/${stamp(nextDay(endDay))}`
    : `${stamp(startDay, timeOf(task.start) || '00:00')}/${stamp(endDay, timeOf(task.end) || timeOf(task.start) || '00:00')}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.title,
    dates,
    details: [task.notes, task.category ? `Category: ${task.category}` : null]
      .filter(Boolean)
      .join('\n'),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
