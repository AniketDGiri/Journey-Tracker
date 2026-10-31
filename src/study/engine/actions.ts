import type {
  ActivityEvent,
  ActivityType,
  AppState,
  BossAttempt,
  DayKey,
  Domain,
  Goal,
  GoalPeriod,
  ItemStatus,
  Iso,
  PracticeItem,
  RecallQuality,
  SessionOutcome,
  Settings,
  StudySession,
  SubItem,
  Topic,
  XpRules,
} from '../domain/types';
import { RUBRICS, makeItem } from '../domain/catalog';
import { uid } from '../lib/id';
import { addDays } from '../lib/date';
import { grant, levelInfo, totalXp } from './progression';
import { applyRecall, isLearned, ladderDate, reschedule } from './revision';
import { rubricRatio } from './mastery';
import { computeStreak } from './streak';
import { ACHIEVEMENTS, evaluateAchievements } from './achievements';
import { BOSSES, bossReward, bossScore } from './bosses';
import { syncPenalties } from './penalties';
import type { Quest } from './quests';
import { periodStart } from './plan';
import { completionEvent, recentRecords, reconcileClaims, reverseXp, settleItem, tickEvent, withoutEvents } from './undo';

/**
 * All state transitions live here as pure functions: (state, input, ctx) → state.
 * The UI never computes XP itself; it calls `run` and renders the feedback.
 */

export interface Ctx {
  today: DayKey;
  now: Iso;
}

export interface Feedback {
  xp: number;
  levelUp?: number;
  rankUp?: string;
  achievements: string[];
  messages: string[];
}

export class ActionError extends Error {}

export function outcomeTarget(item: PracticeItem, xp: XpRules): number {
  if (!isLearned(item)) return 0;
  const mult = item.status === 'independent' ? 1 : xp.hintMultiplier;
  switch (item.kind) {
    case 'problem': {
      const d = item.difficulty ?? 'medium';
      const base = d === 'easy' ? xp.solveEasy : d === 'hard' ? xp.solveHard : xp.solveMedium;
      return base * mult;
    }
    case 'concept':
      return xp.conceptLearned * mult;
    case 'design':
      return xp.designComplete * rubricRatio(item) * mult;
    case 'machine-coding':
      return xp.lldImplemented * rubricRatio(item) * mult;
  }
}

function activity(
  state: AppState,
  ctx: Ctx,
  ev: Omit<ActivityEvent, 'id' | 'date' | 'at'>,
): AppState {
  return { ...state, activity: [...state.activity, { id: uid('act'), date: ctx.today, at: ctx.now, ...ev }] };
}

function replaceItem(state: AppState, item: PracticeItem): AppState {
  return { ...state, items: state.items.map((i) => (i.id === item.id ? item : i)) };
}

function findItem(state: AppState, id: string): PracticeItem {
  const it = state.items.find((i) => i.id === id);
  if (!it) throw new ActionError('That item no longer exists.');
  return it;
}

// ── Items ────────────────────────────────────────────────────────────────

export type ItemMeta = Partial<Pick<PracticeItem, 'title' | 'difficulty' | 'url' | 'notes' | 'tags' | 'topicId' | 'kind'>>;

export function editItem(state: AppState, id: string, patch: ItemMeta, ctx: Ctx): AppState {
  const it = findItem(state, id);
  if (patch.title !== undefined && !patch.title.trim()) throw new ActionError('Title cannot be empty.');
  const topicId = patch.topicId ?? it.topicId;
  const topic = state.topics.find((t) => t.id === topicId);
  if (!topic) throw new ActionError('Pick a valid topic.');
  return replaceItem(state, { ...it, ...patch, domain: topic.domain, updatedAt: ctx.now });
}

export interface NewItemInput {
  topicId: string;
  kind: PracticeItem['kind'];
  title: string;
  difficulty?: PracticeItem['difficulty'];
  url?: string;
  notes?: string;
  tags?: string[];
  subItems?: SubItem[];
}

