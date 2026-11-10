import type { AppState, DayKey, Iso } from '../domain/types';
import { addDays, daysBetween, diffDays, shortWeekday } from '../lib/date';
import { computeStreak } from '../engine/streak';
import { levelInfo, totalXp } from '../engine/progression';
import { computeTopicStats } from '../engine/mastery';
import { dueBucket, daysOverdue, revisionQueues } from '../engine/revision';
import { evaluateGoals } from '../engine/plan';
import { computeBacklog, remaining } from '../engine/backlog';
import { ACHIEVEMENTS, evaluateAchievements } from '../engine/achievements';
import { availableDailyQuests, focusOf, STUDY_TRACKS } from '../engine/quests';
import { minutesByDay } from '../engine/studytime';
import { dayTotals } from '../engine/nutrition';
import { getPhase } from '../engine/fitness';
import { lifeSummary } from '../engine/life';
import { toExport } from './schema';
import { rankOf, type PersonalProject, type PersonalSection, type PersonalTask } from '../engine/sidequests';

/**
 * A read-only copy of the app in a Google Sheet (see google-sheets/README.md).
 * The app works everything out — streaks, quests, backlog, revisions — and sends
 * finished tables, so the sheet shows exactly what the app shows. Each push
 * rewrites the tabs it owns and leaves any tab you add yourself alone. It also
 * carries the raw data, which the sheet keeps as a daily backup.
 */

export type Cell = string | number | boolean;
export interface Table {
  name: string;
  header: string[];
  rows: Cell[][];
}

/** The Personal and Time workspaces (the legacy store). */
export interface PersonalData {
  personalTasks?: PersonalTask[];
  personalSections?: PersonalSection[];
  projects?: PersonalProject[];
  timeLog?: Record<string, { slots?: Record<string, { task?: string; urgent?: boolean | null; important?: boolean | null }>; happy?: string }>;
}

export interface MirrorPayload {
  secret: string;
  /** When this copy was built; the sheet ignores a push older than the last one it took. */
  generatedAt: Iso;
  tables: Table[];
  backup: { day: DayKey; json: string };
}

const pad = (n: number) => String(n).padStart(2, '0');
/** Local date and time, in a form Sheets reads as a date. */
export const when = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const up = (s?: string) => (s ? s.toUpperCase() : '');
const yes = (b?: boolean | null) => (b === true ? 'Yes' : b === false ? 'No' : '');
const newestFirst = <T,>(rows: T[], key: (r: T) => string) => [...rows].sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0));

