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

/** What a save acknowledged up to `seq` no longer needs to replay. */
export const acknowledged = (pending: Pending[], seq: number): Pending[] => pending.filter((p) => p.seq > seq);
