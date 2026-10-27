import type { AppState, DayKey } from '../domain/types';
import { HABITS, NUTRITION_PLAN } from '../domain/nutrition';
import { PHASES } from '../domain/fitness';
import { addDays, diffDays } from '../lib/date';
import { dayTotals, getDay } from './nutrition';
import { phaseProgress, weekDone } from './fitness';
import { levelInfo, totalXpForLevel, type LevelInfo } from './progression';
import { escalation, REDEEM_SHARE } from './penalties';
import { rankOf, rewardOf, type PersonalTask, type Rank } from './sidequests';
import { dueDay } from '../../utils/taskDates';

/**
 * The Life System: Solo Leveling-style progression for training, nutrition and
 * personal side quests. Everything is derived from what is already logged, so
 * it can't drift, and it is kept apart from interview-prep XP, rank and streaks.
 */

// ── Ranks ────────────────────────────────────────────────────────────────

export const LIFE_RANKS = [
  { minLevel: 1, name: 'E-Rank Hunter', blurb: 'Every hunter starts here' },
  { minLevel: 4, name: 'D-Rank Hunter', blurb: 'The habit is forming' },
  { minLevel: 8, name: 'C-Rank Hunter', blurb: 'Showing up is normal now' },
  { minLevel: 12, name: 'B-Rank Hunter', blurb: 'Discipline over motivation' },
  { minLevel: 17, name: 'A-Rank Hunter', blurb: 'Stronger every week' },
  { minLevel: 23, name: 'S-Rank Hunter', blurb: 'Few get this far' },
  { minLevel: 30, name: 'National Level Hunter', blurb: 'In a class of your own' },
  { minLevel: 40, name: 'Shadow Monarch', blurb: 'Arise' },
] as const;

export function lifeRank(level: number) {
  return [...LIFE_RANKS].reverse().find((r) => level >= r.minLevel) ?? LIFE_RANKS[0];
}

// ── XP rules ─────────────────────────────────────────────────────────────

export const LIFE_XP = {
  workout: 50,
  formVideo: 10,
  cardio: 10,
  mealsLogged: 10,
  withinBudget: 15,
  proteinHit: 15,
  allHabits: 10,
  allSupplements: 5,
  weighIn: 5,
  questCleared: 30,
  questPerfect: 30,
  achievement: 25,
  /** Lost per objective short of clearing a day's quest (before escalation). */
  penalty: 15,
} as const;

// ── Penalties ────────────────────────────────────────────────────────────

export interface LifePenalty {
  day: DayKey;
  /** Objectives short of the clear line. */
  short: number;
  multiplier: number;
  lost: number;
  /** Won back by clearing the next day (the Penalty Zone). */
  recovered: number;
}

/**
 * Days that ended without the Daily Quest cleared, judged only from `penaltiesSince`.
 * Repeats escalate (×1.5, ×2) and clearing the next day wins half back.
 */
function lifePenalties(state: AppState, quests: DayQuest[], today: DayKey): LifePenalty[] {
  const since = state.settings.penaltiesSince;
  if (!state.settings.penalties || !since) return [];
  const from = since > addDays(today, -60) ? since : addDays(today, -60);
  const out: LifePenalty[] = [];
  let consecutive = 0;
  quests.forEach((q, i) => {
    if (q.day < from || q.day >= today) return;
    if (q.cleared) {
      consecutive = 0;
      return;
    }
    consecutive++;
    const multiplier = escalation(consecutive);
    const short = CLEAR_AT - q.done;
    const lost = Math.round(LIFE_XP.penalty * short * multiplier);
    const next = quests[i + 1];
    out.push({ day: q.day, short, multiplier, lost, recovered: next?.cleared ? Math.round(lost * REDEEM_SHARE) : 0 });
  });
  return out;
}

// ── Daily Quest ──────────────────────────────────────────────────────────

export type ObjectiveId = 'train' | 'meals' | 'budget' | 'protein' | 'habits' | 'side';

export interface Objective {
  id: ObjectiveId;
  label: string;
  detail: string;
  done: boolean;
}