export function addItem(state: AppState, input: NewItemInput, ctx: Ctx): { state: AppState; id: string } {
  const title = input.title.trim();
  if (!title) throw new ActionError('Give the item a title.');
  const topic = state.topics.find((t) => t.id === input.topicId);
  if (!topic) throw new ActionError('Pick a topic.');
  const dup = state.items.find((i) => i.topicId === topic.id && i.title.toLowerCase() === title.toLowerCase());
  if (dup) throw new ActionError(`"${dup.title}" already exists in ${topic.name}.`);
  const item = makeItem(
    {
      id: uid('item'),
      domain: topic.domain,
      topicId: topic.id,
      kind: input.kind,
      title,
      difficulty: input.difficulty,
      url: input.url?.trim() || undefined,
      notes: input.notes ?? '',
      tags: input.tags ?? [],
      subItems: cleanSubItems(input.subItems ?? [], [], ctx.today),
      custom: true,
    },
    ctx.now,
  );
  return { state: { ...state, items: [...state.items, item] }, id: item.id };
}

// ── Sub-items ────────────────────────────────────────────────────────────

const LEARNED = new Set<ItemStatus>(['with-hints', 'independent']);

/** Trims titles and dates each tick: newly done steps get `today`, unticked ones lose it. */
function cleanSubItems(list: SubItem[], prev: SubItem[] = [], today?: DayKey): SubItem[] {
  const before = new Map(prev.map((s) => [s.id, s]));
  return list
    .map(({ doneAt, ...s }) => {
      const title = s.title.trim();
      if (!s.done) return { ...s, title };
      const at = doneAt ?? (before.get(s.id)?.done ? before.get(s.id)?.doneAt : today);
      return at ? { ...s, title, doneAt: at } : { ...s, title };
    })
    .filter((s) => s.title);
}

/**
 * What a checklist says about the item's outcome. Ticking every step completes
 * it; ticking some marks it in progress. Never downgrades: an item already
 * completed stays completed if a step is unticked (XP is never taken back).
 */
export function deriveStatus(status: ItemStatus, subItems: SubItem[] | undefined): ItemStatus {
  const list = subItems ?? [];
  if (!list.length || LEARNED.has(status)) return status;
  if (list.every((s) => s.done)) return 'independent';
  if (list.some((s) => s.done) && status === 'not-started') return 'attempted';
  return status;
}

/**
 * Stores the checklist; callers decide the status (see deriveStatus). Goals on removed steps go too,
 * and a step that was unticked takes back the study record its tick wrote.
 */
export function setSubItems(state: AppState, id: string, subItems: SubItem[], ctx: Ctx): AppState {
  const it = findItem(state, id);
  const list = cleanSubItems(subItems, it.subItems, ctx.today);
  const kept = new Set(list.map((s) => s.id));
  const stillDone = new Map(list.map((s) => [s.id, s.done]));
  let next = replaceItem(state, { ...it, subItems: list, updatedAt: ctx.now });
  next = { ...next, goals: next.goals.filter((g) => g.itemId !== id || !g.subItemId || kept.has(g.subItemId)) };

  const unticked = (it.subItems ?? []).filter((s) => s.done && stillDone.get(s.id) === false);
  const events = unticked.flatMap((s) => tickEvent(state, id, s) ?? []);
  if (!events.length) return next;
  return reconcileClaims(withoutEvents(next, events.map((e) => e.id)), events.map((e) => e.date), ctx);
}

/**
 * Puts an item back to the status `ev` moved it from, and takes back what the move earned.
 * Only if nothing has changed it since; otherwise the later change stands.
 */
