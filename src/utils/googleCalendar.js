import { format } from 'date-fns'

/**
 * Build a "one click" Google Calendar link that pre-fills an event.
 * No auth/backend needed — this just opens calendar.google.com with
 * the event template filled in; the user clicks "Save" themselves.
 */
export function buildGoogleCalendarLink({
  title,
  details = '',
  date, // Date object for the first occurrence
  time = '', // 'HH:mm' 24h, optional
  durationMinutes = 30,
  frequency = 'once', // 'once' | 'daily' | 'weekly' | 'monthly'
}) {
  const base = 'https://calendar.google.com/calendar/render'
  const params = new URLSearchParams()
  params.set('action', 'TEMPLATE')
  params.set('text', title)
  if (details) params.set('details', details)

  let datesParam
  if (time) {
    const [h, m] = time.split(':').map(Number)
    const start = new Date(date)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + durationMinutes * 60000)
    datesParam = `${toGCalUTC(start)}/${toGCalUTC(end)}`
  } else {
    // all-day event
    const end = new Date(date)
    end.setDate(end.getDate() + 1)
    datesParam = `${format(date, 'yyyyMMdd')}/${format(end, 'yyyyMMdd')}`
  }
  params.set('dates', datesParam)

  const recur = recurrenceRule(frequency, date)
  if (recur) params.set('recur', recur)

  return `${base}?${params.toString()}`
}

function toGCalUTC(d) {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function recurrenceRule(frequency, date) {
  switch (frequency) {
    case 'daily':
      return 'RRULE:FREQ=DAILY'
    case 'weekly': {
      const day = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][date.getDay()]
      return `RRULE:FREQ=WEEKLY;BYDAY=${day}`
    }
    case 'monthly':
      return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${date.getDate()}`
    default:
      return null
  }
}
