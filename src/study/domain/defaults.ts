import type { AppState, Domain, Settings } from './types';
import { REAL_STARTER_DOMAINS, buildCatalog } from './catalog';
import { emptyNutrition } from './nutrition';
import { toDayKey } from '../lib/date';

/**
 * 2: DSA and HLD starter items removed from real journeys; items may carry sub-items.
 * 3: daily study-time goal default moved from 3h to 2h.
 * 4: planner goals, training phases (fitness) and nutrition tracking.
 * 5: the Java track (topics + syllabus) added to DSA.
 */
export const SCHEMA_VERSION = 5;

export const emptyFitness = (): AppState['fitness'] => ({ activePhaseId: 'phase-0', starts: {}, logs: [] });

export const DEFAULT_SETTINGS: Settings = {
  playerName: '',
  gamification: true,
  penalties: true,
  penaltiesSince: '',
  reducedMotion: 'system',
  intervals: [1, 3, 7, 14, 30, 60],
  xp: {
    solveEasy: 10,
    solveMedium: 25,
    solveHard: 50,
    hintMultiplier: 0.5,
    conceptLearned: 15,
    designComplete: 80,
    lldImplemented: 70,
    reviewSuccess: 8,
    reviewPartial: 4,
    reviewFail: 2,
    sessionComplete: 10,
    dailyQuest: 15,
    weeklyChallenge: 100,
    monthlyChallenge: 250,
    mission: 40,
    achievement: 25,
  },
  targets: { dsaPerDay: 2, javaPerDay: 1, hldPerDay: 1, lldPerDay: 1, reviewsPerDay: 5, minutesPerDay: 120 },
  restDays: [],
  minSessionMinutes: 15,
  targetDate: '2027-03-31',
};

export function createEmptyState(now: Date = new Date(), starterDomains: Domain[] = REAL_STARTER_DOMAINS): AppState {
  const iso = now.toISOString();
  const { topics, items } = buildCatalog(iso, starterDomains);
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'real',
    onboarded: false,
    createdAt: iso,
    topics,
    items,
    activity: [],
    xp: [],
    sessions: [],
    bossAttempts: [],
    goals: [],
    fitness: emptyFitness(),
    nutrition: emptyNutrition(),
    achievements: {},
    settings: { ...structuredClone(DEFAULT_SETTINGS), penaltiesSince: toDayKey(now) },
  };
}