function revertCompletion(state: AppState, ev: ActivityEvent, ctx: Ctx): AppState {
  const it = ev.itemId ? state.items.find((i) => i.id === ev.itemId) : undefined;
  if (!it || !ev.from || !ev.status || it.status !== ev.status || ev.from === ev.status) return state;
  const status = deriveStatus(ev.from, it.subItems);
  let next = replaceItem(withoutEvents(state, [ev.id]), { ...it, status, hintsUsed: status === 'with-hints' ? true : it.hintsUsed, updatedAt: ctx.now });
  next = settleItem(next, it.id, (x) => outcomeTarget(x, state.settings.xp), ctx);
  return reconcileClaims(next, [ev.date], ctx);
}

/**
 * One-click tick from a list: stores it and applies the derived outcome (XP, first revision).
 * Unticking undoes it: the step's record goes, and if the checklist had finished the item, that
 * completion (status, schedule, XP) is reverted. A completion you logged yourself is left alone.
 */
export function toggleSubItem(state: AppState, id: string, subId: string, ctx: Ctx): AppState {
  const it = findItem(state, id);
  const subItems = (it.subItems ?? []).map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
  const ticked = subItems.find((s) => s.id === subId)?.done;
  const next = setSubItems(state, id, subItems, ctx);
  if (!ticked) {
    // Looked up before the step's own record goes: it may be the very tick that finished the item.
    const done = isLearned(it) && !subItems.every((s) => s.done) ? completionEvent(state, id, it.status) : undefined;
    return done?.subItemId ? revertCompletion(next, done, ctx) : next;
  }
  const status = deriveStatus(it.status, subItems);
  return logProgress(next, id, { status, subItemId: subId, practiced: !isLearned(it) && status === it.status }, ctx);
}

export function deleteItem(state: AppState, id: string): AppState {
  findItem(state, id);
  // XP and activity history are kept: they record work that really happened.
  return { ...state, items: state.items.filter((i) => i.id !== id), goals: state.goals.filter((g) => g.itemId !== id) };
}

// ── Planner goals ────────────────────────────────────────────────────────

function samePlan(a: Pick<Goal, 'itemId' | 'subItemId' | 'period' | 'start'>, b: Pick<Goal, 'itemId' | 'subItemId' | 'period' | 'start'>): boolean {
  return a.itemId === b.itemId && a.subItemId === b.subItemId && a.period === b.period && a.start === b.start;
}

export function addGoal(state: AppState, input: { itemId: string; subItemId?: string; period: GoalPeriod; day: DayKey }, ctx: Ctx): AppState {
  const it = findItem(state, input.itemId);
  if (input.subItemId && !it.subItems?.some((s) => s.id === input.subItemId)) throw new ActionError('That sub-item no longer exists.');
  const start = periodStart(input.period, input.day);
  if (start < periodStart(input.period, ctx.today)) throw new ActionError('Pick today or a future date.');
  const goal: Goal = { id: uid('goal'), itemId: it.id, subItemId: input.subItemId, period: input.period, start, createdAt: ctx.now, createdOn: ctx.today };
  if (state.goals.some((g) => samePlan(g, goal))) throw new ActionError('Already planned for that period.');
  return { ...state, goals: [...state.goals, goal] };
}

export function moveGoal(state: AppState, goalId: string, period: GoalPeriod, day: DayKey, ctx: Ctx): AppState {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) throw new ActionError('That goal no longer exists.');
  const start = periodStart(period, day);
  if (start < periodStart(period, ctx.today)) throw new ActionError('Pick today or a future date.');
  if (state.goals.some((x) => x.id !== goalId && samePlan(x, { ...g, period, start }))) throw new ActionError('Already planned for that period.');
  // Moving re-commits from today, so earlier work doesn't silently complete it.
  return { ...state, goals: state.goals.map((x) => (x.id === goalId ? { ...x, period, start, createdOn: ctx.today } : x)) };
}

export function removeGoal(state: AppState, goalId: string): AppState {
  return { ...state, goals: state.goals.filter((g) => g.id !== goalId) };
}