export function buildMirror(state: AppState, personal: PersonalData, today: DayKey, now = new Date()): Table[] {
  const topicName = new Map(state.topics.map((t) => [t.id, t.name]));
  const item = new Map(state.items.map((i) => [i.id, i]));
  const itemTitle = (id?: string) => (id ? (item.get(id)?.title ?? '(deleted)') : '');
  const streak = computeStreak(state, today);
  const level = levelInfo(totalXp(state));
  const stats = computeTopicStats(state, today);
  const queues = revisionQueues(state.items, today);
  const goals = evaluateGoals(state, today);
  const backlog = computeBacklog(state, today);
  const minutes = minutesByDay(state);
  const tasks = personal.personalTasks ?? [];
  const life = lifeSummary(state, tasks, today);
  const quests = availableDailyQuests(state, today);

  // ── Daily: one row per day of the journey ──
  const firstDay = [state.createdAt.slice(0, 10), ...state.activity.map((a) => a.date)].filter((d) => d <= today).sort()[0] ?? today;
  const start = firstDay < addDays(today, -730) ? addDays(today, -730) : firstDay;
  const byDay = <T,>(list: T[], day: (x: T) => string) => {
    const m = new Map<string, T[]>();
    for (const x of list) m.set(day(x), [...(m.get(day(x)) ?? []), x]);
    return m;
  };
  const actByDay = byDay(state.activity, (a) => a.date);
  const xpByDay = byDay(state.xp, (x) => x.date);
  const lifeDay = new Map(life.recent.map((d) => [d.day, d]));
  const daily = daysBetween(start, today)
    .reverse()
    .map((d) => {
      const acts = actByDay.get(d) ?? [];
      const count = (t: string) => acts.filter((a) => a.type === t).length;
      const lq = lifeDay.get(d);
      return [
        d,
        shortWeekday(d),
        focusOf(state, d).map((t) => STUDY_TRACKS.find((x) => x.id === t)?.label ?? t).join(', '),
        streak.marks.get(d) ?? '',
        minutes.get(d) ?? 0,
        count('solve'),
        count('learn'),
        count('attempt') + count('progress'),
        count('review'),
        acts.length,
        (xpByDay.get(d) ?? []).reduce((n, x) => n + x.amount, 0),
        backlog.behindDays.has(d) ? 'Yes' : '',
        lq ? `${lq.done} of ${lq.total}` : '',
        state.missReasons?.[d]?.reason ?? '',
        state.missReasons?.[d]?.note ?? '',
      ];
    });

  const summary: Cell[][] = [
    ['Player', state.settings.playerName || ''],
    ['Today', today],
    ['Level', level.level],
    ['Rank', level.rank.name],
    ['Total XP', level.totalXp],
    ['XP to next level', level.forNext - level.intoLevel],
    ['Current streak (days)', streak.current],
    ['Longest streak (days)', streak.longest],
    ['Streak shields', streak.shields],
    ['Studied today', streak.activeToday ? 'Yes' : 'No'],
    ['Study minutes today', minutes.get(today) ?? 0],
    ['Daily study-time goal (min)', state.settings.targets.minutesPerDay],
    ["Today's focus", focusOf(state, today).map((t) => STUDY_TRACKS.find((x) => x.id === t)?.label ?? t).join(', ') || 'Rest / revision'],
    ['Revisions overdue', queues.overdue.length],
    ['Revisions due today', queues.today.length],
    ['Revisions upcoming (7 days)', queues.upcoming.length],
    ['Backlog open', backlog.open.length],
    ['Items total', state.items.length],
    ['Items done', state.items.filter((i) => i.status === 'independent' || i.status === 'with-hints').length],
    ['Achievements earned', Object.keys(state.achievements).length],
    ['Journey target date', state.settings.targetDate],
    ['Life level', life.level.level],
    ['Life rank', life.rank.name],
    ['Life XP', life.xp],
    ['Life streak (days)', life.streak],
    ['Last synced', when(now.toISOString())],
  ];

  const tables: Table[] = [
    { name: 'Summary', header: ['What', 'Value'], rows: summary },
    {
      name: "Today's quests",
      header: ['Quest', 'Track', 'Progress', 'Target', 'Done', 'Bonus', 'Reward XP', 'Detail'],
      rows: quests.map((q) => [q.title, up(q.domain), q.achieved ?? q.progress, q.target, q.complete ? 'Yes' : 'No', q.bonus ? 'Yes' : '', q.reward, q.detail]),
    },
    {
      name: 'Daily',
      header: ['Date', 'Day', 'Focus', 'Streak', 'Study min', 'Solved', 'Learned', 'Attempted / progress', 'Revised', 'Activities', 'XP', 'Fell behind', 'Life quest', 'Missed reason', 'Missed note'],
      rows: daily,
    },
    {
      name: 'Activity log',
      header: ['Date', 'Time', 'Domain', 'Type', 'What', 'Item', 'Topic', 'Status', 'Recall', 'Minutes'],
      rows: newestFirst(state.activity, (a) => a.at).map((a) => [a.date, when(a.at), up(a.domain), a.type, a.label, itemTitle(a.itemId), topicName.get(a.topicId ?? '') ?? '', a.status ?? '', a.quality ?? '', a.minutes ?? '']),
    },
    {
      name: 'Items',
      header: ['Domain', 'Topic', 'Title', 'Kind', 'Difficulty', 'Status', 'Confidence', 'Minutes spent', 'Best solve (min)', 'Steps done', 'Next revision', 'Last revised', 'Revisions OK', 'Lapses', 'Tags', 'Link', 'Notes', 'Created', 'Updated'],
      rows: state.items.map((i) => [
        up(i.domain),
        topicName.get(i.topicId) ?? '',
        i.title,
        i.kind,
        i.difficulty ?? '',
        i.status,
        i.confidence || '',
        i.timeSpentMin,
        i.solveTimeMin ?? '',
        i.subItems?.length ? `${i.subItems.filter((s) => s.done).length} of ${i.subItems.length}` : '',
        i.review.nextReviewAt ?? '',
        i.review.lastReviewedAt ?? '',
        i.review.successCount,
        i.review.lapseCount,
        i.tags.join(', '),
        i.url ?? '',
        i.notes,
        when(i.createdAt),
        when(i.updatedAt),
      ]),
    },
    {
      name: 'Revisions due',
      header: ['Status', 'Due', 'Days overdue', 'Domain', 'Topic', 'Item', 'Last revised', 'Revisions OK', 'Lapses'],
      rows: [...queues.overdue, ...queues.today, ...queues.upcoming].map((i) => [
        dueBucket(i, today),
        i.review.nextReviewAt ?? '',
        daysOverdue(i, today) || '',
        up(i.domain),
        topicName.get(i.topicId) ?? '',
        i.title,
        i.review.lastReviewedAt ?? '',
        i.review.successCount,
        i.review.lapseCount,
      ]),
    },
    {
      name: 'Revision history',
      header: ['Date', 'Domain', 'Topic', 'Item', 'Recall', 'Was due', 'Late (days)', 'Next in (days)'],
      rows: newestFirst(
        state.items.flatMap((i) => i.review.history.map((h) => ({ i, h }))),
        (r) => r.h.date,
      ).map(({ i, h }) => [h.date, up(i.domain), topicName.get(i.topicId) ?? '', i.title, h.quality, h.dueAt ?? '', h.dueAt && h.date > h.dueAt ? diffDays(h.dueAt, h.date) : '', h.interval]),
    },
    {
      name: 'Topics',
      header: ['Domain', 'Track', 'Tier', 'Topic', 'State', 'Mastery %', 'Solved', 'Started', 'Target', 'Revisions due'],
      rows: state.topics.map((t) => {
        const s = stats.get(t.id);
        return [up(t.domain), t.track ?? '', t.tier, t.name, s?.state ?? '', s ? Math.round(s.mastery) : '', s?.solved ?? 0, s?.started ?? 0, t.target, s?.due ?? 0];
      }),
    },
    {
      name: 'Study sessions',
      header: ['Date', 'Started', 'Ended', 'Minutes', 'Domain', 'Topic', 'Item', 'Outcome', 'Confidence', 'Hints', 'Notes'],
      rows: newestFirst(state.sessions, (s) => s.startedAt).map((s) => [s.date, when(s.startedAt), when(s.endedAt), s.durationMin, up(s.domain), topicName.get(s.topicId ?? '') ?? '', itemTitle(s.itemId), s.outcome, s.confidence || '', yes(s.hintsUsed), s.notes]),
    },
    {
      name: 'Planner',
      header: ['Status', 'Period', 'From', 'To', 'Task', 'Item', 'Done on'],
      rows: [...goals].sort((a, b) => (a.windowStart < b.windowStart ? 1 : -1)).map((g) => [g.status, g.goal.period, g.windowStart, g.windowEnd, g.title, g.parent ?? '', g.completedOn ?? '']),
    },
    {
      name: 'Backlog',
      header: ['State', 'Category', 'Domain', 'What', 'Fell behind on', 'Owed', 'Paid', 'Left', 'Cleared on', 'Written off on'],
      rows: [
        ...backlog.open.map((e) => ['Open', e] as const),
        ...backlog.cleared.map((e) => ['Cleared', e] as const),
        ...backlog.waived.map((e) => ['Written off', e] as const),
      ].map(([st, e]) => [st, e.category, up(e.domain), e.title, e.day, e.owed, e.paid, remaining(e), e.clearedOn ?? '', e.waived ?? '']),
    },
    {
      name: 'XP log',
      header: ['Date', 'Time', 'Source', 'XP', 'Reason', 'Domain'],
      rows: newestFirst(state.xp, (x) => x.at).map((x) => [x.date, when(x.at), x.type, x.amount, x.reason, up(x.domain)]),
    },
    {
      name: 'Achievements',
      header: ['Group', 'Achievement', 'Description', 'Progress', 'Target', 'Earned on'],
      rows: [
        ...evaluateAchievements({ state, today, streak }).map((a) => {
          const def = ACHIEVEMENTS.find((d) => d.id === a.id)!;
          return [def.group, def.name, def.description, a.current, a.target, state.achievements[a.id] ?? (a.earned ? 'Yes' : '')];
        }),
        ...life.achievements.map((a) => [`Life · ${a.def.group}`, a.def.name, a.def.description, a.current, a.target, a.earned ? 'Yes' : '']),
      ],
    },
    {
      name: 'Workouts',
      header: ['Date', 'Phase', 'Workout', 'Exercise', 'Sets (reps × kg)', 'Total reps', 'Cardio min', 'Duration min', 'Notes'],
      rows: newestFirst(state.fitness.logs, (l) => l.at).flatMap((l) => {
        const phase = getPhase(l.phaseId);
        const w = phase?.workouts.find((x) => x.id === l.workoutId);
        const base = [l.date, phase?.name ?? l.phaseId, w ? `${w.code} ${w.title}` : l.workoutId];
        const rows = l.exercises.map((e) => [
          ...base,
          e.substitution ? `${e.name} (→ ${e.substitution})` : e.name,
          e.sets.map((s) => `${s.reps}×${s.weight || 'BW'}`).join(', '),
          e.sets.reduce((n, s) => n + s.reps, 0),
          l.cardioMin,
          l.durationMin ?? '',
          l.notes,
        ]);
        return rows.length ? rows : [[...base, '', '', '', l.cardioMin, l.durationMin ?? '', l.notes]];
      }),
    },
    {
      name: 'Nutrition',
      header: ['Date', 'Calories', 'Protein g', 'Meals logged', 'Within budget', 'Protein hit', 'Extras', 'Habits', 'Supplements'],
      rows: Object.keys(state.nutrition.days)
        .sort()
        .reverse()
        .map((d) => {
          const t = dayTotals(state, d);
          const day = state.nutrition.days[d];
          const on = (r: Record<string, boolean>) => Object.keys(r).filter((k) => r[k]).join(', ');
          return [d, t.cal, t.protein, t.mealsLogged, yes(t.withinBudget), yes(t.proteinHit), day.extras.map((e) => e.name).join(', '), on(day.habits), on(day.supplements)];
        }),
    },
    {
      name: 'Weight',
      header: ['Date', 'kg'],
      rows: newestFirst(state.nutrition.weights, (w) => w.date).map((w) => [w.date, w.kg]),
    },
    {
      name: 'Personal tasks',
      header: ['Title', 'Section', 'Rank', 'Priority', 'Effort', 'Category', 'Project', 'Start', 'End', 'Done on', 'Steps done', 'Notes'],
      rows: tasks.map((t) => {
        const section = personal.personalSections?.find((s) => s.id === t.section)?.name ?? t.section;
        const project = personal.projects?.find((p) => p.id === t.projectId)?.name ?? '';
        const steps = (t.subtasks ?? []) as { done?: boolean }[];
        return [t.title, section, rankOf(t), t.priority ?? '', t.effort ?? '', t.category ?? '', project, (t.start ?? '').replace('T', ' '), (t.end ?? '').replace('T', ' '), t.doneAt ?? '', steps.length ? `${steps.filter((s) => s.done).length} of ${steps.length}` : '', t.notes ?? ''];
      }),
    },
    {
      name: 'Projects',
      header: ['Project', 'Status', 'Tasks', 'Done'],
      rows: (personal.projects ?? []).map((p) => {
        const mine = tasks.filter((t) => t.projectId === p.id);
        return [p.name, p.status ?? '', mine.length, mine.filter((t) => t.section === 'done').length];
      }),
    },
    {
      name: 'Time log',
      header: ['Date', 'Time', 'Task', 'Urgent', 'Important', 'Happy with the day'],
      rows: Object.entries(personal.timeLog ?? {})
        .sort(([a], [b]) => (a < b ? 1 : -1))
        .flatMap(([d, day]) => {
          const filled = Object.entries(day.slots ?? {})
            .filter(([, s]) => s?.task?.trim())
            .sort(([a], [b]) => (a < b ? -1 : 1));
          const happy = day.happy === 'yes' ? 'Yes' : day.happy === 'no' ? 'No' : '';
          if (!filled.length) return happy ? [[d, '', '', '', '', happy]] : [];
          return filled.map(([slot, s]) => [d, slot, s.task!.trim(), yes(s.urgent), yes(s.important), happy]);
        }),
    },
  ];
  return tables;
}

