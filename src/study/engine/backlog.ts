import type { AppState, DayKey, Domain, PracticeItem } from '../domain/types';
import { addDays, weekday } from '../lib/date';
import { STUDY_TRACKS, availableDailyQuests, dailyQuests, questWork } from './quests';
import { evaluateGoals } from './plan';
import { isLearned } from './revision';
import { computeStreak } from './streak';
import type { Ctx } from './actions';

/**
 * Backlog: work that fell behind and is still owed. Like quests and goals it is
 * derived from history, so clearing it is just doing the work — the planner,
 * quests and revision plan all follow on their own.
 *
 *  - Daily quests: a required quest left short leaves the shortfall owed. Work on that
 *    track beyond a later day's own quest — or on a day the track isn't scheduled —
 *    pays the oldest debt first.
 *  - Planned tasks: a planner goal whose window closed undone. Working on it later
 *    completes the goal (late).
 *  - Revisions: a revision whose day passed. Revising it clears it; moving it to a
 *    new day takes it off the backlog too.
 *
 * Tracked from `state.backlogSince`. Entries can be written off (`backlogWaived`).
 */

export type BacklogCategory = 'quest' | 'plan' | 'revision';

export const BACKLOG_CATEGORIES: { id: BacklogCategory; label: string; hint: string }[] = [
  { id: 'quest', label: 'Daily quests', hint: 'Do extra on that track — beyond a later day’s own quest, or on a day it isn’t scheduled. The extra clears the oldest day first.' },
  { id: 'plan', label: 'Planned tasks', hint: 'Work on the item and the planner marks the goal done (late).' },
  { id: 'revision', label: 'Revisions', hint: 'Revise it, or move it to a new day on the revision plan.' },
];

export interface BacklogEntry {
  /** Stable id, also used to write the entry off. */
  key: string;
  category: BacklogCategory;
  domain?: Domain;
  title: string;
  /** The day it fell behind: the missed quest day, the goal's last day, the revision's day. */
  day: DayKey;
  /** Units owed and paid back (quests); 1 and 0/1 otherwise. */
  owed: number;
  paid: number;
  clearedOn?: DayKey;
  waived?: DayKey;
  itemId?: string;
  questId?: string;
}

export interface Backlog {
  since: DayKey;
  open: BacklogEntry[];
  /** Cleared by doing the work (not written off), newest first. */
  cleared: BacklogEntry[];
  waived: BacklogEntry[];
  /** Days (since tracking began, before today) on which something fell behind. */
  behindDays: Set<DayKey>;
}

export const backlogSince = (state: AppState, today: DayKey): DayKey => state.backlogSince ?? today;

const cache = new WeakMap<AppState, { today: DayKey; result: Backlog }>();

export function computeBacklog(state: AppState, today: DayKey): Backlog {
  const hit = cache.get(state);
  if (hit && hit.today === today) return hit.result;
  const result = build(state, today);
  cache.set(state, { today, result });
  return result;
}

