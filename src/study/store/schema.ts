import type { AppState, Goal, SubItem } from '../domain/types';
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../domain/defaults';
import { isDayKey } from '../lib/date';

/** Validation + migration for persisted and imported data. */

export class SchemaError extends Error {}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const arr = (v: unknown, name: string): unknown[] => {
  if (!Array.isArray(v)) throw new SchemaError(`"${name}" is missing or not a list.`);
  return v;
};

export function migrate(raw: unknown): AppState {
  if (!isObj(raw)) throw new SchemaError('File is not an Ascend backup.');
  const payload = isObj(raw.data) && raw.app === 'ascend' ? raw.data : raw;
  if (!isObj(payload)) throw new SchemaError('File is not an Ascend backup.');
  const version = typeof payload.schemaVersion === 'number' ? payload.schemaVersion : 0;
  if (version > SCHEMA_VERSION) throw new SchemaError('This backup was made by a newer version of Ascend.');

  const topics = arr(payload.topics, 'topics');
  const items = arr(payload.items, 'items');
  for (const t of topics) if (!isObj(t) || typeof t.id !== 'string' || typeof t.name !== 'string') throw new SchemaError('A topic is malformed.');
  for (const i of items) {
    if (!isObj(i) || typeof i.id !== 'string' || typeof i.title !== 'string' || !isObj(i.review)) throw new SchemaError('A practice item is malformed.');
    const next = (i.review as Record<string, unknown>).nextReviewAt;
    if (next !== undefined && !isDayKey(next)) throw new SchemaError(`Invalid revision date on "${i.title}".`);
  }

  const settingsIn = isObj(payload.settings) ? payload.settings : {};
  const settings = {
    ...DEFAULT_SETTINGS,
    ...settingsIn,
    xp: { ...DEFAULT_SETTINGS.xp, ...(isObj(settingsIn.xp) ? settingsIn.xp : {}) },
    targets: { ...DEFAULT_SETTINGS.targets, ...(isObj(settingsIn.targets) ? settingsIn.targets : {}) },
    targetDate: isDayKey(settingsIn.targetDate) ? settingsIn.targetDate : DEFAULT_SETTINGS.targetDate,
  };
  // v2 → v3: the 3h study-time default briefly shipped; 2h is the intended daily minimum.
  if (version < 3 && settings.targets.minutesPerDay === 180) settings.targets = { ...settings.targets, minutesPerDay: DEFAULT_SETTINGS.targets.minutesPerDay };

  const mode = payload.mode === 'sample' ? 'sample' : 'real';
  const activity = (Array.isArray(payload.activity) ? payload.activity : []) as AppState['activity'];
  let itemList = (items as AppState['items']).map((i) => (i.subItems === undefined ? i : { ...i, subItems: cleanSubItems(i.subItems) }));
  // v1 → v2: real journeys no longer ship DSA/HLD starter items. Only untouched
  // ones go; anything you have worked on, noted or broken into steps stays.
  if (version < 2 && mode === 'real') {
    const touched = new Set(activity.map((a) => a.itemId).filter(Boolean));
    itemList = itemList.filter(
      (i) =>
        i.custom ||
        (i.domain !== 'dsa' && i.domain !== 'hld') ||
        i.status !== 'not-started' ||
        i.timeSpentMin > 0 ||
        !!i.notes?.trim() ||
        !!i.subItems?.length ||
        touched.has(i.id),
    );
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    mode,
    onboarded: payload.onboarded !== false,
    createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : new Date().toISOString(),
    topics: topics as AppState['topics'],
    items: itemList,
    activity,
    xp: (Array.isArray(payload.xp) ? payload.xp : []) as AppState['xp'],
    sessions: (Array.isArray(payload.sessions) ? payload.sessions : []) as AppState['sessions'],
    activeSession: isObj(payload.activeSession) ? (payload.activeSession as unknown as AppState['activeSession']) : undefined,
    bossAttempts: (Array.isArray(payload.bossAttempts) ? payload.bossAttempts : []) as AppState['bossAttempts'],
    goals: cleanGoals(payload.goals),
    achievements: (isObj(payload.achievements) ? payload.achievements : {}) as AppState['achievements'],
    questPlan: cleanQuestPlan(payload.questPlan),
    settings: settings as AppState['settings'],
  };
}

function cleanQuestPlan(v: unknown): Record<string, string[]> | undefined {
  if (!isObj(v)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [day, ids] of Object.entries(v)) {
    if (isDayKey(day) && Array.isArray(ids)) out[day] = ids.filter((id): id is string => typeof id === 'string');
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanSubItems(v: unknown): SubItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is Record<string, unknown> => isObj(s) && typeof s.id === 'string' && typeof s.title === 'string')
    .map((s) => ({ id: s.id as string, title: s.title as string, done: s.done === true, ...(s.done === true && isDayKey(s.doneAt) ? { doneAt: s.doneAt } : {}) }));
}

const PERIODS = new Set(['day', 'week', 'month']);

function cleanGoals(v: unknown): Goal[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (g): g is Goal =>
      isObj(g) && typeof g.id === 'string' && typeof g.itemId === 'string' && PERIODS.has(g.period as string) && isDayKey(g.start) && isDayKey(g.createdOn),
  );
}

export function toExport(state: AppState) {
  return { app: 'ascend', exportedAt: new Date().toISOString(), schemaVersion: SCHEMA_VERSION, data: state };
}
