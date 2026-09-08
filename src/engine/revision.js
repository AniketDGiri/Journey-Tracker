import { addDays } from 'date-fns'
import { key, parse } from './days.js'

// Offsets are always measured from First Studied, never chained off the last review.
const INTERVALS = {
  low: [1, 4, 10],
  mid: [2, 7, 21],
  high: [3, 10, 30],
}

const band = (confidence) => {
  const c = Number(confidence) || 3
  return c <= 2 ? 'low' : c === 3 ? 'mid' : 'high'
}

export function decorateRevisions(revisions, today) {
  const todayK = key(today)
  return revisions.map((r) => {
    if (!r.firstStudied) {
      return { ...r, dues: [null, null, null], nextReview: null, status: '➕ add first-studied date' }
    }
    const base = parse(r.firstStudied)
    const dues = INTERVALS[band(r.confidence)].map((n) => key(addDays(base, n)))
    const done = [r.r1Done === true, r.r2Done === true, r.r3Done === true]
    const idx = done.findIndex((d) => !d)
    const nextReview = idx === -1 ? null : dues[idx]
    const status =
      nextReview === null
        ? '✅ cycle complete'
        : nextReview < todayK
          ? '🔴 Overdue'
          : nextReview === todayK
            ? '🟡 Due today'
            : '🟢 Scheduled'
    return { ...r, dues, nextReview, status }
  })
}
