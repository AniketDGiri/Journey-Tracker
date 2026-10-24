import type { AppState, DayKey } from '../domain/types';
import { addDays, diffDays, weekday } from '../lib/date';

/**
 * Streaks, designed to be forgiving:
 *  - Planned rest days (Settings) neither count nor break a streak.
 *  - Every 7 active days earns a Shield (max 2). A missed day automatically uses
 *    one so a single off-day never wipes progress.
 *  - Today never breaks the streak — you still have time.
 * Everything is recomputed from history, so there is no hidden state to corrupt.
 */

export const MAX_SHIELDS = 2;
export const DAYS_PER_SHIELD = 7;

export type DayMark = 'active' | 'rest' | 'shielded' | 'missed' | 'pending';

export interface StreakInfo {
  current: number;
  longest: number;
  shields: number;
  activeToday: boolean;
  marks: Map<DayKey, DayMark>;
}

export function activeDays(state: AppState): Set<DayKey> {
  const s = new Set<DayKey>();
  for (const a of state.activity) s.add(a.date);
  return s;
}

export function computeStreak(state: AppState, today: DayKey): StreakInfo {
  const active = activeDays(state);
  const marks = new Map<DayKey, DayMark>();
  if (!active.size) return { current: 0, longest: 0, shields: 0, activeToday: false, marks };
  const first = [...active].sort()[0];
  const rest = new Set(state.settings.restDays);
  let current = 0;
  let longest = 0;
  let shields = 0;
  let runActive = 0;
  for (let d = first; diffDays(d, today) >= 0; d = addDays(d, 1)) {
    if (active.has(d)) {
      current++;
      runActive++;
      marks.set(d, 'active');
      if (runActive % DAYS_PER_SHIELD === 0) shields = Math.min(MAX_SHIELDS, shields + 1);
    } else if (d === today) {
      marks.set(d, 'pending');
    } else if (rest.has(weekday(d))) {
      marks.set(d, 'rest');
    } else if (shields > 0 && current > 0) {
      shields--;
      marks.set(d, 'shielded');
    } else {
      marks.set(d, 'missed');
      current = 0;
      runActive = 0;
    }
    longest = Math.max(longest, current);
  }
  return { current, longest, shields, activeToday: active.has(today), marks };
}
