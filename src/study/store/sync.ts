import type { AppState } from '../domain/types';
import { run, type Ctx } from '../engine/actions';

/** A change made in this tab that the server has not acknowledged yet. */
export interface Pending {
  seq: number;
  fn: (s: AppState, ctx: Ctx) => AppState;
  ctx: Ctx;
}

/**
 * Another tab or device saved first. Starts from what it saved and plays this
 * tab's unsaved changes on top, so neither side's work is lost. Changes are pure
 * transitions, so they apply to any state; one that no longer fits (its item was
 * deleted over there, say) is dropped and counted.
 */
export function rebase(remote: AppState, pending: Pending[]): { state: AppState; kept: Pending[]; dropped: number } {
  let state = remote;
  const kept: Pending[] = [];
  let dropped = 0;
  for (const p of pending) {
    try {
      state = run(state, (s) => p.fn(s, p.ctx), p.ctx).state;
      kept.push(p);
    } catch {
      dropped++;
    }
  }
  return { state, kept, dropped };
}

/**
 * Folds in what an older copy of the app (a tab or phone that hasn't reloaded since
 * the update) saved to the retired document. Only records created after `since` —
 * the last of its saves already taken in — are added, so the stale copy it still
 * holds can't bring back what was deleted here. Matching is by id, so taking the
 * same save in twice changes nothing.
 */
export function absorbLegacy(state: AppState, legacy: AppState, since: string): { state: AppState; added: number } {
  let added = 0;
  const fresh = <T extends { id: string }>(mine: T[], theirs: T[], when: (x: T) => string | undefined): T[] => {
    const have = new Set(mine.map((x) => x.id));
    const extra = theirs.filter((x) => !have.has(x.id) && (when(x) ?? '') > since);
    added += extra.length;
    return extra.length ? [...mine, ...extra] : mine;
  };

  // Items changed there after `since`, and later than here, take the newer copy.
  const theirItems = new Map(legacy.items.map((i) => [i.id, i]));
  let items = state.items.map((i) => {
    const o = theirItems.get(i.id);
    if (!o || o.updatedAt <= since || o.updatedAt <= i.updatedAt) return i;
    added++;
    return o;
  });
  items = fresh(items, legacy.items, (i) => i.createdAt);

  // XP is one ledger entry per source: never pay a source twice.
  const paid = new Set(state.xp.map((e) => `${e.type}:${e.ref}`));
  const xp = fresh(state.xp, legacy.xp.filter((e) => !paid.has(`${e.type}:${e.ref}`)), (e) => e.at);

  // Nutrition has no timestamps: only days and weigh-ins never logged here are taken.
  const days = { ...state.nutrition.days };
  for (const [d, v] of Object.entries(legacy.nutrition.days)) if (!days[d]) (days[d] = v), added++;
  const weighed = new Set(state.nutrition.weights.map((w) => w.date));
  const weights = [...state.nutrition.weights, ...legacy.nutrition.weights.filter((w) => !weighed.has(w.date) && (added++, true))];

  const next: AppState = {
    ...state,
    items,
    xp,
    activity: fresh(state.activity, legacy.activity, (a) => a.at),
    sessions: fresh(state.sessions, legacy.sessions, (s) => s.endedAt),
    goals: fresh(state.goals, legacy.goals, (g) => g.createdAt),
    bossAttempts: fresh(state.bossAttempts, legacy.bossAttempts, (b) => b.at),
    fitness: { ...state.fitness, logs: fresh(state.fitness.logs, legacy.fitness.logs, (l) => l.at) },
    nutrition: { ...state.nutrition, days, weights },
    achievements: { ...legacy.achievements, ...state.achievements },
  };
  return added ? { state: next, added } : { state, added: 0 };
}

/** What a save acknowledged up to `seq` no longer needs to replay. */
export const acknowledged = (pending: Pending[], seq: number): Pending[] => pending.filter((p) => p.seq > seq);

/** Shown when entries from an old copy of the app were kept. */
export const staleNotice = (added: number) =>
  `Kept ${added} entr${added === 1 ? 'y' : 'ies'} saved by an older copy of the app on another tab or device. Reload the app there so it stops using old data.`;
