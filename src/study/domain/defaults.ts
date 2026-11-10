import type { AppState, Domain, QuestDays, Settings } from './types';
import { REAL_STARTER_DOMAINS, buildCatalog } from './catalog';
import { mergeAlgoCamp } from './algocamp';
import { applyDsaPatterns } from './dsaPatterns';
import { emptyNutrition } from './nutrition';
import { toDayKey } from '../lib/date';

/**
 * 2: DSA and HLD starter items removed from real journeys; items may carry sub-items.
 * 3: daily study-time goal default moved from 3h to 2h.
 * 4: planner goals, training phases (fitness) and nutrition tracking.
 * 5: the Java track (topics + syllabus) added to DSA.
 * 6: revisions are planned by hand by default; automatic dates are cleared once.
 * 7: the AlgoCamp system design course (HLD + LLD) added as cards with lecture steps.
 * 8: the DSA tree is organised by pattern (from the DSA patterns sheet), with its problems as cards.
 */
export const SCHEMA_VERSION = 8;

export const emptyFitness = (): AppState['fitness'] => ({ activePhaseId: 'phase-0', starts: {}, logs: [] });

/** Weekdays for system design, weekends for DSA and Java (revisions are planned for weekends too). */
export const DEFAULT_QUEST_DAYS: QuestDays = {
  hld: [1, 2, 3, 4, 5],
  lld: [1, 2, 3, 4, 5],
  dsa: [0, 6],
  java: [0, 6],
};

export const DEFAULT_SETTINGS: Settings = {
  playerName: '',
  gamification: true,
  penalties: true,
  penaltiesSince: '',
  reducedMotion: 'system',
  intervals: [1, 3, 7, 14, 30, 60],
  revisionMode: 'planned',
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
  questDays: DEFAULT_QUEST_DAYS,
  minSessionMinutes: 15,
  targetDate: '2027-03-31',
};

export function createEmptyState(now: Date = new Date(), starterDomains: Domain[] = REAL_STARTER_DOMAINS): AppState {
  const iso = now.toISOString();
  const catalog = buildCatalog(iso, starterDomains);
  // A real journey comes with the AlgoCamp course and DSA by pattern; sample data stays as it was.
  const real = starterDomains === REAL_STARTER_DOMAINS;
  const course = real ? mergeAlgoCamp(catalog.topics, catalog.items, iso) : catalog;
  const { topics, items } = real ? applyDsaPatterns(course.topics, course.items, iso) : course;
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
    backlogSince: toDayKey(now),
    settings: { ...structuredClone(DEFAULT_SETTINGS), penaltiesSince: toDayKey(now) },
  };
}