/** The whole push: tables plus the raw data, which the sheet keeps as a daily backup. */
export function mirrorPayload(secret: string, state: AppState, personal: PersonalData, today: DayKey, now = new Date()): MirrorPayload {
  return {
    secret,
    generatedAt: now.toISOString(),
    tables: buildMirror(state, personal, today, now),
    backup: {
      day: today,
      // One file both importers read: Settings → Import backup (study) and the Personal/Time header import.
      json: JSON.stringify({ ...toExport(state), ...personal }),
    },
  };
}

/**
 * Sends the push to the Apps Script web app. Plain text keeps it a "simple"
 * request, so the browser needs no CORS preflight (which Apps Script can't answer).
 */
export async function pushMirror(url: string, payload: MirrorPayload): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  } catch {
    throw new Error('Could not reach the Google Sheet. Check the link and that the script is deployed for "Anyone".');
  }
  const text = await res.text();
  let body: { ok?: boolean; error?: string } = {};
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(/<html/i.test(text) ? 'The link opened a Google sign-in page. Deploy the script with “Who has access: Anyone”.' : 'The Google Sheet sent an unexpected reply.');
  }
  if (!body.ok) throw new Error(body.error ?? 'The Google Sheet refused the update.');
}

/** A link that looks like a deployed Apps Script web app. */
export const isScriptUrl = (url: string) => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url.trim());
