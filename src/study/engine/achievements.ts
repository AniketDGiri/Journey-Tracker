import type { AppState, DayKey, PracticeItem } from '../domain/types';
import { PATTERN_TOPICS } from '../domain/catalog';
import { isLearned } from './revision';
import type { StreakInfo } from './streak';
import { MASTERED_ITEM, itemMastery } from './mastery';
import { evaluateGoals } from './plan';
import { levelInfo, totalXp } from './progression';

export type AchievementGroup = 'Items' | 'Steps' | 'Revision' | 'Consistency' | 'Mastery' | 'Planning' | 'Time' | 'Quests & bosses';

/** Display order of the groups. */
export const ACHIEVEMENT_GROUPS: AchievementGroup[] = ['Items', 'Steps', 'Revision', 'Consistency', 'Mastery', 'Planning', 'Time', 'Quests & bosses'];

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  group: AchievementGroup;
  /** Multiplies the base achievement XP; later, harder milestones pay more. Default 1. */
  reward?: number;
  /** Returns [current, target]. */
  measure: (ctx: AchievementCtx) => [number, number];
}

export interface AchievementCtx {
  state: AppState;
  today: DayKey;
  streak: StreakInfo;
}

const learned = (s: AppState) => s.items.filter(isLearned);
const solvedIn = (s: AppState, topicId?: string) =>
  s.items.filter((i) => i.domain === 'dsa' && i.kind === 'problem' && isLearned(i) && (!topicId || i.topicId === topicId)).length;

const stepsDone = (s: AppState) => s.items.reduce((n, i) => n + (i.subItems ?? []).filter((x) => x.done).length, 0);

/** Items broken into steps (at least two) where every step is ticked. */
const finishedChecklists = (s: AppState, minSteps = 2) =>
  s.items.filter((i) => (i.subItems?.length ?? 0) >= minSteps && i.subItems!.every((x) => x.done)).length;

const independentSolves = (s: AppState, difficulty: PracticeItem['difficulty']) =>
  s.items.filter((i) => i.kind === 'problem' && i.difficulty === difficulty && i.status === 'independent').length;

const successRecalls = (s: AppState) => s.activity.filter((a) => a.type === 'review' && a.quality === 'success').length;

const mastered = (s: AppState, today: DayKey) => s.items.filter((i) => itemMastery(i, today) >= MASTERED_ITEM).length;

const doneGoals = (s: AppState, today: DayKey) => evaluateGoals(s, today).filter((g) => g.status === 'done').length;

const studyMinutes = (s: AppState) => s.sessions.reduce((n, x) => n + x.durationMin, 0);

