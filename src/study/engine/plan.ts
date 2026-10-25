import type { ActivityType, AppState, DayKey, Goal, GoalPeriod, PracticeItem, SubItem } from '../domain/types';
import { addDays, endOfMonth, startOfMonth, startOfWeek } from '../lib/date';

/**
 * Planner: goals are commitments for a day, a week or a month.
 *  - Sub-item goal → done when the sub-item is ticked (on or after the day it was planned).
 *  - Item goal     → done when real work is logged on the item inside the goal's window
 *                    (solve, learn, attempt, rubric progress, revision, a linked session or a ticked sub-item).
 * Done-ness is always derived from history, so editing a goal can't fake progress.
 */

export const WORK_TYPES = new Set<ActivityType>(['solve', 'learn', 'attempt', 'progress', 'review', 'session']);

export function periodStart(period: GoalPeriod, day: DayKey): DayKey {
  if (period === 'week') return startOfWeek(day);
  if (period === 'month') return startOfMonth(day);
  return day;
}

export function periodEnd(period: GoalPeriod, start: DayKey): DayKey {
  if (period === 'week') return addDays(start, 6);
  if (period === 'month') return endOfMonth(start);
  return start;
}

export type GoalStatus = 'done' | 'open' | 'missed';

export interface GoalView {
  goal: Goal;
  item?: PracticeItem;
  subItem?: SubItem;
  title: string;
  /** Parent item title for sub-item goals. */
  parent?: string;
  status: GoalStatus;
  completedOn?: DayKey;
  windowStart: DayKey;
  windowEnd: DayKey;
}

export function evaluateGoals(state: AppState, today: DayKey): GoalView[] {
  const items = new Map(state.items.map((i) => [i.id, i]));
  // Work days per item, sorted — index activity and sub-item ticks once.
  const workByItem = new Map<string, DayKey[]>();
  const push = (id: string, d: DayKey) => {
    const arr = workByItem.get(id) ?? [];
    arr.push(d);
    workByItem.set(id, arr);
  };
  for (const a of state.activity) if (a.itemId && WORK_TYPES.has(a.type)) push(a.itemId, a.date);
  for (const it of state.items) for (const s of it.subItems ?? []) if (s.done && s.doneAt) push(it.id, s.doneAt);
  for (const arr of workByItem.values()) arr.sort();

  return state.goals.map((goal) => {
    const item = items.get(goal.itemId);
    const sub = goal.subItemId ? item?.subItems?.find((s) => s.id === goal.subItemId) : undefined;
    const windowStart = goal.start;
    const windowEnd = periodEnd(goal.period, goal.start);
    // Work done early (after planning, before the window) still counts.
    const from = goal.createdOn < windowStart ? goal.createdOn : windowStart;
    let completedOn: DayKey | undefined;
    if (goal.subItemId) {
      // Ticked after the window closed is late but still achieved.
      if (sub?.done && sub.doneAt && sub.doneAt >= from) completedOn = sub.doneAt;
    } else {
      completedOn = (workByItem.get(goal.itemId) ?? []).find((d) => d >= from);
    }
    const status: GoalStatus = completedOn ? 'done' : today > windowEnd ? 'missed' : 'open';
    return {
      goal,
      item,
      subItem: sub,
      title: sub?.title ?? item?.title ?? 'Deleted item',
      parent: sub ? item?.title : undefined,
      status,
      completedOn,
      windowStart,
      windowEnd,
    };
  });
}

export interface Rollup {
  done: number;
  open: number;
  missed: number;
  total: number;
  rate: number;
}

export function rollup(views: GoalView[]): Rollup {
  const r = { done: 0, open: 0, missed: 0, total: views.length, rate: 0 };
  for (const v of views) r[v.status]++;
  r.rate = r.total ? r.done / r.total : 0;
  return r;
}

/** Goals whose own period is exactly this one. */
export function goalsOfPeriod(views: GoalView[], period: GoalPeriod, start: DayKey): GoalView[] {
  return views.filter((v) => v.goal.period === period && v.goal.start === start);
}

/** Every goal (any period) whose window sits inside [from, to] — used for week/month roll-ups. */
export function goalsWithin(views: GoalView[], from: DayKey, to: DayKey): GoalView[] {
  return views.filter((v) => v.windowStart >= from && v.windowEnd <= to);
}

/** Goals that apply to a given day: that day's goals plus the week & month around it. */
export function goalsForDay(views: GoalView[], day: DayKey): GoalView[] {
  const ws = startOfWeek(day);
  const ms = startOfMonth(day);
  return views.filter(
    (v) =>
      (v.goal.period === 'day' && v.goal.start === day) ||
      (v.goal.period === 'week' && v.goal.start === ws) ||
      (v.goal.period === 'month' && v.goal.start === ms),
  );
}

export const STATUS_ORDER: Record<GoalStatus, number> = { missed: 0, open: 1, done: 2 };

export function sortGoals(list: GoalView[]): GoalView[] {
  return [...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.goal.createdAt.localeCompare(b.goal.createdAt));
}
