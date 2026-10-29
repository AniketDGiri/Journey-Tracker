import type { AppState, DayKey, MissReason, MissReasonKind } from '../domain/types';
import { addDays } from '../lib/date';
import { judgeDay } from './penalties';
import { computeStreak } from './streak';
import type { Ctx } from './actions';

/**
 * Missed-day debriefs: when a day's daily quests were left unfinished, the System asks why.
 * The answers are a record for later — which weeks work ate, which days plans were too big.
 */

export const MISS_REASONS: { id: MissReasonKind; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'commitments', label: 'Other commitments' },
  { id: 'health', label: 'Health' },
  { id: 'travel', label: 'Travel' },
  { id: 'energy', label: 'Low energy' },
  { id: 'planning', label: 'Planned too much' },
  { id: 'other', label: 'Other' },
];

export const missLabel = (r: MissReasonKind) => MISS_REASONS.find((x) => x.id === r)?.label ?? 'Other';

/** Only this many recent days are asked about; older ones are let go. */
const ASK_DAYS = 7;

export interface MissedDay {
  day: DayKey;
  missed: number;
  total: number;
}

/** Recent failed days that have no reason yet, newest first. Rest and shielded days are never asked about. */
export function unexplainedMisses(state: AppState, today: DayKey): MissedDay[] {
  const since = state.settings.penaltiesSince;
  const marks = computeStreak(state, today).marks;
  const out: MissedDay[] = [];
  for (let day = addDays(today, -1); day >= addDays(today, -ASK_DAYS) && (!since || day >= since); day = addDays(day, -1)) {
    if (state.missReasons?.[day]) continue;
    const j = judgeDay(state, day, marks);
    if (j.failed) out.push({ day, missed: j.missed, total: j.total });
  }
  return out;
}

/** Record (or with `null`, clear) why `day` was missed. */
export function setMissReason(state: AppState, day: DayKey, input: { reason: MissReasonKind; note?: string } | null, ctx: Ctx): AppState {
  const { [day]: _dropped, ...rest } = state.missReasons ?? {};
  const note = input?.note?.trim();
  const entry: MissReason | undefined = input ? { reason: input.reason, at: ctx.now, ...(note ? { note } : {}) } : undefined;
  const missReasons = entry ? { ...rest, [day]: entry } : rest;
  return { ...state, missReasons: Object.keys(missReasons).length ? missReasons : undefined };
}

/** How often each reason came up in the last `days` days, most frequent first. */
export function missBreakdown(state: AppState, today: DayKey, days = 30): { reason: MissReasonKind; count: number }[] {
  const from = addDays(today, -days);
  const counts = new Map<MissReasonKind, number>();
  for (const [day, r] of Object.entries(state.missReasons ?? {})) {
    if (day >= from && day < today) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
  }
  return [...counts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}
