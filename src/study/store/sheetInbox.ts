import type { AppState, DayKey, Domain, ItemStatus, PracticeItem, RecallQuality, SessionOutcome } from '../domain/types';
import { ActionError, finishSession, logProgress, reviewItem, type Ctx } from '../engine/actions';
import { logWeight } from '../engine/nutrition';
import type { PersonalTask } from '../engine/sidequests';
import { isDayKey } from '../lib/date';

/**
 * The other direction of the Google Sheet mirror: things you log in the sheet.
 *
 * The sheet only collects entries; the app applies them, through the same actions
 * as its own screens, so XP, quests, streaks, backlog and revisions all follow.
 * This file turns one sheet entry into one of those actions (or a reason it can't
 * be applied, which the sheet shows next to the entry). See google-sheets/README.md.
 */

/** What the sheet sends: an edit in a mirror tab, or a row in one of the ✎ tabs. */
export interface SheetEntry {
  id: string;
  source: 'cell' | 'input';
  tab: string;
  /** cell: the row's hidden ID, the edited column and its new value. */
  ref?: string;
  column?: string;
  value?: string | number | boolean;
  /** input: the row, by column header. */
  values?: Record<string, string | number | boolean>;
}

export type PlannedChange =
  | { kind: 'study'; label: string; fn: (s: AppState, ctx: Ctx) => AppState }
  | { kind: 'task-section'; label: string; taskId: string; section: string }
  | { kind: 'task-add'; label: string; task: Omit<PersonalTask, 'id'> }
  | { kind: 'time-slot'; label: string; date: DayKey; slot: string; fields: { task: string; urgent: boolean | null; important: boolean | null } };

export interface PersonalSide {
  personalTasks?: PersonalTask[];
  personalSections?: { id: string; name: string }[];
  timeConfig?: { startHour: number; endHour: number; interval: number };
}

// ── Names shared with the mirror (store/sheetMirror) and the Apps Script ──

export const TAB = {
  items: 'Items',
  revisions: 'Revisions due',
  tasks: 'Personal tasks',
  studyLog: '✎ Study log',
  studyTime: '✎ Study time',
  newTask: '✎ New task',
  timeSlot: '✎ Time slot',
  weight: '✎ Weight',
  lists: '_lists',
} as const;

export const OUTCOMES: [string, { status?: ItemStatus; recall?: RecallQuality }][] = [
  ['Attempted', { status: 'attempted' }],
  ['Unsolved', { status: 'unsolved' }],
  ['Done with hints', { status: 'with-hints' }],
  ['Done on my own', { status: 'independent' }],
  ['Revised: recalled', { recall: 'success' }],
  ['Revised: partly', { recall: 'partial' }],
  ['Revised: forgot', { recall: 'fail' }],
];
export const RECALLS: [string, RecallQuality][] = [
  ['Recalled', 'success'],
  ['Partly', 'partial'],
  ['Forgot', 'fail'],
];
export const STUDY_WHAT: [string, SessionOutcome][] = [
  ['Learned new', 'learned'],
  ['Practised', 'practiced'],
  ['Solved', 'solved'],
  ['Revised', 'revised'],
];
export const DOMAIN_NAMES: [string, Domain][] = [
  ['DSA', 'dsa'],
  ['HLD', 'hld'],
  ['LLD', 'lld'],
];
export const PRIORITIES = ['High', 'Medium', 'Low'];
export const EFFORTS = ['Small', 'Medium', 'Large'];

/**
 * How an item is named in the sheet's dropdowns: "DSA · Two Sum". A title used twice
 * in a domain gets its topic, then a number, so every name points at one item.
 */
export function itemLabels(state: AppState): Map<string, string> {
  const topic = new Map(state.topics.map((t) => [t.id, t.name]));
  const base = (i: PracticeItem) => `${i.domain.toUpperCase()} · ${i.title.trim()}`;
  const count = new Map<string, number>();
  for (const i of state.items) count.set(base(i), (count.get(base(i)) ?? 0) + 1);
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const i of [...state.items].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1))) {
    let label = count.get(base(i))! > 1 ? `${base(i)} (${topic.get(i.topicId) ?? 'no topic'})` : base(i);
    for (let n = 2; used.has(label); n++) label = `${base(i)} (${topic.get(i.topicId) ?? 'no topic'} #${n})`;
    used.add(label);
    out.set(i.id, label);
  }
  return out;
}

// ── Reading cells ──