export interface ProgressInput {
  status?: ItemStatus;
  confidence?: number;
  minutes?: number;
  solveTimeMin?: number;
  rubric?: Record<string, boolean>;
  /** Force an activity entry even if nothing else changed (e.g. a re-solve). */
  practiced?: boolean;
  /** Where the work came from, so deleting or unticking it can take its record back (engine/undo). */
  subItemId?: string;
  sessionId?: string;
}

/** Undoing a completion within this many days takes back its record and XP (today, or yesterday's late-night mistake). */
const UNDO_DAYS = 1;
const STUDY_TYPES = new Set<ActivityType>(['solve', 'learn', 'attempt', 'progress']);

export function logProgress(state: AppState, id: string, input: ProgressInput, ctx: Ctx): AppState {
  const prev = findItem(state, id);
  const intervals = state.settings.intervals;
  const status = input.status ?? prev.status;
  const statusChanged = status !== prev.status;
  const rubric = input.rubric ? { ...prev.rubric, ...input.rubric } : prev.rubric;
  const rubricKeys = prev.kind === 'design' || prev.kind === 'machine-coding' ? RUBRICS[prev.kind].map((r) => r.key) : [];
  const rubricGain = rubricKeys.filter((k) => rubric[k] && !prev.rubric[k]).length;
  const minutes = Math.max(0, Math.round(input.minutes ?? 0));

  let item: PracticeItem = {
    ...prev,
    status,
    rubric,
    confidence: input.confidence ?? prev.confidence,
    hintsUsed: status === 'with-hints' ? true : status === 'independent' ? false : prev.hintsUsed,
    timeSpentMin: prev.timeSpentMin + minutes,
    solveTimeMin:
      input.solveTimeMin && input.solveTimeMin > 0
        ? Math.min(prev.solveTimeMin ?? Infinity, input.solveTimeMin)
        : prev.solveTimeMin,
    updatedAt: ctx.now,
  };

  const becameLearned = isLearned(item) && !isLearned(prev);
  if (becameLearned) {
    item = {
      ...item,
      review: {
        ...item.review,
        stage: 0,
        firstStudiedAt: item.review.firstStudiedAt ?? ctx.today,
        lastStudiedAt: ctx.today,
        nextReviewAt: state.settings.revisionMode === 'auto' ? addDays(ctx.today, intervals[0] ?? 1) : item.review.nextReviewAt,
      },
    };
  } else if (statusChanged || rubricGain || minutes || input.practiced) {
    item = { ...item, review: { ...item.review, lastStudiedAt: ctx.today, firstStudiedAt: item.review.firstStudiedAt ?? ctx.today } };
  }

  let next = replaceItem(state, item);

  const upgraded = statusChanged && isLearned(item); // first learn, or hints → independent
  let type: ActivityType | undefined;
  if (upgraded || (input.practiced && isLearned(item))) type = item.kind === 'concept' ? 'learn' : 'solve';
  else if (statusChanged && (status === 'attempted' || status === 'unsolved')) type = 'attempt';
  else if (rubricGain || minutes || input.practiced) type = 'progress';

  if (type) {
    const label =
      type === 'progress' && rubricGain
        ? `${item.title}: +${rubricGain} rubric step${rubricGain > 1 ? 's' : ''}`
        : item.title;
    next = activity(next, ctx, {
      type,
      domain: item.domain,
      itemId: item.id,
      topicId: item.topicId,
      status: item.status,
      difficulty: item.difficulty,
      minutes: minutes || undefined,
      label,
      ...(statusChanged ? { from: prev.status } : {}),
      ...(input.subItemId ? { subItemId: input.subItemId } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    });
  }

  // Moved back (marked done or started, then undone): a recent record of it, and its XP, go too.
  // A completion from longer ago is history and stays.
  const since = addDays(ctx.today, -UNDO_DAYS);
  if (isLearned(prev) && !isLearned(item)) {
    const done = completionEvent(next, id, prev.status);
    if (done && done.date >= since) {
      const swept = recentRecords(next, id, since, 'completion');
      next = settleItem(withoutEvents(next, swept.map((e) => e.id)), id, (it) => outcomeTarget(it, state.settings.xp), ctx);
      next = reconcileClaims(next, swept.map((e) => e.date), ctx);
    }
  } else if (status === 'not-started' && prev.status !== 'not-started') {
    const swept = recentRecords(next, id, since, 'attempt');
    next = settleItem(withoutEvents(next, swept.map((e) => e.id)), id, (it) => outcomeTarget(it, state.settings.xp), ctx);
    next = reconcileClaims(next, swept.map((e) => e.date), ctx);
  }

  const target = outcomeTarget(item, state.settings.xp);
  if (target > 0) {
    next = grant(next, { type: 'outcome', ref: item.id, target, reason: `${item.title} — ${item.status === 'independent' ? 'independent' : 'with help'}`, domain: item.domain }, ctx.today, ctx.now).state;
  }
  return next;
}

export function reviewItem(state: AppState, id: string, quality: RecallQuality, ctx: Ctx): AppState {
  const prev = findItem(state, id);
  if (!isLearned(prev)) throw new ActionError('Only learned items can be revised. Log a solve first.');
  const item: PracticeItem = {
    ...prev,
    review: applyRecall(prev.review, quality, ctx.today, state.settings.intervals, state.settings.revisionMode === 'auto'),
    updatedAt: ctx.now,
  };
  let next = replaceItem(state, item);
  next = activity(next, ctx, {
    type: 'review',
    domain: item.domain,
    itemId: item.id,
    topicId: item.topicId,
    quality,
    label: item.title,
  });
  const xp = state.settings.xp;
  const amount = quality === 'success' ? xp.reviewSuccess : quality === 'partial' ? xp.reviewPartial : xp.reviewFail;
  // One revision reward per item per day.
  next = grant(next, { type: 'review', ref: `${item.id}:${ctx.today}`, target: amount, reason: `Revision · ${item.title} (${quality})`, domain: item.domain }, ctx.today, ctx.now).state;
  return next;
}

export function rescheduleItem(state: AppState, id: string, date: DayKey, ctx: Ctx): AppState {
  const it = findItem(state, id);
  if (!isLearned(it)) throw new ActionError('Only learned items have a revision schedule.');
  return replaceItem(state, { ...it, review: reschedule(it.review, date), updatedAt: ctx.now });
}

/** Put learned items on the revision plan for `date`, or take them off it with `null`. */
export function planRevisions(state: AppState, ids: string[], date: DayKey | null, ctx: Ctx): AppState {
  if (date && date < ctx.today) throw new ActionError('Pick today or a later day.');
  const set = new Set(ids);
  return {
    ...state,
    items: state.items.map((it) => (set.has(it.id) && isLearned(it) ? { ...it, review: reschedule(it.review, date ?? undefined), updatedAt: ctx.now } : it)),
  };
}

/**
 * Switch how revision dates are set. To 'planned': dates the ladder set are dropped, hand-picked ones stay.
 * To 'auto': learned items without a date get one from the ladder.
 */
export function setRevisionMode(state: AppState, mode: AppState['settings']['revisionMode'], ctx: Ctx): AppState {
  const items = state.items.map((it) => {
    if (!isLearned(it) || it.review.stage < 0) return it;
    if (mode === 'planned' && it.review.nextReviewAt && !it.review.planned) return { ...it, review: { ...it.review, nextReviewAt: undefined } };
    if (mode === 'auto' && !it.review.nextReviewAt) return { ...it, review: { ...it.review, nextReviewAt: ladderDate(it.review, ctx.today, state.settings.intervals) } };
    return it;
  });
  return { ...state, items, settings: { ...state.settings, revisionMode: mode } };
}

// ── Topics ───────────────────────────────────────────────────────────────

export function upsertTopic(
  state: AppState,
  input: { id?: string; domain: Domain; name: string; tier: number; prerequisites: string[]; target: number; description?: string },
): AppState {
  const name = input.name.trim();
  if (!name) throw new ActionError('Topic needs a name.');
  if (input.id) {
    if (input.prerequisites.includes(input.id)) throw new ActionError('A topic cannot require itself.');
    return {
      ...state,
      topics: state.topics.map((t) =>
        t.id === input.id ? { ...t, name, tier: input.tier, prerequisites: input.prerequisites, target: Math.max(1, input.target), description: input.description } : t,
      ),
    };
  }
  const topic: Topic = {
    id: uid(input.domain),
    domain: input.domain,
    name,
    tier: Math.max(0, input.tier),
    prerequisites: input.prerequisites,
    target: Math.max(1, input.target),
    description: input.description,
    custom: true,
  };
  return { ...state, topics: [...state.topics, topic] };
}

export function deleteTopic(state: AppState, id: string): AppState {
  return {
    ...state,
    topics: state.topics.filter((t) => t.id !== id).map((t) => ({ ...t, prerequisites: t.prerequisites.filter((p) => p !== id) })),
    items: state.items.filter((i) => i.topicId !== id),
    goals: state.goals.filter((g) => state.items.find((i) => i.id === g.itemId)?.topicId !== id),
  };
}

// ── Sessions ─────────────────────────────────────────────────────────────

export function startSession(state: AppState, input: { domain: Domain; topicId?: string; itemId?: string }, ctx: Ctx): AppState {
  if (state.activeSession) throw new ActionError('A session is already running.');
  return { ...state, activeSession: { ...input, startedAt: ctx.now, elapsedMs: 0, runningSince: ctx.now } };
}

export function sessionElapsedMs(s: NonNullable<AppState['activeSession']>, nowMs: number): number {
  return s.elapsedMs + (s.runningSince ? Math.max(0, nowMs - Date.parse(s.runningSince)) : 0);
}

export function toggleSessionPause(state: AppState, ctx: Ctx): AppState {
  const s = state.activeSession;
  if (!s) return state;
  if (s.runningSince) {
    return { ...state, activeSession: { ...s, elapsedMs: sessionElapsedMs(s, Date.parse(ctx.now)), runningSince: undefined } };
  }
  return { ...state, activeSession: { ...s, runningSince: ctx.now } };
}

export function cancelSession(state: AppState): AppState {
  const { activeSession: _drop, ...rest } = state;
  return rest;
}

export interface FinishSessionInput {
  domain: Domain;
  topicId?: string;
  itemId?: string;
  durationMin: number;
  outcome: SessionOutcome;
  confidence: number;
  hintsUsed: boolean;
  notes: string;
  itemStatus?: ItemStatus;
  startedAt?: Iso;
  /** Backdate a manually logged session. Defaults to today; never in the future. */
  date?: DayKey;
}

export function finishSession(state: AppState, input: FinishSessionInput, ctx0: Ctx): { state: AppState; session: StudySession } {
  const duration = Math.round(input.durationMin);
  if (!(duration > 0) || duration > 24 * 60) throw new ActionError('Duration must be between 1 minute and 24 hours.');
  if (input.date && input.date > ctx0.today) throw new ActionError('A session can’t be logged in the future.');
  // A backdated session counts on its own day (heatmap, streak, XP date), ending at 9 pm local.
  const backdated = !!input.date && input.date !== ctx0.today;
  const ctx: Ctx = backdated ? { today: input.date!, now: new Date(`${input.date}T21:00:00`).toISOString() } : ctx0;
  const session: StudySession = {
    id: uid('ses'),
    domain: input.domain,
    topicId: input.topicId,
    itemId: input.itemId,
    // Without a timer the session is taken to have ended now, so it began `duration` ago.
    startedAt: (!backdated && (input.startedAt ?? (input.date ? undefined : state.activeSession?.startedAt))) || new Date(Date.parse(ctx.now) - duration * 60_000).toISOString(),
    endedAt: ctx.now,
    date: ctx.today,
    durationMin: duration,
    outcome: input.outcome,
    confidence: input.confidence,
    hintsUsed: input.hintsUsed,
    notes: input.notes.trim(),
  };
  // A manual entry leaves any running timer alone; finishing the timer clears it.
  let next: AppState = { ...(input.date || !state.activeSession ? state : cancelSession(state)), sessions: [...state.sessions, session] };
  const item = input.itemId ? next.items.find((i) => i.id === input.itemId) : undefined;
  if (item) {
    next = logProgress(
      next,
      item.id,
      {
        status: input.itemStatus,
        confidence: input.confidence || undefined,
        minutes: duration,
        solveTimeMin: input.outcome === 'solved' ? duration : undefined,
        practiced: true,
        sessionId: session.id,
      },
      ctx,
    );
    if (input.notes.trim()) {
      const it = next.items.find((i) => i.id === item.id)!;
      const stamp = `[${ctx.today}] ${input.notes.trim()}`;
      next = replaceItem(next, { ...it, notes: it.notes ? `${it.notes}\n${stamp}` : stamp });
    }
  }
  const topicName = next.topics.find((t) => t.id === input.topicId)?.name;
  next = activity(next, ctx, {
    type: 'session',
    domain: input.domain,
    itemId: input.itemId,
    topicId: input.topicId,
    minutes: duration,
    label: `${duration} min session${item ? ` · ${item.title}` : topicName ? ` · ${topicName}` : ''}`,
    sessionId: session.id,
  });
  if (duration >= state.settings.minSessionMinutes) {
    next = grant(next, { type: 'session', ref: session.id, target: state.settings.xp.sessionComplete, reason: `Completed a ${duration}-minute session`, domain: input.domain }, ctx.today, ctx.now).state;
  }
  return { state: next, session };
}

/**
 * Removes a mistaken entry from the time log, and with it what it wrote: its activity, its XP,
 * its minutes on the item, and a completion it caused. Older sessions are matched by when they ended.
 */
export function deleteSession(state: AppState, id: string, ctx: Ctx): AppState {
  const ses = state.sessions.find((s) => s.id === id);
  if (!ses) throw new ActionError('That session no longer exists.');
  const tagged = state.activity.filter((a) => a.sessionId === id);
  const events = tagged.length ? tagged : state.activity.filter((a) => a.at === ses.endedAt && a.itemId === ses.itemId && (a.type === 'session' || STUDY_TYPES.has(a.type)));
  let next: AppState = { ...state, sessions: state.sessions.filter((s) => s.id !== id) };
  // A completion this session caused is reverted first, while its record still exists.
  for (const ev of [...events].reverse()) next = revertCompletion(next, ev, ctx);
  next = withoutEvents(next, events.map((e) => e.id));
  if (ses.itemId) {
    next = { ...next, items: next.items.map((i) => (i.id === ses.itemId ? { ...i, timeSpentMin: Math.max(0, i.timeSpentMin - ses.durationMin) } : i)) };
  }
  next = reverseXp(next, 'session', id, `Session removed · ${ses.durationMin} min`, ctx);
  return reconcileClaims(next, [ses.date, ...events.map((e) => e.date)], ctx);
}

// ── Quests, bosses, achievements ─────────────────────────────────────────

export function claimQuest(state: AppState, quest: Quest, ctx: Ctx): AppState {
  if (!quest.complete) throw new ActionError('Finish the quest before claiming it.');
  if (quest.claimed) throw new ActionError('Already claimed.');
  const type = quest.cadence === 'daily' ? 'quest' : quest.cadence === 'weekly' ? 'weekly' : quest.cadence === 'monthly' ? 'monthly' : 'mission';
  return grant(state, { type, ref: quest.ref, target: quest.reward, reason: quest.title, domain: quest.domain }, ctx.today, ctx.now).state;
}

/** Choose which daily quests count for `day`. `null` clears the choice (all quests show). */
export function setQuestPlan(state: AppState, day: DayKey, ids: string[] | null): AppState {
  const { [day]: _dropped, ...rest } = state.questPlan ?? {};
  const questPlan = ids === null ? rest : { ...rest, [day]: ids };
  return { ...state, questPlan: Object.keys(questPlan).length ? questPlan : undefined };
}

export function recordBossAttempt(
  state: AppState,
  input: { bossId: string; checks: Record<string, boolean>; minutes?: number; notes: string },
  ctx: Ctx,
): { state: AppState; attempt: BossAttempt; reward: number } {
  const boss = BOSSES.find((b) => b.id === input.bossId);
  if (!boss) throw new ActionError('Unknown boss.');
  const score = bossScore(boss, input.checks);
  const attempt: BossAttempt = { id: uid('boss'), bossId: boss.id, date: ctx.today, at: ctx.now, score, checks: input.checks, minutes: input.minutes, notes: input.notes.trim() };
  let next: AppState = { ...state, bossAttempts: [...state.bossAttempts, attempt] };
  next = activity(next, ctx, { type: 'boss', domain: boss.domain, minutes: input.minutes, label: `${boss.name} · score ${score}` });
  const r = grant(next, { type: 'boss', ref: boss.id, target: bossReward(boss, score), reason: `${boss.name} (best score ${score})`, domain: boss.domain }, ctx.today, ctx.now);
  return { state: r.state, attempt, reward: r.amount };
}

export function syncAchievements(state: AppState, ctx: Ctx): { state: AppState; earned: string[] } {
  const streak = computeStreak(state, ctx.today);
  const results = evaluateAchievements({ state, today: ctx.today, streak });
  let next = state;
  const earned: string[] = [];
  for (const r of results) {
    if (r.earned && !next.achievements[r.id]) {
      const def = ACHIEVEMENTS.find((a) => a.id === r.id)!;
      next = { ...next, achievements: { ...next.achievements, [r.id]: ctx.today } };
      next = grant(next, { type: 'achievement', ref: r.id, target: Math.round(state.settings.xp.achievement * (def.reward ?? 1)), reason: `Achievement · ${def.name}` }, ctx.today, ctx.now).state;
      earned.push(def.name);
    }
  }
  return { state: next, earned };
}

// ── Settings ─────────────────────────────────────────────────────────────

export function validateIntervals(intervals: number[]): string | null {
  if (!intervals.length) return 'Add at least one interval.';
  if (intervals.some((n) => !Number.isInteger(n) || n < 1 || n > 365)) return 'Intervals must be whole days between 1 and 365.';
  for (let i = 1; i < intervals.length; i++) if (intervals[i] < intervals[i - 1]) return 'Intervals must not decrease.';
  return null;
}

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  const settings = { ...state.settings, ...patch };
  const err = validateIntervals(settings.intervals);
  if (err) throw new ActionError(err);
  return { ...state, settings };
}

// ── Runner ───────────────────────────────────────────────────────────────

/** Apply a transition, sync achievements, and compute user-facing feedback. */
export function run(state: AppState, fn: (s: AppState) => AppState, ctx: Ctx): { state: AppState; feedback: Feedback } {
  const before = levelInfo(totalXp(state));
  const mid = fn(state);
  const synced = mid === state ? { state: mid, earned: [] } : syncAchievements(mid, ctx);
  // Finished days are judged here too, so penalties and Penalty Zone recoveries land as soon as they're due.
  const judged = syncPenalties(synced.state, ctx);
  const next = judged.state;
  const earned = synced.earned;
  const after = levelInfo(totalXp(next));
  return {
    state: next,
    feedback: {
      xp: after.totalXp - before.totalXp,
      levelUp: after.level > before.level ? after.level : undefined,
      rankUp: after.rank.name !== before.rank.name ? after.rank.name : undefined,
      achievements: earned,
      messages: judged.messages,
    },
  };
}