export interface DayQuest {
  day: DayKey;
  objectives: Objective[];
  done: number;
  total: number;
  /** At least CLEAR_AT of the objectives: the quest counts as cleared. */
  cleared: boolean;
  perfect: boolean;
}

/** Lenient on purpose: 3 objectives keep the streak alive, the rest are for a perfect day. */
export const CLEAR_AT = 3;

/** The day's Daily Quest, judged from what was logged on that day. */
export function dailyQuest(state: AppState, tasks: PersonalTask[], day: DayKey): DayQuest {
  const trained = state.fitness.logs.some((l) => l.date === day);
  const restDay = !trained && state.fitness.logs.some((l) => l.date === addDays(day, -1));
  const t = dayTotals(state, day);
  const d = getDay(state, day);
  const habitsDone = HABITS.filter((h) => d.habits[h.id]).length;
  const cleared = tasks.filter((x) => x.section === 'done' && x.doneAt === day).length;
  // The side quest only joins the day when a personal task is due then (or one was cleared anyway).
  const hasSideQuest = cleared > 0 || tasks.some((x) => dueDay(x) === day);
  const meals = NUTRITION_PLAN.meals.length;

  const objectives: Objective[] = [
    {
      id: 'train',
      label: 'Strength training',
      detail: trained ? 'Workout logged' : restDay ? 'Rest day after yesterday’s session' : 'Log a workout, or rest the day after one',
      done: trained || restDay,
    },
    { id: 'meals', label: 'Log every meal', detail: `${Math.min(t.mealsLogged, meals)} / ${meals} meals`, done: t.mealsLogged >= meals },
    { id: 'budget', label: 'Stay within your calorie budget', detail: t.logged ? `${t.cal} / ${state.nutrition.calorieBudget} kcal` : 'Log food to check', done: t.withinBudget },
    { id: 'protein', label: 'Hit your protein goal', detail: `${t.protein} / ${state.nutrition.proteinGoal} g`, done: t.proteinHit },
    { id: 'habits', label: 'Sleep, water, fruit & veg, salad', detail: `${habitsDone} / ${HABITS.length} habits`, done: habitsDone === HABITS.length },
  ];
  if (hasSideQuest) {
    objectives.push({
      id: 'side',
      label: 'Clear a side quest',
      detail: cleared ? `${cleared} cleared` : 'Finish any personal task due today',
      done: cleared > 0,
    });
  }
  const done = objectives.filter((o) => o.done).length;
  return { day, objectives, done, total: objectives.length, cleared: done >= CLEAR_AT, perfect: done === objectives.length };
}

// ── Whole-history summary ────────────────────────────────────────────────

export interface XpSource {
  label: string;
  xp: number;
}

export interface LifeSummary {
  xp: number;
  level: LevelInfo;
  rank: (typeof LIFE_RANKS)[number];
  nextRank?: (typeof LIFE_RANKS)[number];
  sources: XpSource[];
  /** Newest first. */
  penalties: LifePenalty[];
  zone: { day: DayKey; lost: number; recover: number; survived: boolean } | null;
  atStake: { short: number; xp: number; multiplier: number } | null;
  today: DayQuest;
  /** Most recent days first, today included. */
  recent: DayQuest[];
  streak: number;
  bestStreak: number;
  clearedDays: number;
  perfectDays: number;
  achievements: LifeAchievementResult[];
}

/** First day anything life-related was logged, or today. */
function firstDay(state: AppState, tasks: PersonalTask[], today: DayKey): DayKey {
  const days = [
    ...state.fitness.logs.map((l) => l.date),
    ...Object.keys(state.nutrition.days),
    ...state.nutrition.weights.map((w) => w.date),
    ...tasks.map((t) => t.doneAt).filter((d): d is string => !!d),
  ].filter((d) => d <= today);
  const first = days.sort()[0] ?? today;
  // Bounded so a stray old date can't make every render walk years of days.
  return diffDays(first, today) > 730 ? addDays(today, -730) : first;
}

