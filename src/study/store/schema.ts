import type { AppState, Goal, MissReasonKind, SubItem } from '../domain/types';
import { DEFAULT_SETTINGS, SCHEMA_VERSION, emptyFitness } from '../domain/defaults';
import { javaTrack } from '../domain/catalog';
import { emptyNutrition } from '../domain/nutrition';
import { isDayKey, toDayKey } from '../lib/date';

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
    // Penalties arrived later: an existing journey is judged only from the day it first loads with them.
    penaltiesSince: isDayKey(settingsIn.penaltiesSince) ? settingsIn.penaltiesSince : toDayKey(new Date()),
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

  // v5 → v6: revisions are planned by hand. Dates the ladder set are dropped once; hand-picked ones stay.
  if (version < 6 && settings.revisionMode === 'planned') {
    itemList = itemList.map((i) => (i.review.nextReviewAt && !i.review.planned ? { ...i, review: { ...i.review, nextReviewAt: undefined } } : i));
  }

  // v4 → v5: the Java track joins DSA. Added once; anything you already have is kept as is.
  let topicList = topics as AppState['topics'];
  if (version < 5) {
    const java = javaTrack(new Date().toISOString());
    const haveTopics = new Set(topicList.map((t) => t.id));
    const haveItems = new Set(itemList.map((i) => i.id));
    topicList = [...topicList, ...java.topics.filter((t) => !haveTopics.has(t.id))];
    itemList = [...itemList, ...java.items.filter((i) => !haveItems.has(i.id))];
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    mode,
    onboarded: payload.onboarded !== false,
    createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : new Date().toISOString(),
    topics: topicList,
    items: itemList,
    activity,
    xp: (Array.isArray(payload.xp) ? payload.xp : []) as AppState['xp'],
    sessions: (Array.isArray(payload.sessions) ? payload.sessions : []) as AppState['sessions'],
    activeSession: isObj(payload.activeSession) ? (payload.activeSession as unknown as AppState['activeSession']) : undefined,
    bossAttempts: (Array.isArray(payload.bossAttempts) ? payload.bossAttempts : []) as AppState['bossAttempts'],
    goals: cleanGoals(payload.goals),
    // v3 → v4: training phases and nutrition tracking.
    fitness: isObj(payload.fitness)
      ? ({
          activePhaseId: typeof payload.fitness.activePhaseId === 'string' ? payload.fitness.activePhaseId : 'phase-0',
          starts: isObj(payload.fitness.starts) ? payload.fitness.starts : {},
          logs: Array.isArray(payload.fitness.logs) ? payload.fitness.logs : [],
        } as AppState['fitness'])
      : emptyFitness(),
    nutrition: isObj(payload.nutrition)
      ? ({
          ...emptyNutrition(),
          ...payload.nutrition,
          days: isObj(payload.nutrition.days) ? payload.nutrition.days : {},
          weights: Array.isArray(payload.nutrition.weights) ? payload.nutrition.weights : [],
        } as AppState['nutrition'])
      : emptyNutrition(),
    achievements: (isObj(payload.achievements) ? payload.achievements : {}) as AppState['achievements'],
    questPlan: cleanQuestPlan(payload.questPlan),
    missReasons: cleanMissReasons(payload.missReasons),
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

const MISS_KINDS = new Set(['work', 'commitments', 'health', 'travel', 'energy', 'planning', 'other']);

function cleanMissReasons(v: unknown): AppState['missReasons'] {
  if (!isObj(v)) return undefined;
  const out: NonNullable<AppState['missReasons']> = {};
  for (const [day, r] of Object.entries(v)) {
    if (!isDayKey(day) || !isObj(r) || !MISS_KINDS.has(r.reason as string)) continue;
    out[day] = { reason: r.reason as MissReasonKind, at: typeof r.at === 'string' ? r.at : '', ...(typeof r.note === 'string' && r.note.trim() ? { note: r.note.trim() } : {}) };
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