function build(state: AppState, today: DayKey): Backlog {
  const since = backlogSince(state, today);
  const waivedOn = state.backlogWaived ?? {};
  const all: BacklogEntry[] = [];
  const behindDays = new Set<DayKey>();

  // ── Daily quests ─────────────────────────────────────────────────────
  const marks = computeStreak(state, today).marks;
  const debts = new Map<string, BacklogEntry[]>(STUDY_TRACKS.map((t) => [t.quest, []]));
  for (let d = since; d <= today; d = addDays(d, 1)) {
    const exempt = state.settings.restDays.includes(weekday(d)) || marks.get(d) === 'shielded';
    const chosen = new Set(dailyQuests(state, d).map((q) => q.id));
    const set = new Map(availableDailyQuests(state, d).map((q) => [q.id, q]));
    const done = questWork(state, d);
    for (const track of STUDY_TRACKS) {
      const queue = debts.get(track.quest)!;
      const q = set.get(track.quest);
      // Days a track isn't scheduled ask nothing of it; any work there pays its backlog.
      const required = q && !exempt && !q.bonus && chosen.has(q.id) ? q.target : 0;
      const work = done[track.id];
      if (q && d < today && work < required) {
        behindDays.add(d);
        const key = `quest:${q.id}:${d}`;
        const entry: BacklogEntry = { key, category: 'quest', domain: q.id === 'daily-java' ? undefined : q.domain, title: q.title, day: d, owed: required - work, paid: 0, questId: q.id };
        if (waivedOn[key]) entry.waived = waivedOn[key];
        else queue.push(entry);
        all.push(entry);
      }
      // Extra work pays off the oldest debt first.
      let surplus = Math.max(0, work - required);
      for (const debt of queue) {
        if (!surplus) break;
        if (debt.clearedOn || debt.day >= d) continue;
        const pay = Math.min(surplus, debt.owed - debt.paid);
        debt.paid += pay;
        surplus -= pay;
        if (debt.paid >= debt.owed) debt.clearedOn = d;
      }
    }
  }

  // ── Planned tasks ────────────────────────────────────────────────────
  for (const g of evaluateGoals(state, today)) {
    if (!g.item || g.windowEnd >= today || g.windowEnd < since) continue;
    const late = g.status === 'done' && g.completedOn! > g.windowEnd;
    if (g.status !== 'missed' && !late) continue;
    behindDays.add(g.windowEnd);
    const key = `goal:${g.goal.id}`;
    all.push({
      key,
      category: 'plan',
      domain: g.item.domain,
      title: g.parent ? `${g.parent} · ${g.title}` : g.title,
      day: g.windowEnd,
      owed: 1,
      paid: late ? 1 : 0,
      clearedOn: late ? g.completedOn : undefined,
      waived: late ? undefined : waivedOn[key],
      itemId: g.item.id,
    });
  }

  // ── Revisions ────────────────────────────────────────────────────────
  const revision = (it: PracticeItem, due: DayKey, clearedOn?: DayKey): BacklogEntry => {
    const key = `rev:${it.id}:${due}`;
    return { key, category: 'revision', domain: it.domain, title: it.title, day: due, owed: 1, paid: clearedOn ? 1 : 0, clearedOn, waived: clearedOn ? undefined : waivedOn[key], itemId: it.id };
  };
  for (const it of state.items) {
    for (const h of it.review.history) {
      if (h.dueAt && h.dueAt >= since && h.date > h.dueAt) {
        behindDays.add(h.dueAt);
        all.push(revision(it, h.dueAt, h.date));
      }
    }
    const due = it.review.nextReviewAt;
    if (isLearned(it) && due && due < today && due >= since) {
      behindDays.add(due);
      all.push(revision(it, due));
    }
  }

  const byDay = (a: BacklogEntry, b: BacklogEntry) => a.day.localeCompare(b.day) || a.title.localeCompare(b.title);
  return {
    since,
    open: all.filter((e) => !e.clearedOn && !e.waived).sort(byDay),
    cleared: all.filter((e) => e.clearedOn && !e.waived).sort((a, b) => b.clearedOn!.localeCompare(a.clearedOn!) || byDay(a, b)),
    waived: all.filter((e) => e.waived).sort((a, b) => b.waived!.localeCompare(a.waived!)),
    behindDays,
  };
}

/** What is still owed on an entry, in its own units. */
export const remaining = (e: BacklogEntry) => e.owed - e.paid;

/** Consecutive days with nothing falling behind: the current run (ending yesterday) and the longest. */
export function cleanRuns(state: AppState, today: DayKey): { current: number; longest: number } {
  const b = computeBacklog(state, today);
  let run = 0;
  let longest = 0;
  for (let d = b.since; d < today; d = addDays(d, 1)) {
    run = b.behindDays.has(d) ? 0 : run + 1;
    longest = Math.max(longest, run);
  }
  return { current: run, longest };
}

/** Write entries off (or bring them back with `waive = false`). */
export function waiveBacklog(state: AppState, keys: string[], waive: boolean, ctx: Ctx): AppState {
  const next = { ...(state.backlogWaived ?? {}) };
  for (const k of keys) {
    if (waive) next[k] = ctx.today;
    else delete next[k];
  }
  return { ...state, backlogWaived: Object.keys(next).length ? next : undefined };
}
