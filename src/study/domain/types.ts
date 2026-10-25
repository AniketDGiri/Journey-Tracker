/** Core domain model. Pure data — no UI or persistence concerns. */

import type { FitnessState } from './fitness';
import type { NutritionState } from './nutrition';

export type Domain = 'dsa' | 'hld' | 'lld';
export const DOMAINS: Domain[] = ['dsa', 'hld', 'lld'];

/** Local calendar day, `YYYY-MM-DD`. All scheduling uses day keys, never timestamps. */
export type DayKey = string;
/** ISO-8601 timestamp. */
export type Iso = string;

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ItemKind = 'problem' | 'concept' | 'design' | 'machine-coding';

/**
 * Outcome ladder shared by every practice item. The UI relabels it per kind
 * (e.g. a concept's `independent` reads "Can explain").
 */
export type ItemStatus = 'not-started' | 'attempted' | 'unsolved' | 'with-hints' | 'independent';

export type RecallQuality = 'fail' | 'partial' | 'success';

export interface ReviewEntry {
  date: DayKey;
  quality: RecallQuality;
  /** Interval (days) scheduled as a result. */
  interval: number;
}

export interface ReviewState {
  /** Index into the configured interval ladder. -1 = not yet learned (no schedule). */
  stage: number;
  firstStudiedAt?: DayKey;
  lastStudiedAt?: DayKey;
  lastReviewedAt?: DayKey;
  nextReviewAt?: DayKey;
  successCount: number;
  lapseCount: number;
  history: ReviewEntry[];
}

export interface Topic {
  id: string;
  domain: Domain;
  name: string;
  /** Row in the skill tree, 0 = foundations. */
  tier: number;
  prerequisites: string[];
  /** Items needed for the topic to count as fully covered. */
  target: number;
  description?: string;
  custom?: boolean;
}

/** A checklist step inside an item. Ticking all of them completes the item. */
export interface SubItem {
  id: string;
  title: string;
  done: boolean;
  /** Day it was ticked; absent on steps ticked before the planner existed. */
  doneAt?: DayKey;
}

export type GoalPeriod = 'day' | 'week' | 'month';

/**
 * A planned commitment: "do this item / sub-item on this date, this week or this month".
 * Completion is derived from real activity, never stored, so it can't drift.
 */
export interface Goal {
  id: string;
  itemId: string;
  subItemId?: string;
  period: GoalPeriod;
  /** Day for `day`, Monday for `week`, the 1st for `month`. */
  start: DayKey;
  createdAt: Iso;
  /** Day the goal was created — work done from this day counts. */
  createdOn: DayKey;
}

export interface PracticeItem {
  id: string;
  domain: Domain;
  topicId: string;
  kind: ItemKind;
  title: string;
  difficulty?: Difficulty;
  url?: string;
  status: ItemStatus;
  /** 0 = unrated, 1–5 self-assessed confidence. */
  confidence: number;
  /** Best recorded solve time in minutes (problems). */
  solveTimeMin?: number;
  /** Total time logged against this item. */
  timeSpentMin: number;
  hintsUsed: boolean;
  notes: string;
  tags: string[];
  /** Rubric checklist for design / machine-coding items. */
  rubric: Record<string, boolean>;
  /** Optional checklist; absent on items created before sub-items existed. */
  subItems?: SubItem[];
  review: ReviewState;
  createdAt: Iso;
  updatedAt: Iso;
  custom?: boolean;
}

export type ActivityType =
  | 'solve'
  | 'attempt'
  | 'learn'
  | 'progress'
  | 'review'
  | 'session'
  | 'boss';

export interface ActivityEvent {
  id: string;
  date: DayKey;
  at: Iso;
  type: ActivityType;
  domain: Domain;
  itemId?: string;
  topicId?: string;
  status?: ItemStatus;
  difficulty?: Difficulty;
  quality?: RecallQuality;
  minutes?: number;
  label: string;
}

export type XpSourceType =
  | 'outcome'
  | 'review'
  | 'session'
  | 'quest'
  | 'weekly'
  | 'mission'
  | 'boss'
  | 'achievement';

export interface XpEvent {
  id: string;
  /** What the XP is for. `(type, ref)` + top-up logic prevents duplicate rewards. */
  type: XpSourceType;
  ref: string;
  amount: number;
  reason: string;
  domain?: Domain;
  date: DayKey;
  at: Iso;
}

export type SessionOutcome = 'learned' | 'practiced' | 'solved' | 'revised';

export interface StudySession {
  id: string;
  domain: Domain;
  topicId?: string;
  itemId?: string;
  startedAt: Iso;
  endedAt: Iso;
  date: DayKey;
  durationMin: number;
  outcome: SessionOutcome;
  confidence: number;
  hintsUsed: boolean;
  notes: string;
}

export interface ActiveSession {
  domain: Domain;
  topicId?: string;
  itemId?: string;
  startedAt: Iso;
  /** Accumulated ms while paused/resumed. */
  elapsedMs: number;
  /** When the current running segment started, undefined while paused. */
  runningSince?: Iso;
}

export interface BossAttempt {
  id: string;
  bossId: string;
  date: DayKey;
  at: Iso;
  score: number;
  checks: Record<string, boolean>;
  minutes?: number;
  notes: string;
}

export interface XpRules {
  solveEasy: number;
  solveMedium: number;
  solveHard: number;
  /** Fraction of the solve reward granted when hints were needed (0–1). */
  hintMultiplier: number;
  conceptLearned: number;
  designComplete: number;
  lldImplemented: number;
  reviewSuccess: number;
  reviewPartial: number;
  reviewFail: number;
  sessionComplete: number;
  dailyQuest: number;
  weeklyChallenge: number;
  mission: number;
  achievement: number;
}

export interface Settings {
  playerName: string;
  gamification: boolean;
  reducedMotion: 'system' | 'on' | 'off';
  /** Spaced-repetition ladder in days. */
  intervals: number[];
  xp: XpRules;
  targets: {
    dsaPerDay: number;
    hldPerDay: number;
    lldPerDay: number;
    reviewsPerDay: number;
    /** Daily study-time goal, in minutes. */
    minutesPerDay: number;
  };
  /** 0 = Sunday … 6 = Saturday. Planned rest days never break a streak. */
  restDays: number[];
  /** Minimum minutes for a session to earn XP. */
  minSessionMinutes: number;
  /** The day the preparation journey should be finished by. */
  targetDate: DayKey;
}

export interface AppState {
  schemaVersion: number;
  /** Sample data is never mixed with real progress. */
  mode: 'sample' | 'real';
  onboarded: boolean;
  createdAt: Iso;
  topics: Topic[];
  items: PracticeItem[];
  activity: ActivityEvent[];
  xp: XpEvent[];
  sessions: StudySession[];
  activeSession?: ActiveSession;
  bossAttempts: BossAttempt[];
  /** Planner commitments (see engine/plan). */
  goals: Goal[];
  /** Training phases — independent of prep XP and streaks. */
  fitness: FitnessState;
  nutrition: NutritionState;
  /** Achievement id → day first earned. */
  achievements: Record<string, DayKey>;
  /**
   * Daily quests the player chose for a given day (quest ids). A day with no
   * entry shows every quest; an entry — even an empty one — shows only those.
   */
  questPlan?: Record<DayKey, string[]>;
  settings: Settings;
}
