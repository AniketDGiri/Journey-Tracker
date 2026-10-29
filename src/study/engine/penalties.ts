import type { AppState, DayKey, XpEvent } from '../domain/types';
import { uid } from '../lib/id';
import { addDays, addMonths, endOfMonth, formatDay, monthYear, startOfMonth, startOfWeek, weekday } from '../lib/date';
import { dailyQuests, monthlyChallenges, requiredOf, weeklyChallenges } from './quests';
import { computeStreak } from './streak';
import { levelInfo, totalXp, totalXpForLevel } from './progression';

/**
 * Solo Leveling-style penalties for study quests.
 *
 *  - A day whose chosen daily quests weren't all completed costs XP for each one missed.
 *  - Missing again the next day escalates it (×1.5, then ×2).
 *  - The Penalty Zone: completing every daily quest the following day wins half of it back.
 *  - A week or month that ends with under half its challenges done costs half a challenge reward.
 *
 * Fairness rules: rest days and days covered by a streak shield are exempt, nothing before
 * `settings.penaltiesSince` is ever judged, and a penalty never drops you below your rank.
 * Each penalty is written to the XP ledger once, so it is visible and never charged twice.
 */

export const ESCALATION = [1, 1.5, 2];
export const REDEEM_SHARE = 0.5;
/** Penalties only look this far back, so a long absence can't snowball into a wipe-out. */
const LOOKBACK_DAYS = 60;

export const escalation = (consecutive: number) => ESCALATION[Math.min(Math.max(consecutive, 1), ESCALATION.length) - 1];

const dayRef = (day: DayKey) => `daily:${day}`;
const redeemRef = (day: DayKey) => `redeem:${day}`;

export interface DayJudgement {
  day: DayKey;
  total: number;
  missed: number;
  failed: boolean;
  exempt?: 'rest' | 'shield';
}

export function judgeDay(state: AppState, day: DayKey, marks?: Map<DayKey, string>): DayJudgement {
  // Bonus quests are optional: skipping one is never a failure.
  const qs = requiredOf(dailyQuests(state, day));
  const missed = qs.filter((q) => !q.complete).length;
  if (state.settings.restDays.includes(weekday(day))) return { day, total: qs.length, missed, failed: false, exempt: 'rest' };
  if (marks?.get(day) === 'shielded') return { day, total: qs.length, missed, failed: false, exempt: 'shield' };
  return { day, total: qs.length, missed, failed: qs.length > 0 && missed > 0 };
}

const eventFor = (state: AppState, ref: string) => state.xp.find((e) => e.type === 'penalty' && e.ref === ref);

/** Never take XP below the start of the current rank: rank is earned for good, level can slip. */
function protectedAmount(state: AppState, raw: number): number {
  const total = totalXp(state);
  const floor = totalXpForLevel(levelInfo(total).rank.minLevel);
  return Math.max(0, Math.min(raw, total - floor));
}

function record(state: AppState, ref: string, amount: number, reason: string, day: DayKey, at: string): AppState {
  const ev: XpEvent = { id: uid('xp'), type: 'penalty', ref, amount, reason, date: day, at };
  return { ...state, xp: [...state.xp, ev] };
}

export function penaltiesActive(state: AppState): boolean {
  return state.settings.penalties && state.settings.gamification && !!state.settings.penaltiesSince;
}