export function lifeSummary(state: AppState, tasks: PersonalTask[], today: DayKey): LifeSummary {
  const start = firstDay(state, tasks, today);
  const quests: DayQuest[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) quests.push(dailyQuest(state, tasks, d));

  // Streak: consecutive cleared days; today still counts as pending until it ends.
  let streak = 0;
  for (let i = quests.length - 1; i >= 0; i--) {
    if (quests[i].cleared) streak++;
    else if (i === quests.length - 1) continue;
    else break;
  }
  let best = 0;
  let run = 0;
  for (const q of quests) {
    run = q.cleared ? run + 1 : 0;
    best = Math.max(best, run);
  }

  const logs = state.fitness.logs;
  const workoutXp = logs.reduce((n, l) => n + LIFE_XP.workout + (l.formVideoShared ? LIFE_XP.formVideo : 0) + (l.cardioMin >= 15 ? LIFE_XP.cardio : 0), 0);
  let nutritionXp = 0;
  for (const day of Object.keys(state.nutrition.days)) {
    const t = dayTotals(state, day);
    const d = getDay(state, day);
    if (t.mealsLogged >= NUTRITION_PLAN.meals.length) nutritionXp += LIFE_XP.mealsLogged;
    if (t.withinBudget) nutritionXp += LIFE_XP.withinBudget;
    if (t.proteinHit) nutritionXp += LIFE_XP.proteinHit;
    if (HABITS.every((h) => d.habits[h.id])) nutritionXp += LIFE_XP.allHabits;
    if (NUTRITION_PLAN.supplements.every((s) => d.supplements[s.id])) nutritionXp += LIFE_XP.allSupplements;
  }
  nutritionXp += state.nutrition.weights.length * LIFE_XP.weighIn;
  const sideXp = tasks.filter((t) => t.section === 'done').reduce((n, t) => n + rewardOf(t), 0);
  const clearedDays = quests.filter((q) => q.cleared).length;
  const perfectDays = quests.filter((q) => q.perfect).length;
  const questXp = clearedDays * LIFE_XP.questCleared + perfectDays * LIFE_XP.questPerfect;

  const achievements = evaluateLifeAchievements({ state, tasks, today, quests, streak, best });
  const achievementXp = achievements.filter((a) => a.earned).reduce((n, a) => n + LIFE_XP.achievement * (a.def.reward ?? 1), 0);

  const earnedSources: XpSource[] = [
    { label: 'Training', xp: workoutXp },
    { label: 'Nutrition', xp: nutritionXp },
    { label: 'Side quests', xp: sideXp },
    { label: 'Daily Quests', xp: questXp },
    { label: 'Achievements', xp: achievementXp },
  ];
  const gross = earnedSources.reduce((n, s) => n + s.xp, 0);

  const penalties = lifePenalties(state, quests, today);
  const lost = penalties.reduce((n, p) => n + p.lost, 0);
  const recovered = penalties.reduce((n, p) => n + p.recovered, 0);
  // Rank is earned for good: it comes from XP before penalties, and penalties can't take you below its floor.
  const rank = lifeRank(levelInfo(gross).level);
  const xp = Math.max(gross - lost + recovered, totalXpForLevel(rank.minLevel));
  const level = levelInfo(xp);
  const sources: XpSource[] = [...earnedSources, ...(penalties.length ? [{ label: 'Penalties', xp: -(lost - recovered) }] : [])];

  // Penalty Zone: yesterday failed; clearing today wins half back.
  const yesterday = penalties.find((p) => p.day === addDays(today, -1));
  const zone = yesterday ? { day: yesterday.day, lost: yesterday.lost, recover: Math.round(yesterday.lost * REDEEM_SHARE), survived: quests[quests.length - 1].cleared } : null;
  // What ending today uncleared would cost, given the current run of failed days.
  const todayQ = quests[quests.length - 1];
  let failRun = 1;
  for (let d = addDays(today, -1); penalties.some((p) => p.day === d); d = addDays(d, -1)) failRun++;
  const atStake =
    state.settings.penalties && state.settings.penaltiesSince && today >= state.settings.penaltiesSince && !todayQ.cleared
      ? { short: CLEAR_AT - todayQ.done, xp: Math.round(LIFE_XP.penalty * (CLEAR_AT - todayQ.done) * escalation(failRun)), multiplier: escalation(failRun) }
      : null;

  return {
    xp,
    level,
    rank,
    nextRank: LIFE_RANKS.find((r) => r.minLevel > level.level),
    sources,
    penalties: [...penalties].reverse(),
    zone,
    atStake,
    today: quests[quests.length - 1],
    recent: [...quests].reverse(),
    streak,
    bestStreak: best,
    clearedDays,
    perfectDays,
    achievements,
  };
}

