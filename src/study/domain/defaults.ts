import type { AppState, Domain, Settings } from './types';
import { REAL_STARTER_DOMAINS, buildCatalog } from './catalog';

/**
 * 2: DSA and HLD starter items removed from real journeys; items may carry sub-items.
 * 3: daily study-time goal default moved from 3h to 2h.
 */
export const SCHEMA_VERSION = 3;

export const DEFAULT_SETTINGS: Settings = {
  playerName: '',
  gamification: true,
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
    mission: 40,
    achievement: 25,
  },
  targets: { dsaPerDay: 2, hldPerDay: 1, lldPerDay: 1, reviewsPerDay: 5, minutesPerDay: 120 },
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
    achievements: {},
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}
