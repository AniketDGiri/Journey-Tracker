import type { AppState, DayKey, Domain, Iso, XpEvent, XpSourceType } from '../domain/types';
import { uid } from '../lib/id';

/** Levels & ranks. XP to go from level L to L+1 = round(90 · L^1.25). */

export const RANKS = [
  { name: 'Novice', minLevel: 1, blurb: 'Learning the fundamentals' },
  { name: 'Apprentice', minLevel: 5, blurb: 'Building reliable habits' },
  { name: 'Hunter', minLevel: 10, blurb: 'Solving with intent' },
  { name: 'Elite', minLevel: 15, blurb: 'Interview-ready on most fronts' },
  { name: 'Master', minLevel: 20, blurb: 'Teaching-level understanding' },
  { name: 'Monarch', minLevel: 25, blurb: 'Command of every domain' },
] as const;

export type RankName = (typeof RANKS)[number]['name'];

export function xpForLevelUp(level: number): number {
  return Math.round(90 * Math.pow(level, 1.25));
}

export function totalXpForLevel(level: number): number {
  let t = 0;
  for (let l = 1; l < level; l++) t += xpForLevelUp(l);
  return t;
}

export interface LevelInfo {
  level: number;
  rank: (typeof RANKS)[number];
  nextRank?: (typeof RANKS)[number];
  totalXp: number;
  intoLevel: number;
  forNext: number;
  progress: number;
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForLevelUp(level) && level < 99) {
    remaining -= xpForLevelUp(level);
    level++;
  }
  const rank = [...RANKS].reverse().find((r) => level >= r.minLevel) ?? RANKS[0];
  const nextRank = RANKS.find((r) => r.minLevel > level);
  const forNext = xpForLevelUp(level);
  return { level, rank, nextRank, totalXp, intoLevel: remaining, forNext, progress: remaining / forNext };
}

export function totalXp(state: AppState): number {
  return state.xp.reduce((s, e) => s + e.amount, 0);
}

export function grantedFor(state: AppState, type: XpSourceType, ref: string): number {
  return state.xp.filter((e) => e.type === type && e.ref === ref).reduce((s, e) => s + e.amount, 0);
}

export interface GrantRequest {
  type: XpSourceType;
  ref: string;
  /** The total this source should be worth. Only the difference to what was already granted is awarded. */
  target: number;
  reason: string;
  domain?: Domain;
}

/**
 * Idempotent XP grant. Each (type, ref) pair can never be worth more than its
 * target, so toggling a status or re-completing a quest can't farm XP.
 */
export function grant(state: AppState, req: GrantRequest, today: DayKey, at: Iso): { state: AppState; amount: number } {
  const delta = Math.round(req.target) - grantedFor(state, req.type, req.ref);
  if (delta <= 0) return { state, amount: 0 };
  const ev: XpEvent = {
    id: uid('xp'),
    type: req.type,
    ref: req.ref,
    amount: delta,
    reason: req.reason,
    domain: req.domain,
    date: today,
    at,
  };
  return { state: { ...state, xp: [...state.xp, ev] }, amount: delta };
}

export function xpByDomain(state: AppState): Record<Domain | 'general', number> {
  const out = { dsa: 0, hld: 0, lld: 0, general: 0 };
  for (const e of state.xp) out[e.domain ?? 'general'] += e.amount;
  return out;
}
