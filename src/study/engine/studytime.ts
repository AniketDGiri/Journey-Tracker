import type { AppState, DayKey } from '../domain/types';
import { addDays, diffDays, weekday } from '../lib/date';

/** Minutes studied per day, from the session log. */
export function minutesByDay(state: Pick<AppState, 'sessions'>): Map<DayKey, number> {
  const m = new Map<DayKey, number>();
  for (const s of state.sessions) m.set(s.date, (m.get(s.date) ?? 0) + s.durationMin);
  return m;
}

export interface GoalStreak {
  /** Consecutive days the daily study-time goal was met. */
  current: number;
  longest: number;
  metToday: boolean;
  minutesToday: number;
}

/**
 * Days in a row the daily study-time goal was met, following the same rules as
 * the activity streak: planned rest days neither count nor break it, and today
 * never breaks it — there is still time. No shields: this one tracks the goal itself.
 */
export function goalStreak(state: Pick<AppState, 'sessions' | 'settings'>, today: DayKey): GoalStreak {
  const goal = state.settings.targets.minutesPerDay;
  const byDay = minutesByDay(state);
  const minutesToday = byDay.get(today) ?? 0;
  const met = [...byDay.entries()].filter(([, m]) => m >= goal).map(([d]) => d).sort();
  if (!met.length || met[0] > today) return { current: 0, longest: 0, metToday: false, minutesToday };
  const hit = new Set(met);
  const rest = new Set(state.settings.restDays);
  let current = 0;
  let longest = 0;
  for (let d = met[0]; diffDays(d, today) >= 0; d = addDays(d, 1)) {
    if (hit.has(d)) current++;
    else if (d !== today && !rest.has(weekday(d))) current = 0;
    longest = Math.max(longest, current);
  }
  return { current, longest, metToday: hit.has(today), minutesToday };
}

export function fmtMin(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