// ── Achievements ─────────────────────────────────────────────────────────

export type LifeGroup = 'Daily Quest' | 'Training' | 'Nutrition' | 'Side quests';
export const LIFE_GROUPS: LifeGroup[] = ['Daily Quest', 'Training', 'Nutrition', 'Side quests'];

interface LifeCtx {
  state: AppState;
  tasks: PersonalTask[];
  today: DayKey;
  quests: DayQuest[];
  streak: number;
  best: number;
}

export interface LifeAchievementDef {
  id: string;
  name: string;
  description: string;
  group: LifeGroup;
  reward?: number;
  measure: (c: LifeCtx) => [number, number];
}

export interface LifeAchievementResult {
  def: LifeAchievementDef;
  current: number;
  target: number;
  earned: boolean;
}

const nutritionDays = (s: AppState) => Object.keys(s.nutrition.days).map((d) => ({ d, t: dayTotals(s, d), day: getDay(s, d) }));
const habitDays = (s: AppState, id: string) => Object.values(s.nutrition.days).filter((d) => d.habits[id]).length;
const cleared = (tasks: PersonalTask[]) => tasks.filter((t) => t.section === 'done');
const clearedOfRank = (tasks: PersonalTask[], ranks: Rank[]) => cleared(tasks).filter((t) => ranks.includes(rankOf(t))).length;
const volume = (s: AppState) => s.fitness.logs.reduce((n, l) => n + l.exercises.reduce((m, e) => m + e.sets.reduce((k, x) => k + x.reps * x.weight, 0), 0), 0);

/** Exercises whose heaviest set later beat the heaviest set of their first session. */
function strongerExercises(s: AppState): number {
  const byEx = new Map<string, { first: number; best: number }>();
  for (const l of [...s.fitness.logs].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const e of l.exercises) {
      const top = Math.max(0, ...e.sets.map((x) => x.weight));
      if (!top) continue;
      const cur = byEx.get(e.exerciseId);
      if (!cur) byEx.set(e.exerciseId, { first: top, best: top });
      else cur.best = Math.max(cur.best, top);
    }
  }
  return [...byEx.values()].filter((v) => v.best > v.first).length;
}

/** Any phase week in which every workout of the phase was logged. */
function perfectWeeks(s: AppState): number {
  let n = 0;
  for (const p of PHASES) {
    const start = s.fitness.starts[p.id];
    if (!start) continue;
    for (let w = 0; w < p.weeks; w++) if (weekDone(s, p, start, w).size >= p.workouts.length) n++;
  }
  return n;
}

