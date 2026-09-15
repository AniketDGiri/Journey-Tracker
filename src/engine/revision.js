import { addDays } from 'date-fns'
import { key, parse } from './days.js'

/**
 * A revision topic carries one `nextReview` date. When you mark it revised you
 * decide there and then whether to schedule another pass or call it finished —
 * no fixed ladder of reviews decided up front.
 */
export function decorateRevisions(revisions, today) {
  const todayK = key(today)
  return revisions.map((r) => {
    const completed = r.completed === true
    const status = completed
      ? '✅ Complete'
      : !r.nextReview
        ? '➕ set a date'
        : r.nextReview < todayK
          ? '🔴 Overdue'
          : r.nextReview === todayK
            ? '🟡 Due today'
            : '🟢 Scheduled'
    return { ...r, completed, nextReview: r.nextReview || null, status }
  })
}

// The old shape scheduled three reviews off a first-studied date and a
// confidence score. Carry each topic over at whichever review it had reached.
const LEGACY_INTERVALS = { low: [1, 4, 10], mid: [2, 7, 21], high: [3, 10, 30] }

export function migrateRevision(r) {
  if ('completed' in r) return r
  const { firstStudied, confidence, r1Done, r2Done, r3Done, ...rest } = r
  const done = [r1Done === true, r2Done === true, r3Done === true]
  const reviewCount = done.filter(Boolean).length

  if (!firstStudied) {
    return { ...rest, nextReview: '', completed: false, reviewCount, lastReviewed: '' }
  }
  const c = Number(confidence) || 3
  const band = c <= 2 ? 'low' : c === 3 ? 'mid' : 'high'
  const dues = LEGACY_INTERVALS[band].map((n) => key(addDays(parse(firstStudied), n)))
  const pending = done.findIndex((d) => !d)
  return {
    ...rest,
    nextReview: pending === -1 ? '' : dues[pending],
    completed: pending === -1,
    reviewCount,
    lastReviewed: reviewCount > 0 ? dues[reviewCount - 1] : '',
  }
}

/** Presets offered when scheduling the next pass. */
export const NEXT_REVIEW_PRESETS = [
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
  { label: 'In 1 month', days: 30 },
]

export const dateIn = (today, days) => key(addDays(today, days))
