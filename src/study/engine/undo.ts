import type { ActivityEvent, AppState, DayKey, ItemStatus, PracticeItem, SubItem, XpEvent, XpSourceType } from '../domain/types';
import { uid } from '../lib/id';
import { grantedFor } from './progression';
import { isLearned } from './revision';
import { availableDailyQuests } from './quests';
import type { Ctx } from './actions';

/**
 * Undoing work. Quests, goals, streaks and the heatmap are all derived from the
 * activity log, and XP from the ledger, so marking something done and then
 * undone only sticks if the undo takes back what the "done" wrote. These are the
 * primitives; actions.ts decides which events an undo reaches.
 */

/** Events that record study on an item (reviews and sessions are separate things). */
const STUDY = new Set<ActivityEvent['type']>(['solve', 'learn', 'attempt', 'progress']);
const LEARNED = new Set<ItemStatus>(['with-hints', 'independent']);

export function withoutEvents(state: AppState, ids: Iterable<string>): AppState {
  const gone = new Set(ids);
  return gone.size ? { ...state, activity: state.activity.filter((a) => !gone.has(a.id)) } : state;
}

/** Takes granted XP for (type, ref) back down to `to`. The ledger keeps both entries, so it stays readable. */
export function reverseXp(state: AppState, type: XpSourceType, ref: string, reason: string, ctx: Ctx, to = 0): AppState {
  const have = grantedFor(state, type, ref);
  if (have <= to) return state;
  const source = state.xp.find((e) => e.type === type && e.ref === ref);
  const ev: XpEvent = { id: uid('xp'), type, ref, amount: to - have, reason, domain: source?.domain, date: ctx.today, at: ctx.now };
  return { ...state, xp: [...state.xp, ev] };
}

/** Daily quest rewards already claimed for a day that is no longer complete are taken back. */
export function reconcileClaims(state: AppState, days: Iterable<DayKey>, ctx: Ctx): AppState {
  let next = state;
  for (const day of new Set(days)) {
    for (const q of availableDailyQuests(next, day)) {
      if (!q.complete) next = reverseXp(next, 'quest', q.ref, `Quest no longer complete · ${q.title}`, ctx);
    }
  }
  return next;
}

/**
 * The event that moved `item` into the learned status it has now. A real move
 * (from a status that wasn't learned) wins over later re-solves.
 */
export function completionEvent(state: AppState, itemId: string, status: ItemStatus): ActivityEvent | undefined {
  const mine = state.activity.filter((a) => a.itemId === itemId && (a.type === 'solve' || a.type === 'learn') && a.status === status);
  return [...mine].reverse().find((a) => a.from !== undefined && !LEARNED.has(a.from)) ?? mine[mine.length - 1];
}

/**
 * The event ticking `step` wrote. Ticks are tagged with their step; one made before
 * that (or on an item that was already learned, which writes nothing) has no event to find.
 */
export function tickEvent(state: AppState, itemId: string, step: SubItem): ActivityEvent | undefined {
  const tagged = state.activity.filter((a) => a.itemId === itemId && a.subItemId === step.id);
  return tagged[tagged.length - 1];
}

/**
 * An item's own records from `since` on: completions when `learned`, otherwise attempts.
 * Used when the player moves the item back, to clear what it wrote — including anything
 * an earlier mark-and-unmark left behind.
 */
export function recentRecords(state: AppState, itemId: string, since: DayKey, kind: 'completion' | 'attempt'): ActivityEvent[] {
  const types = kind === 'completion' ? ['solve', 'learn'] : ['attempt'];
  return state.activity.filter((a) => a.itemId === itemId && a.date >= since && types.includes(a.type));
}

/** The first and last days the item was studied, from what is left in the log. */
export function studyDays(state: AppState, itemId: string): { first?: DayKey; last?: DayKey } {
  const days = state.activity.filter((a) => a.itemId === itemId && STUDY.has(a.type)).map((a) => a.date).sort();
  return { first: days[0], last: days[days.length - 1] };
}

/**
 * An item that stopped being learned: its schedule is cleared (unless it was
 * actually revised along the way), its study dates follow the log again, and
 * outcome XP drops to what the new status is worth.
 */
export function settleItem(state: AppState, itemId: string, target: (item: PracticeItem) => number, ctx: Ctx): AppState {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;
  let next = state;
  if (!isLearned(item) && item.review.history.length === 0) {
    const { first, last } = studyDays(state, itemId);
    const review = { ...item.review, stage: -1, nextReviewAt: undefined, planned: undefined, firstStudiedAt: first, lastStudiedAt: last };
    next = { ...next, items: next.items.map((i) => (i.id === itemId ? { ...item, review } : i)) };
  }
  return reverseXp(next, 'outcome', itemId, `Undone · ${item.title}`, ctx, Math.round(target(item)));
}