export const LIFE_ACHIEVEMENTS: LifeAchievementDef[] = [
  // Daily Quest
  { id: 'dq-first', name: 'Player Awakened', description: 'Clear your first Daily Quest.', group: 'Daily Quest', measure: (c) => [c.quests.filter((q) => q.cleared).length, 1] },
  { id: 'dq-perfect', name: 'Flawless', description: 'Complete every Daily Quest objective in one day.', group: 'Daily Quest', reward: 2, measure: (c) => [c.quests.filter((q) => q.perfect).length, 1] },
  { id: 'dq-perfect-10', name: 'Perfectionist', description: 'Have 10 perfect Daily Quest days.', group: 'Daily Quest', reward: 4, measure: (c) => [c.quests.filter((q) => q.perfect).length, 10] },
  { id: 'dq-streak-3', name: 'No Penalty Zone', description: 'Clear the Daily Quest 3 days in a row.', group: 'Daily Quest', measure: (c) => [c.best, 3] },
  { id: 'dq-streak-7', name: 'Week of Discipline', description: 'Clear the Daily Quest 7 days in a row.', group: 'Daily Quest', reward: 2, measure: (c) => [c.best, 7] },
  { id: 'dq-streak-30', name: 'Unbreakable', description: 'Clear the Daily Quest 30 days in a row.', group: 'Daily Quest', reward: 5, measure: (c) => [c.best, 30] },
  { id: 'dq-total-50', name: 'Daily Grinder', description: 'Clear 50 Daily Quests in total.', group: 'Daily Quest', reward: 4, measure: (c) => [c.quests.filter((q) => q.cleared).length, 50] },

  // Training
  { id: 'wo-1', name: 'First Rep', description: 'Log your first workout.', group: 'Training', measure: (c) => [c.state.fitness.logs.length, 1] },
  { id: 'wo-10', name: 'Getting the Hang', description: 'Log 10 workouts.', group: 'Training', measure: (c) => [c.state.fitness.logs.length, 10] },
  { id: 'wo-25', name: 'Gym Regular', description: 'Log 25 workouts.', group: 'Training', reward: 2, measure: (c) => [c.state.fitness.logs.length, 25] },
  { id: 'wo-50', name: 'Iron Body', description: 'Log 50 workouts.', group: 'Training', reward: 3, measure: (c) => [c.state.fitness.logs.length, 50] },
  { id: 'wo-100', name: 'Hundred Sessions', description: 'Log 100 workouts.', group: 'Training', reward: 5, measure: (c) => [c.state.fitness.logs.length, 100] },
  { id: 'wo-perfect-week', name: 'Full Week', description: 'Do every workout of a phase week.', group: 'Training', reward: 2, measure: (c) => [perfectWeeks(c.state), 1] },
  {
    id: 'wo-phase',
    name: 'Phase Cleared',
    description: 'Complete every session of a training phase.',
    group: 'Training',
    reward: 4,
    measure: (c) => [PHASES.filter((p) => { const r = phaseProgress(c.state, p, c.today); return r.sessionsTotal > 0 && r.sessionsDone >= r.sessionsTotal; }).length, 1],
  },
  { id: 'wo-stronger', name: 'Getting Stronger', description: 'Lift heavier than your first session on 5 exercises.', group: 'Training', reward: 2, measure: (c) => [strongerExercises(c.state), 5] },
  { id: 'wo-volume', name: 'Ten Tonnes', description: 'Move 10,000 kg of total volume (reps × weight).', group: 'Training', reward: 3, measure: (c) => [Math.floor(volume(c.state) / 1000), 10] },
  { id: 'wo-form', name: 'Form Check', description: 'Share a form video 5 times.', group: 'Training', measure: (c) => [c.state.fitness.logs.filter((l) => l.formVideoShared).length, 5] },
  { id: 'wo-cardio', name: 'Cardio Engine', description: 'Do 300 minutes of cardio.', group: 'Training', reward: 2, measure: (c) => [c.state.fitness.logs.reduce((n, l) => n + l.cardioMin, 0), 300] },

  // Nutrition
  { id: 'nu-1', name: 'First Bite', description: 'Log your first meal.', group: 'Nutrition', measure: (c) => [nutritionDays(c.state).filter((x) => x.t.logged).length, 1] },
  { id: 'nu-log-7', name: 'Food Journal', description: 'Log food on 7 days.', group: 'Nutrition', measure: (c) => [nutritionDays(c.state).filter((x) => x.t.logged).length, 7] },
  { id: 'nu-log-30', name: 'Mindful Eater', description: 'Log food on 30 days.', group: 'Nutrition', reward: 3, measure: (c) => [nutritionDays(c.state).filter((x) => x.t.logged).length, 30] },
  { id: 'nu-budget-7', name: 'On Budget', description: 'Stay within your calorie budget on 7 days.', group: 'Nutrition', measure: (c) => [nutritionDays(c.state).filter((x) => x.t.withinBudget).length, 7] },
  { id: 'nu-budget-30', name: 'Calorie Commander', description: 'Stay within your calorie budget on 30 days.', group: 'Nutrition', reward: 3, measure: (c) => [nutritionDays(c.state).filter((x) => x.t.withinBudget).length, 30] },
  { id: 'nu-protein-7', name: 'Protein Hunter', description: `Hit ${NUTRITION_PLAN.proteinGoal} g protein on 7 days.`, group: 'Nutrition', measure: (c) => [nutritionDays(c.state).filter((x) => x.t.proteinHit).length, 7] },
  { id: 'nu-protein-30', name: 'Built Different', description: 'Hit your protein goal on 30 days.', group: 'Nutrition', reward: 3, measure: (c) => [nutritionDays(c.state).filter((x) => x.t.proteinHit).length, 30] },
  {
    id: 'nu-perfect-plate',
    name: 'Perfect Plate',
    description: 'In one day: within budget, protein hit and every habit ticked.',
    group: 'Nutrition',
    reward: 2,
    measure: (c) => [nutritionDays(c.state).filter((x) => x.t.withinBudget && x.t.proteinHit && HABITS.every((h) => x.day.habits[h.id])).length, 1],
  },
  { id: 'nu-sleep', name: 'Well Rested', description: 'Tick “Got my sleep” on 14 days.', group: 'Nutrition', measure: (c) => [habitDays(c.state, 'sleep'), 14] },
  { id: 'nu-water', name: 'Hydrated', description: 'Tick “Drank enough water” on 14 days.', group: 'Nutrition', measure: (c) => [habitDays(c.state, 'water'), 14] },
  {
    id: 'nu-supplements',
    name: 'Stacked',
    description: 'Take every supplement on 14 days.',
    group: 'Nutrition',
    measure: (c) => [Object.values(c.state.nutrition.days).filter((d) => NUTRITION_PLAN.supplements.every((s) => d.supplements[s.id])).length, 14],
  },
  { id: 'nu-weigh-10', name: 'Data Driven', description: 'Log your weight 10 times.', group: 'Nutrition', measure: (c) => [c.state.nutrition.weights.length, 10] },

  // Side quests
  { id: 'sq-1', name: 'Side Quest Cleared', description: 'Clear your first personal task.', group: 'Side quests', measure: (c) => [cleared(c.tasks).length, 1] },
  { id: 'sq-10', name: 'Errand Runner', description: 'Clear 10 personal tasks.', group: 'Side quests', measure: (c) => [cleared(c.tasks).length, 10] },
  { id: 'sq-50', name: 'Life Admin Pro', description: 'Clear 50 personal tasks.', group: 'Side quests', reward: 3, measure: (c) => [cleared(c.tasks).length, 50] },
  { id: 'sq-100', name: 'Quest Log Legend', description: 'Clear 100 personal tasks.', group: 'Side quests', reward: 5, measure: (c) => [cleared(c.tasks).length, 100] },
  { id: 'sq-s-rank', name: 'S-Rank Clear', description: 'Clear an S-rank quest (high priority, large effort).', group: 'Side quests', reward: 2, measure: (c) => [clearedOfRank(c.tasks, ['S']), 1] },
  { id: 'sq-high-10', name: 'High-Rank Hunter', description: 'Clear 10 S, A or B-rank quests.', group: 'Side quests', reward: 3, measure: (c) => [clearedOfRank(c.tasks, ['S', 'A', 'B']), 10] },
  {
    id: 'sq-busy-day',
    name: 'Productive Day',
    description: 'Clear 5 side quests in a single day.',
    group: 'Side quests',
    reward: 2,
    measure: (c) => {
      const per = new Map<string, number>();
      for (const t of cleared(c.tasks)) if (t.doneAt) per.set(t.doneAt, (per.get(t.doneAt) ?? 0) + 1);
      return [Math.max(0, ...per.values()), 5];
    },
  },
  {
    id: 'sq-xp-1000',
    name: 'Side Quest Veteran',
    description: 'Earn 1,000 XP from side quests.',
    group: 'Side quests',
    reward: 3,
    measure: (c) => [cleared(c.tasks).reduce((n, t) => n + rewardOf(t), 0), 1000],
  },
];

function evaluateLifeAchievements(c: LifeCtx): LifeAchievementResult[] {
  return LIFE_ACHIEVEMENTS.map((def) => {
    const [cur, target] = def.measure(c);
    return { def, current: Math.min(cur, target), target, earned: cur >= target };
  });
}