const text = (v: unknown) => (v === undefined || v === null ? '' : String(v)).trim();
const num = (v: unknown): number | undefined => {
  const t = text(v);
  if (!t) return undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
const bool = (v: unknown): boolean | null => (v === true || /^(true|yes|y|✓)$/i.test(text(v)) ? true : v === false || /^(false|no|n)$/i.test(text(v)) ? false : null);
const pick = <T,>(list: [string, T][], v: unknown, what: string): T => {
  const t = text(v).toLowerCase();
  const hit = list.find(([name]) => name.toLowerCase() === t);
  if (!hit) throw new ActionError(`Pick a ${what} from the list (${list.map(([n]) => n).join(', ')}).`);
  return hit[1];
};

/** The day an entry counts on: the row's date, or today; never the future. */
function dayOf(v: unknown, today: DayKey): DayKey {
  const t = text(v).slice(0, 10);
  if (!t) return today;
  if (!isDayKey(t)) throw new ActionError('Write the date as a date (e.g. 2026-11-10).');
  if (t > today) throw new ActionError('That date is in the future.');
  return t;
}
const on = (day: DayKey, ctx: Ctx): Ctx => (day === ctx.today ? ctx : { today: day, now: new Date(`${day}T12:00:00`).toISOString() });

function itemFrom(state: AppState, labelOrId: unknown): PracticeItem {
  const key = text(labelOrId);
  if (!key) throw new ActionError('Pick an item.');
  const byId = state.items.find((i) => i.id === key);
  if (byId) return byId;
  for (const [id, label] of itemLabels(state)) if (label === key) return state.items.find((i) => i.id === id)!;
  throw new ActionError(`No item called “${key}” (it may have been renamed or deleted). Pick it from the list again.`);
}

/** One item outcome, the same way the app's Log progress does it (backdated to `day`). */
function outcomeFn(itemId: string, outcome: { status?: ItemStatus; recall?: RecallQuality }, day: DayKey, minutes?: number, confidence?: number) {
  return (s: AppState, ctx: Ctx): AppState => {
    const c = on(day, ctx);
    const item = s.items.find((i) => i.id === itemId);
    if (!item) throw new ActionError('That item no longer exists.');
    if (outcome.recall) return reviewItem(s, itemId, outcome.recall, c);
    const status = outcome.status!;
    return logProgress(s, itemId, { status, minutes, confidence, practiced: status === item.status }, c);
  };
}

/**
 * Works out what a sheet entry asks for: null when there is nothing to do (a dropdown
 * emptied, a task already in that state). Throws, with a message for the sheet, when
 * it can't be done.
 */
export function planEntry(e: SheetEntry, state: AppState, personal: PersonalSide, today: DayKey): PlannedChange | null {
  if (e.source === 'cell') {
    if (e.tab === TAB.items && e.column === 'Log now') {
      if (!text(e.value)) return null;
      const item = itemFrom(state, e.ref);
      const outcome = pick(OUTCOMES, e.value, 'result');
      return { kind: 'study', label: `${item.title}: ${text(e.value)}`, fn: outcomeFn(item.id, outcome, today) };
    }
    if (e.tab === TAB.revisions && e.column === 'Revise now') {
      if (!text(e.value)) return null;
      const item = itemFrom(state, e.ref);
      const recall = pick(RECALLS, e.value, 'recall');
      return { kind: 'study', label: `${item.title}: revised`, fn: outcomeFn(item.id, { recall }, today) };
    }
    if (e.tab === TAB.tasks && e.column === 'Done') {
      const task = personal.personalTasks?.find((t) => t.id === e.ref);
      if (!task) throw new ActionError('That task no longer exists.');
      const done = bool(e.value) === true;
      if (done === (task.section === 'done')) return null;
      return { kind: 'task-section', label: `${task.title}: ${done ? 'done' : 'reopened'}`, taskId: task.id, section: done ? 'done' : 'todo' };
    }
    throw new ActionError('That column can’t be changed from the sheet; it is rewritten from the app.');
  }

  const v = e.values ?? {};
  switch (e.tab) {
    case TAB.studyLog: {
      const day = dayOf(v.Date, today);
      const item = itemFrom(state, v.Item);
      const outcome = pick(OUTCOMES, v.Result, 'result');
      const minutes = num(v.Minutes);
      if (minutes !== undefined && (Number.isNaN(minutes) || minutes < 0 || minutes > 24 * 60)) throw new ActionError('Minutes must be a number between 0 and 1440.');
      const confidence = num(v.Confidence);
      if (confidence !== undefined && (Number.isNaN(confidence) || confidence < 1 || confidence > 5)) throw new ActionError('Confidence is 1 to 5.');
      return { kind: 'study', label: `${item.title}: ${text(v.Result)}`, fn: outcomeFn(item.id, outcome, day, minutes, confidence) };
    }
    case TAB.studyTime: {
      const day = dayOf(v.Date, today);
      const minutes = num(v.Minutes);
      if (minutes === undefined || Number.isNaN(minutes) || minutes < 1 || minutes > 24 * 60) throw new ActionError('Minutes must be between 1 and 1440.');
      const item = text(v.Item) ? itemFrom(state, v.Item) : undefined;
      const domain = item?.domain ?? pick(DOMAIN_NAMES, v.Domain, 'domain');
      const outcome = pick(STUDY_WHAT, v['What you did'], 'activity');
      return {
        kind: 'study',
        label: `${minutes} min of ${domain.toUpperCase()}`,
        fn: (s, ctx) =>
          finishSession(s, { domain, topicId: item?.topicId, itemId: item?.id, durationMin: minutes, outcome, confidence: 0, hintsUsed: false, notes: text(v.Note), date: day }, ctx).state,
      };
    }
    case TAB.weight: {
      const day = dayOf(v.Date, today);
      const kg = num(v.kg);
      if (kg === undefined || Number.isNaN(kg)) throw new ActionError('Enter the weight in kg.');
      return { kind: 'study', label: `Weight ${kg} kg`, fn: (s, ctx) => logWeight(s, day, kg, on(day, ctx)) };
    }
    case TAB.newTask: {
      const title = text(v.Task);
      if (!title) throw new ActionError('Write the task.');
      const sections = personal.personalSections ?? [];
      const sectionName = text(v.Section);
      const section = sectionName ? sections.find((s) => s.name.toLowerCase() === sectionName.toLowerCase())?.id : 'todo';
      if (!section) throw new ActionError(`No section called “${sectionName}”.`);
      const priority = text(v.Priority) || 'Medium';
      const effort = text(v.Effort) || 'Medium';
      if (!PRIORITIES.includes(priority)) throw new ActionError(`Priority is ${PRIORITIES.join(', ')}.`);
      if (!EFFORTS.includes(effort)) throw new ActionError(`Effort is ${EFFORTS.join(', ')}.`);
      const due = text(v.Due).slice(0, 10);
      if (due && !isDayKey(due)) throw new ActionError('Write the due date as a date.');
      return {
        kind: 'task-add',
        label: `New task: ${title}`,
        task: { title: title.slice(0, 200), section, priority, effort, category: text(v.Category), start: '', end: due ? `${due}T00:00` : '', notes: text(v.Note), projectId: null, ...(section === 'done' ? { doneAt: today } : {}) },
      };
    }
    case TAB.timeSlot: {
      const date = text(v.Date).slice(0, 10) || today;
      if (!isDayKey(date)) throw new ActionError('Write the date as a date.');
      const slot = text(v.Slot).padStart(5, '0');
      const cfg = personal.timeConfig;
      if (cfg && !slotsOf(cfg).includes(slot)) throw new ActionError(`Pick a slot from the list (every ${cfg.interval} min, ${cfg.startHour}:00–${cfg.endHour}:00).`);
      const task = text(v.Task);
      if (!task) throw new ActionError('Write what you did in that slot.');
      return { kind: 'time-slot', label: `${date} ${slot}: ${task}`, date, slot, fields: { task, urgent: bool(v.Urgent) ?? false, important: bool(v.Important) ?? false } };
    }
  }
  throw new ActionError(`The app doesn’t know the tab “${e.tab}”.`);
}

export function slotsOf({ startHour, endHour, interval }: { startHour: number; endHour: number; interval: number }): string[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const out: string[] = [];
  for (let m = startHour * 60; m < endHour * 60; m += interval) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}

// ── Never apply the same entry twice ──

const KEEP = 400;

/** Entries already applied (kept in the synced settings, so every device knows). */
export const appliedIds = (state: AppState): Set<string> => new Set(state.settings.sheetMirror?.applied ?? []);

export function markApplied(state: AppState, id: string): AppState {
  const m = state.settings.sheetMirror;
  if (!m) return state;
  const applied = [...(m.applied ?? []).filter((x) => x !== id), id].slice(-KEEP);
  return { ...state, settings: { ...state.settings, sheetMirror: { ...m, applied } } };
}

/** Talks to the Apps Script: fetch waiting entries, then report how each went. */
export async function callSheet<T>(url: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('Could not reach the Google Sheet.');
  }
  const t = await res.text();
  let out: { ok?: boolean; error?: string } & T;
  try {
    out = JSON.parse(t);
  } catch {
    throw new Error(/<html/i.test(t) ? 'The sheet link opened a sign-in page. Deploy the script with “Who has access: Anyone”.' : 'The Google Sheet sent an unexpected reply.');
  }
  if (!out.ok) throw new Error(out.error ?? 'The Google Sheet refused the request.');
  return out;
}