/** Charges penalties for finished days, weeks and months, and pays Penalty Zone redemptions. */
export function syncPenalties(state: AppState, ctx: { today: DayKey; now: string }): { state: AppState; messages: string[] } {
  if (!penaltiesActive(state)) return { state, messages: [] };
  const { today, now } = ctx;
  const since = state.settings.penaltiesSince;
  const marks = computeStreak(state, today).marks;
  const per = state.settings.xp.dailyQuest;
  const messages: string[] = [];
  let s = state;

  // Daily quests.
  const from = since > addDays(today, -LOOKBACK_DAYS) ? since : addDays(today, -LOOKBACK_DAYS);
  let consecutive = 0;
  for (let day = from; day < today; day = addDays(day, 1)) {
    const j = judgeDay(state, day, marks);
    if (!j.failed) {
      if (!j.exempt) consecutive = 0;
      continue;
    }
    consecutive++;
    const mult = escalation(consecutive);
    let ev = eventFor(s, dayRef(day));
    if (!ev) {
      const raw = Math.round(j.missed * per * mult);
      const amount = protectedAmount(s, raw);
      const reason = `Penalty · ${j.missed} daily quest${j.missed > 1 ? 's' : ''} missed ${formatDay(day)}${mult > 1 ? ` (×${mult} repeat)` : ''}${amount < raw ? ' · rank protected' : ''}`;
      s = record(s, dayRef(day), -amount, reason, day, now);
      ev = eventFor(s, dayRef(day));
      messages.push(`[SYSTEM] Penalty: −${amount} XP. ${j.missed} daily quest${j.missed > 1 ? 's' : ''} left unfinished ${formatDay(day, today).toLowerCase()}.`);
    }
    // Penalty Zone: clear every daily quest the next day to recover half.
    const next = addDays(day, 1);
    const back = Math.round(-(ev?.amount ?? 0) * REDEEM_SHARE);
    if (back > 0 && !eventFor(s, redeemRef(day))) {
      const nj = judgeDay(state, next, marks);
      if (nj.total > 0 && nj.missed === 0) {
        s = record(s, redeemRef(day), back, `Penalty Zone survived · recovered half of ${formatDay(day)}’s penalty`, next, now);
        messages.push(`[SYSTEM] Penalty Zone survived. +${back} XP recovered.`);
      }
    }
  }

  // Weekly challenges: weeks that started on or after `since` and have ended.
  for (let ws = startOfWeek(since) < since ? addDays(startOfWeek(since), 7) : since; addDays(ws, 6) < today; ws = addDays(ws, 7)) {
    if (addDays(ws, 6) < addDays(today, -LOOKBACK_DAYS)) continue;
    const qs = weeklyChallenges(state, addDays(ws, 6));
    const done = qs.filter((q) => q.complete).length;
    const ref = `weekly:${ws}`;
    if (done * 2 < qs.length && !eventFor(s, ref)) {
      const raw = Math.round(state.settings.xp.weeklyChallenge * 0.5);
      const amount = protectedAmount(s, raw);
      s = record(s, ref, -amount, `Penalty · week of ${formatDay(ws)}: ${done}/${qs.length} weekly challenges${amount < raw ? ' · rank protected' : ''}`, addDays(ws, 6), now);
      messages.push(`[SYSTEM] Weekly penalty: −${amount} XP. Only ${done} of ${qs.length} weekly challenges done.`);
    }
  }

  // Monthly challenges: months that started on or after `since` and have ended.
  for (let ms = startOfMonth(since) < since ? addMonths(since, 1) : since; endOfMonth(ms) < today; ms = addMonths(ms, 1)) {
    const qs = monthlyChallenges(state, endOfMonth(ms));
    const done = qs.filter((q) => q.complete).length;
    const ref = `monthly:${ms}`;
    if (done * 2 < qs.length && !eventFor(s, ref)) {
      const raw = Math.round(state.settings.xp.monthlyChallenge * 0.5);
      const amount = protectedAmount(s, raw);
      s = record(s, ref, -amount, `Penalty · ${monthYear(ms)}: ${done}/${qs.length} monthly challenges${amount < raw ? ' · rank protected' : ''}`, endOfMonth(ms), now);
      messages.push(`[SYSTEM] Monthly penalty: −${amount} XP. Only ${done} of ${qs.length} monthly challenges done.`);
    }
  }

  return { state: s, messages };
}

// ── For the UI ───────────────────────────────────────────────────────────

export interface PenaltyZone {
  /** The failed day the zone is about. */
  day: DayKey;
  missed: number;
  lost: number;
  /** XP won back by clearing today, or already won back. */
  recover: number;
  survived: boolean;
}

/** Yesterday's failure, if any, and whether today has cleared it. */
export function penaltyZone(state: AppState, today: DayKey): PenaltyZone | null {
  if (!penaltiesActive(state)) return null;
  const y = addDays(today, -1);
  const ev = eventFor(state, dayRef(y));
  if (!ev) return null;
  const j = judgeDay(state, y);
  const redeemed = eventFor(state, redeemRef(y));
  return { day: y, missed: j.missed, lost: -ev.amount, recover: redeemed ? redeemed.amount : Math.round(-ev.amount * REDEEM_SHARE), survived: !!redeemed };
}

/** What missing today would cost, given the current run of failed days. */
export function atStakeToday(state: AppState, today: DayKey): { missed: number; xp: number; multiplier: number } | null {
  if (!penaltiesActive(state) || today < state.settings.penaltiesSince) return null;
  const j = judgeDay(state, today);
  if (j.exempt || !j.total) return null;
  // Today would extend the run of failed days ending yesterday.
  let consecutive = 1;
  for (let d = addDays(today, -1); eventFor(state, dayRef(d)); d = addDays(d, -1)) consecutive++;
  const multiplier = escalation(consecutive);
  return { missed: j.missed, xp: Math.round(j.missed * state.settings.xp.dailyQuest * multiplier), multiplier };
}

export interface PenaltyEntry {
  id: string;
  date: DayKey;
  amount: number;
  reason: string;
}

/** Penalties and recoveries, newest first. */
export function penaltyLog(state: AppState, limit = 20): PenaltyEntry[] {
  return state.xp
    .filter((e) => e.type === 'penalty')
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : b.date.localeCompare(a.date)))
    .slice(0, limit)
    .map((e) => ({ id: e.id, date: e.date, amount: e.amount, reason: e.reason }));
}