const claimed = (s: AppState, type: 'quest' | 'weekly') => s.xp.filter((x) => x.type === type).length;

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Items ──────────────────────────────────────────────────────────────
  { id: 'first-item', name: 'First Step', description: 'Complete your very first item.', group: 'Items', measure: ({ state }) => [learned(state).length, 1] },
  { id: 'items-10', name: 'Ten Down', description: 'Complete 10 items.', group: 'Items', measure: ({ state }) => [learned(state).length, 10] },
  { id: 'items-25', name: 'Quarter Century', description: 'Complete 25 items.', group: 'Items', reward: 2, measure: ({ state }) => [learned(state).length, 25] },
  { id: 'items-50', name: 'Half a Hundred', description: 'Complete 50 items across any domain.', group: 'Items', reward: 2, measure: ({ state }) => [learned(state).length, 50] },
  { id: 'items-100', name: 'Hundred Club', description: 'Complete 100 items across any domain.', group: 'Items', reward: 4, measure: ({ state }) => [learned(state).length, 100] },
  { id: 'items-250', name: 'Unstoppable', description: 'Complete 250 items across any domain.', group: 'Items', reward: 6, measure: ({ state }) => [learned(state).length, 250] },
  { id: 'first-10', name: 'First 10 Problems', description: 'Solve 10 DSA problems.', group: 'Items', measure: ({ state }) => [solvedIn(state), 10] },
  { id: 'dsa-50', name: 'Half-Century', description: 'Solve 50 DSA problems.', group: 'Items', reward: 2, measure: ({ state }) => [solvedIn(state), 50] },
  { id: 'centurion', name: 'Centurion', description: 'Solve 100 DSA problems.', group: 'Items', reward: 3, measure: ({ state }) => [solvedIn(state), 100] },
  { id: 'medium-rare', name: 'Medium Rare', description: 'Solve 10 medium problems independently.', group: 'Items', reward: 2, measure: ({ state }) => [independentSolves(state, 'medium'), 10] },
  {
    id: 'hard-mode',
    name: 'Hard Mode',
    description: 'Solve a hard problem independently.',
    group: 'Items',
    measure: ({ state }) => [independentSolves(state, 'hard'), 1],
  },
  { id: 'hard-5', name: 'Giant Slayer', description: 'Solve 5 hard problems independently.', group: 'Items', reward: 3, measure: ({ state }) => [independentSolves(state, 'hard'), 5] },
  { id: 'graph-explorer', name: 'Graph Explorer', description: 'Solve 5 graph problems.', group: 'Items', measure: ({ state }) => [solvedIn(state, 'dsa-graphs') + solvedIn(state, 'dsa-advanced-graphs'), 5] },
  { id: 'dp-challenger', name: 'DP Challenger', description: 'Solve 5 dynamic programming problems.', group: 'Items', measure: ({ state }) => [solvedIn(state, 'dsa-dp'), 5] },
  {
    id: 'self-reliant',
    name: 'Self-Reliant',
    description: 'Complete 15 items completely on your own.',
    group: 'Items',
    reward: 2,
    measure: ({ state }) => [state.items.filter((i) => i.status === 'independent').length, 15],
  },
  {
    id: 'concept-collector',
    name: 'Concept Collector',
    description: 'Understand 15 HLD / LLD concepts.',
    group: 'Items',
    measure: ({ state }) => [state.items.filter((i) => i.kind === 'concept' && isLearned(i)).length, 15],
  },
  {
    id: 'system-architect',
    name: 'System Architect',
    description: 'Complete 3 system design exercises.',
    group: 'Items',
    measure: ({ state }) => [state.items.filter((i) => i.kind === 'design' && isLearned(i)).length, 3],
  },
  {
    id: 'blueprint-10',
    name: 'Master Planner',
    description: 'Complete 10 system design exercises.',
    group: 'Items',
    reward: 3,
    measure: ({ state }) => [state.items.filter((i) => i.kind === 'design' && isLearned(i)).length, 10],
  },
  {
    id: 'machinist',
    name: 'Machinist',
    description: 'Build 2 machine-coding exercises.',
    group: 'Items',
    measure: ({ state }) => [state.items.filter((i) => i.kind === 'machine-coding' && isLearned(i)).length, 2],
  },
  {
    id: 'machinist-8',
    name: 'Forge Master',
    description: 'Build 8 machine-coding exercises.',
    group: 'Items',
    reward: 3,
    measure: ({ state }) => [state.items.filter((i) => i.kind === 'machine-coding' && isLearned(i)).length, 8],
  },
  {
    id: 'triple-threat',
    name: 'Triple Threat',
    description: 'Complete at least 5 items in each of DSA, HLD and LLD.',
    group: 'Items',
    reward: 3,
    measure: ({ state }) => {
      const per = (['dsa', 'hld', 'lld'] as const).map((d) => learned(state).filter((i) => i.domain === d).length);
      return [per.reduce((n, c) => n + Math.min(c, 5), 0), 15];
    },
  },

  // ── Steps ──────────────────────────────────────────────────────────────
  { id: 'first-step-tick', name: 'One Step at a Time', description: 'Tick off your first step in an item.', group: 'Steps', measure: ({ state }) => [stepsDone(state), 1] },
  { id: 'steps-25', name: 'Stepping Up', description: 'Complete 25 steps.', group: 'Steps', measure: ({ state }) => [stepsDone(state), 25] },
  { id: 'steps-100', name: 'Step Machine', description: 'Complete 100 steps.', group: 'Steps', reward: 3, measure: ({ state }) => [stepsDone(state), 100] },
  { id: 'steps-300', name: 'Relentless', description: 'Complete 300 steps.', group: 'Steps', reward: 5, measure: ({ state }) => [stepsDone(state), 300] },
  { id: 'finisher', name: 'Finisher', description: 'Finish an item by ticking all of its steps.', group: 'Steps', measure: ({ state }) => [finishedChecklists(state), 1] },
  { id: 'finisher-5', name: 'Closer', description: 'Finish 5 items by ticking all of their steps.', group: 'Steps', reward: 2, measure: ({ state }) => [finishedChecklists(state), 5] },
  { id: 'finisher-20', name: 'Completionist', description: 'Finish 20 items by ticking all of their steps.', group: 'Steps', reward: 4, measure: ({ state }) => [finishedChecklists(state), 20] },
  { id: 'big-breakdown', name: 'Divide and Conquer', description: 'Finish an item that you broke into 5 or more steps.', group: 'Steps', reward: 2, measure: ({ state }) => [finishedChecklists(state, 5), 1] },

  // ── Revision ───────────────────────────────────────────────────────────
  { id: 'first-recall', name: 'First Recall', description: 'Recall an item from memory.', group: 'Revision', measure: ({ state }) => [successRecalls(state), 1] },
  { id: 'recall-10', name: 'Sharp Memory', description: 'Land 10 successful recalls.', group: 'Revision', measure: ({ state }) => [successRecalls(state), 10] },
  {
    id: 'revision-warrior',
    name: 'Revision Warrior',
    description: 'Land 50 successful recalls.',
    group: 'Revision',
    reward: 2,
    measure: ({ state }) => [successRecalls(state), 50],
  },
  { id: 'recall-150', name: 'Memory Palace', description: 'Land 150 successful recalls.', group: 'Revision', reward: 4, measure: ({ state }) => [successRecalls(state), 150] },
  {
    id: 'well-rehearsed',
    name: 'Well Rehearsed',
    description: 'Recall 5 different items successfully 3 or more times each.',
    group: 'Revision',
    reward: 2,
    measure: ({ state }) => [state.items.filter((i) => i.review.successCount >= 3).length, 5],
  },
  {
    id: 'comeback',
    name: 'Comeback',
    description: 'Forget something, then recall it successfully — 3 times.',
    group: 'Revision',
    reward: 2,
    measure: ({ state }) => [state.items.filter((i) => i.review.lapseCount > 0 && i.review.history.slice(-1)[0]?.quality === 'success').length, 3],
  },

  // ── Consistency ────────────────────────────────────────────────────────
  { id: 'consistency-3', name: 'Warming Up', description: 'Reach a 3-day streak.', group: 'Consistency', measure: ({ streak }) => [streak.longest, 3] },
  { id: 'consistency-7', name: '7-Day Consistency', description: 'Reach a 7-day streak.', group: 'Consistency', measure: ({ streak }) => [streak.longest, 7] },
  { id: 'consistency-14', name: 'Fortnight Focus', description: 'Reach a 14-day streak.', group: 'Consistency', reward: 2, measure: ({ streak }) => [streak.longest, 14] },
  { id: 'consistency-30', name: '30-Day Consistency', description: 'Reach a 30-day streak.', group: 'Consistency', reward: 3, measure: ({ streak }) => [streak.longest, 30] },
  { id: 'consistency-60', name: 'Iron Habit', description: 'Reach a 60-day streak.', group: 'Consistency', reward: 5, measure: ({ streak }) => [streak.longest, 60] },
  { id: 'consistency-100', name: 'Hundred Days', description: 'Reach a 100-day streak.', group: 'Consistency', reward: 8, measure: ({ streak }) => [streak.longest, 100] },
  {
    id: 'active-30',
    name: 'Showing Up',
    description: 'Be active on 30 different days.',
    group: 'Consistency',
    reward: 2,
    measure: ({ state }) => [new Set(state.activity.map((a) => a.date)).size, 30],
  },

  // ── Mastery ────────────────────────────────────────────────────────────
  { id: 'mastered-5', name: 'Rising Expert', description: 'Master 5 items (85+ item mastery).', group: 'Mastery', reward: 2, measure: ({ state, today }) => [mastered(state, today), 5] },
  { id: 'mastered-25', name: 'Deep Knowledge', description: 'Master 25 items (85+ item mastery).', group: 'Mastery', reward: 4, measure: ({ state, today }) => [mastered(state, today), 25] },
  {
    id: 'pattern-master',
    name: 'Design Pattern Master',
    description: 'Master 8 design patterns (≥85 item mastery).',
    group: 'Mastery',
    reward: 3,
    measure: ({ state, today }) => [
      state.items.filter(
        (i) => PATTERN_TOPICS.some((p) => i.topicId === `lld-${p}`) && itemMastery(i, today) >= MASTERED_ITEM,
      ).length,
      8,
    ],
  },
  {
    id: 'note-taker',
    name: 'Note Taker',
    description: 'Write notes on 10 items.',
    group: 'Mastery',
    measure: ({ state }) => [state.items.filter((i) => i.notes.trim()).length, 10],
  },
  {
    id: 'confident-10',
    name: 'Confident',
    description: 'Rate your confidence 4 or higher on 10 items.',
    group: 'Mastery',
    measure: ({ state }) => [state.items.filter((i) => i.confidence >= 4).length, 10],
  },
  { id: 'level-5', name: 'Apprentice Rank', description: 'Reach level 5.', group: 'Mastery', measure: ({ state }) => [levelInfo(totalXp(state)).level, 5] },
  { id: 'level-10', name: 'Hunter Rank', description: 'Reach level 10.', group: 'Mastery', reward: 3, measure: ({ state }) => [levelInfo(totalXp(state)).level, 10] },
  { id: 'level-20', name: 'Master Rank', description: 'Reach level 20.', group: 'Mastery', reward: 6, measure: ({ state }) => [levelInfo(totalXp(state)).level, 20] },

  // ── Planning ───────────────────────────────────────────────────────────
  { id: 'plan-1', name: 'Plan Made, Plan Done', description: 'Achieve a planned goal.', group: 'Planning', measure: ({ state, today }) => [doneGoals(state, today), 1] },
  { id: 'plan-10', name: 'On Plan', description: 'Achieve 10 planned goals.', group: 'Planning', reward: 2, measure: ({ state, today }) => [doneGoals(state, today), 10] },
  { id: 'plan-50', name: 'Plan Keeper', description: 'Achieve 50 planned goals.', group: 'Planning', reward: 4, measure: ({ state, today }) => [doneGoals(state, today), 50] },

  // ── Time ───────────────────────────────────────────────────────────────
  { id: 'time-10h', name: 'Ten Hours In', description: 'Study for 10 hours in total.', group: 'Time', measure: ({ state }) => [Math.floor(studyMinutes(state) / 60), 10] },
  { id: 'time-50h', name: 'Fifty Hours', description: 'Study for 50 hours in total.', group: 'Time', reward: 3, measure: ({ state }) => [Math.floor(studyMinutes(state) / 60), 50] },
  { id: 'time-100h', name: 'Hundred Hours', description: 'Study for 100 hours in total.', group: 'Time', reward: 5, measure: ({ state }) => [Math.floor(studyMinutes(state) / 60), 100] },
  { id: 'deep-work', name: 'Deep Work', description: 'Complete a single study session of 90 minutes or more.', group: 'Time', reward: 2, measure: ({ state }) => [state.sessions.some((x) => x.durationMin >= 90) ? 1 : 0, 1] },

  // ── Quests & bosses ────────────────────────────────────────────────────
  {
    id: 'first-boss',
    name: 'First Boss Defeated',
    description: 'Score 80+ in any boss battle.',
    group: 'Quests & bosses',
    measure: ({ state }) => [state.bossAttempts.some((a) => a.score >= 80) ? 1 : 0, 1],
  },
  {
    id: 'boss-slayer',
    name: 'Boss Slayer',
    description: 'Defeat 3 different bosses (80+).',
    group: 'Quests & bosses',
    reward: 4,
    measure: ({ state }) => [new Set(state.bossAttempts.filter((a) => a.score >= 80).map((a) => a.bossId)).size, 3],
  },
  { id: 'quest-10', name: 'Quest Runner', description: 'Claim 10 daily quests.', group: 'Quests & bosses', measure: ({ state }) => [claimed(state, 'quest'), 10] },
  { id: 'quest-50', name: 'Questmaster', description: 'Claim 50 daily quests.', group: 'Quests & bosses', reward: 4, measure: ({ state }) => [claimed(state, 'quest'), 50] },
  { id: 'weekly-4', name: 'Weekly Hero', description: 'Claim 4 weekly challenges.', group: 'Quests & bosses', reward: 2, measure: ({ state }) => [claimed(state, 'weekly'), 4] },
];

export function evaluateAchievements(ctx: AchievementCtx): { id: string; current: number; target: number; earned: boolean }[] {
  return ACHIEVEMENTS.map((a) => {
    const [current, target] = a.measure(ctx);
    return { id: a.id, current: Math.min(current, target), target, earned: current >= target };
  });
}
