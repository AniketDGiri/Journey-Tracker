import type { AppState, DayKey } from '../domain/types';
import { PATTERN_TOPICS } from '../domain/catalog';
import { isLearned } from './revision';
import type { StreakInfo } from './streak';
import { MASTERED_ITEM, itemMastery } from './mastery';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** Returns [current, target]. */
  measure: (ctx: AchievementCtx) => [number, number];
}

export interface AchievementCtx {
  state: AppState;
  today: DayKey;
  streak: StreakInfo;
}

const solvedIn = (s: AppState, topicId?: string) =>
  s.items.filter((i) => i.domain === 'dsa' && isLearned(i) && (!topicId || i.topicId === topicId)).length;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-10', name: 'First 10 Problems', description: 'Solve 10 DSA problems.', measure: ({ state }) => [solvedIn(state), 10] },
  { id: 'centurion', name: 'Centurion', description: 'Solve 100 DSA problems.', measure: ({ state }) => [solvedIn(state), 100] },
  {
    id: 'hard-mode',
    name: 'Hard Mode',
    description: 'Solve a hard problem independently.',
    measure: ({ state }) => [
      state.items.filter((i) => i.difficulty === 'hard' && i.kind === 'problem' && i.status === 'independent').length,
      1,
    ],
  },
  { id: 'graph-explorer', name: 'Graph Explorer', description: 'Solve 5 graph problems.', measure: ({ state }) => [solvedIn(state, 'dsa-graphs') + solvedIn(state, 'dsa-advanced-graphs'), 5] },
  { id: 'dp-challenger', name: 'DP Challenger', description: 'Solve 5 dynamic programming problems.', measure: ({ state }) => [solvedIn(state, 'dsa-dp'), 5] },
  {
    id: 'revision-warrior',
    name: 'Revision Warrior',
    description: 'Land 50 successful recalls.',
    measure: ({ state }) => [state.activity.filter((a) => a.type === 'review' && a.quality === 'success').length, 50],
  },
  {
    id: 'system-architect',
    name: 'System Architect',
    description: 'Complete 3 system design exercises.',
    measure: ({ state }) => [state.items.filter((i) => i.kind === 'design' && isLearned(i)).length, 3],
  },
  {
    id: 'pattern-master',
    name: 'Design Pattern Master',
    description: 'Master 8 design patterns (≥85 item mastery).',
    measure: ({ state, today }) => [
      state.items.filter(
        (i) => PATTERN_TOPICS.some((p) => i.topicId === `lld-${p}`) && itemMastery(i, today) >= MASTERED_ITEM,
      ).length,
      8,
    ],
  },
  {
    id: 'machinist',
    name: 'Machinist',
    description: 'Build 2 machine-coding exercises.',
    measure: ({ state }) => [state.items.filter((i) => i.kind === 'machine-coding' && isLearned(i)).length, 2],
  },
  { id: 'consistency-7', name: '7-Day Consistency', description: 'Reach a 7-day streak.', measure: ({ streak }) => [streak.longest, 7] },
  { id: 'consistency-30', name: '30-Day Consistency', description: 'Reach a 30-day streak.', measure: ({ streak }) => [streak.longest, 30] },
  {
    id: 'first-boss',
    name: 'First Boss Defeated',
    description: 'Score 80+ in any boss battle.',
    measure: ({ state }) => [state.bossAttempts.some((a) => a.score >= 80) ? 1 : 0, 1],
  },
];

export function evaluateAchievements(ctx: AchievementCtx): { id: string; current: number; target: number; earned: boolean }[] {
  return ACHIEVEMENTS.map((a) => {
    const [current, target] = a.measure(ctx);
    return { id: a.id, current: Math.min(current, target), target, earned: current >= target };
  });
}
