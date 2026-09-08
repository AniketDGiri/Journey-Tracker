// Stays in UTC: going through local time shifts the result back a day for any
// timezone ahead of UTC, and Google treats an all-day event's end as exclusive.
function nextDay(date) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/** Opens Google Calendar with the event prefilled — the user presses Save. */
export function calendarLink(task) {
  if (!task.dueDate) return null
  const stamp = (d, t) => `${d.replace(/-/g, '')}${t ? `T${t.replace(':', '')}00` : ''}`
  const dates =
    task.startTime && task.endTime
      ? `${stamp(task.dueDate, task.startTime)}/${stamp(task.dueDate, task.endTime)}`
      : `${stamp(task.dueDate)}/${stamp(nextDay(task.dueDate))}`
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
