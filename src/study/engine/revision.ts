import type { DayKey, PracticeItem, RecallQuality, ReviewState } from '../domain/types';
import { addDays, diffDays } from '../lib/date';

/**
 * Spaced-repetition engine.
 *
 * `stage` indexes a configurable interval ladder (default 1→3→7→14→30→60 days).
 *  - Learning something for the first time places it at stage 0 (review tomorrow).
 *  - success: climb one stage, interval grows.
 *  - partial: stay on the stage but use half the interval (min 1 day).
 *  - fail:    drop back to stage 0 and review tomorrow; counts as a lapse.
 */

export const LEARNED_STATUSES = new Set(['with-hints', 'independent']);

export function isLearned(item: PracticeItem): boolean {
  return LEARNED_STATUSES.has(item.status);
}

/** `auto: false` (planned revisions) never sets a date: the player picks one in the revision plan. */
export function startLearning(review: ReviewState, today: DayKey, intervals: number[], auto = true): ReviewState {
  if (review.stage >= 0) return { ...review, lastStudiedAt: today };
  return {
    ...review,
    stage: 0,
    firstStudiedAt: review.firstStudiedAt ?? today,
    lastStudiedAt: today,
    nextReviewAt: auto ? addDays(today, intervals[0] ?? 1) : review.nextReviewAt,
  };
}

export function nextInterval(stage: number, quality: RecallQuality, intervals: number[]): { stage: number; interval: number } {
  const last = intervals.length - 1;
  const cur = Math.max(0, Math.min(stage, last));
  switch (quality) {
    case 'fail':
      return { stage: 0, interval: intervals[0] ?? 1 };
    case 'partial':
      return { stage: cur, interval: Math.max(1, Math.ceil((intervals[cur] ?? 1) / 2)) };
    case 'success': {
      const s = Math.min(cur + 1, last);
      return { stage: s, interval: intervals[s] ?? 1 };
    }
  }
}

export function applyRecall(review: ReviewState, quality: RecallQuality, today: DayKey, intervals: number[], auto = true): ReviewState {
  const base = review.stage < 0 ? startLearning(review, today, intervals, auto) : review;
  const { stage, interval } = nextInterval(base.stage, quality, intervals);
  return {
    ...base,
    stage,
    lastReviewedAt: today,
    // Planned mode: a finished revision leaves the item unplanned until you pick its next date.
    nextReviewAt: auto ? addDays(today, interval) : undefined,
    planned: undefined,
    successCount: base.successCount + (quality === 'success' ? 1 : 0),
    lapseCount: base.lapseCount + (quality === 'fail' ? 1 : 0),
    history: [...base.history, { date: today, quality, interval }].slice(-50),
  };
}

/** A hand-picked revision date; `undefined` takes the item off the plan. */
export function reschedule(review: ReviewState, date: DayKey | undefined): ReviewState {
  return { ...review, nextReviewAt: date, planned: date ? true : undefined };
}

/** Where the ladder would put the next revision, from the last study or revision. */
export function ladderDate(review: ReviewState, today: DayKey, intervals: number[]): DayKey {
  const from = review.lastReviewedAt ?? review.lastStudiedAt ?? today;
  return addDays(from, intervals[Math.max(0, Math.min(review.stage, intervals.length - 1))] ?? 1);
}

export type DueBucket = 'overdue' | 'today' | 'upcoming' | 'none';

export function dueBucket(item: PracticeItem, today: DayKey, horizon = 7): DueBucket {
  const next = item.review.nextReviewAt;
  if (!isLearned(item) || item.review.stage < 0 || !next) return 'none';
  const d = diffDays(today, next);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= horizon) return 'upcoming';
  return 'none';
}

export function daysOverdue(item: PracticeItem, today: DayKey): number {
  return item.review.nextReviewAt ? Math.max(0, diffDays(item.review.nextReviewAt, today)) : 0;
}

export interface RevisionQueues {
  overdue: PracticeItem[];
  today: PracticeItem[];
  upcoming: PracticeItem[];
  weak: PracticeItem[];
}

export function revisionQueues(items: PracticeItem[], today: DayKey): RevisionQueues {
  const q: RevisionQueues = { overdue: [], today: [], upcoming: [], weak: [] };
  for (const it of items) {
    const b = dueBucket(it, today);
    if (b === 'overdue') q.overdue.push(it);
    else if (b === 'today') q.today.push(it);
    else if (b === 'upcoming') q.upcoming.push(it);
    if (isWeak(it)) q.weak.push(it);
  }
  q.overdue.sort((a, b) => (a.review.nextReviewAt! < b.review.nextReviewAt! ? -1 : 1));
  q.upcoming.sort((a, b) => (a.review.nextReviewAt! < b.review.nextReviewAt! ? -1 : 1));
  q.weak.sort((a, b) => weakness(b) - weakness(a));
  return q;
}

/** Items that need more practice rather than (or as well as) spaced review. */
export function isWeak(it: PracticeItem): boolean {
  if (it.status === 'unsolved' || it.status === 'attempted') return true;
  if (isLearned(it) && it.confidence > 0 && it.confidence <= 2) return true;
  if (it.review.lapseCount >= 2 && it.review.lapseCount >= it.review.successCount) return true;
  const recent = it.review.history.slice(-1)[0];
  return recent?.quality === 'fail';
}

function weakness(it: PracticeItem): number {
  let w = it.review.lapseCount * 2;
  if (it.status === 'unsolved') w += 3;
  if (it.status === 'attempted') w += 2;
  if (it.confidence > 0) w += 3 - Math.min(3, it.confidence);
  return w;
}
