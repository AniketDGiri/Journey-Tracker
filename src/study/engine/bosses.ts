import type { AppState, Domain } from '../domain/types';
import type { TopicStats } from './mastery';

/**
 * Boss battles: structured, timed assessments. Score comes from a weighted
 * rubric the player completes honestly after the attempt. Rewards scale with
 * score; retries only pay out improvements over the best previous reward.
 */

export interface BossCriterion {
  key: string;
  label: string;
  weight: number;
}

export interface BossDef {
  id: string;
  domain: Domain;
  name: string;
  challenge: string;
  timeLimitMin: number;
  reward: number;
  requires: { topicId: string; mastery: number }[];
  criteria: BossCriterion[];
}

const dsaCriteria = (extra: BossCriterion[] = []): BossCriterion[] => [
  { key: 'correct', label: 'Correct solution that passes all edge cases', weight: 35 },
  { key: 'nohints', label: 'No hints, editorials or AI help', weight: 25 },
  { key: 'time', label: 'Finished within the time limit', weight: 15 },
  { key: 'complexity', label: 'Stated time & space complexity correctly', weight: 15 },
  ...extra,
  { key: 'clean', label: 'Readable code with clear naming', weight: 10 - extra.reduce((s, e) => s + e.weight, 0) },
];

export const BOSSES: BossDef[] = [
  {
    id: 'boss-dsa-gate',
    domain: 'dsa',
    name: 'The Gatekeeper',
    challenge: 'Pick an unseen medium array or hashing problem and solve it without hints.',
    timeLimitMin: 30,
    reward: 150,
    requires: [{ topicId: 'dsa-arrays', mastery: 40 }, { topicId: 'dsa-hashing', mastery: 40 }],
    criteria: dsaCriteria(),
  },
  {
    id: 'boss-dsa-warden',
    domain: 'dsa',
    name: 'Warden of Roots',
    challenge: 'Solve an unseen medium tree problem; explain recursion vs. iteration trade-offs.',
    timeLimitMin: 35,
    reward: 200,
    requires: [{ topicId: 'dsa-trees', mastery: 40 }],
    criteria: dsaCriteria(),
  },
  {
    id: 'boss-dsa-graph',
    domain: 'dsa',
    name: 'Sovereign of Paths',
    challenge: 'Solve an unseen medium/hard graph problem (BFS, DFS or topological sort).',
    timeLimitMin: 45,
    reward: 250,
    requires: [{ topicId: 'dsa-graphs', mastery: 40 }],
    criteria: dsaCriteria(),
  },
  {
    id: 'boss-dsa-dp',
    domain: 'dsa',
    name: 'The Recurrence Colossus',
    challenge: 'Solve an unseen DP problem: define state, transition, base case, then optimise space.',
    timeLimitMin: 45,
    reward: 300,
    requires: [{ topicId: 'dsa-dp', mastery: 40 }],
    criteria: dsaCriteria([{ key: 'state', label: 'Defined DP state & transition before coding', weight: 5 }]),
  },
  {
    id: 'boss-hld-url',
    domain: 'hld',
    name: "Architect's Trial",
    challenge: 'Design a URL shortener for 100M URLs/day from a blank page, out loud.',
    timeLimitMin: 45,
    reward: 200,
    requires: [{ topicId: 'hld-framework', mastery: 40 }, { topicId: 'hld-caching', mastery: 40 }],
    criteria: [
      { key: 'requirements', label: 'Clarified functional & non-functional requirements', weight: 15 },
      { key: 'estimation', label: 'Capacity estimate within an order of magnitude', weight: 10 },
      { key: 'api', label: 'Clean API & data model', weight: 15 },
      { key: 'architecture', label: 'Coherent high-level architecture', weight: 20 },
      { key: 'scale', label: 'Addressed scaling: caching, partitioning, ID generation', weight: 20 },
      { key: 'tradeoffs', label: 'Named at least two trade-offs and justified choices', weight: 15 },
      { key: 'time', label: 'Finished within the time limit', weight: 5 },
    ],
  },
  {
    id: 'boss-hld-hotel',
    domain: 'hld',
    name: 'The Reservation Keep',
    challenge: 'Design a scalable hotel reservation system that never double-books.',
    timeLimitMin: 60,
    reward: 300,
    requires: [{ topicId: 'hld-designs-1', mastery: 40 }, { topicId: 'hld-consistency', mastery: 30 }],
    criteria: [
      { key: 'requirements', label: 'Requirements & scale assumptions', weight: 10 },
      { key: 'data', label: 'Data model for rooms, inventory & bookings', weight: 20 },
      { key: 'concurrency', label: 'Prevented double booking (locking / constraints / idempotency)', weight: 25 },
      { key: 'architecture', label: 'Services, caching and payment flow', weight: 20 },
      { key: 'reliability', label: 'Failure handling & consistency model', weight: 15 },
      { key: 'time', label: 'Finished within the time limit', weight: 10 },
    ],
  },
  {
    id: 'boss-lld-parking',
    domain: 'lld',
    name: 'The Iron Lot',
    challenge: 'Machine-code a parking lot: multiple floors, vehicle types, pricing strategies.',
    timeLimitMin: 90,
    reward: 250,
    requires: [{ topicId: 'lld-oop', mastery: 40 }, { topicId: 'lld-solid', mastery: 40 }],
    criteria: [
      { key: 'model', label: 'Clear entities & relationships', weight: 20 },
      { key: 'patterns', label: 'Appropriate patterns (e.g. Strategy for pricing, Factory)', weight: 20 },
      { key: 'solid', label: 'SOLID respected; no god classes', weight: 15 },
      { key: 'works', label: 'Runs end-to-end for park / unpark / pay', weight: 25 },
      { key: 'tests', label: 'Tests or a demo driver', weight: 10 },
      { key: 'time', label: 'Finished within the time limit', weight: 10 },
    ],
  },
  {
    id: 'boss-lld-elevator',
    domain: 'lld',
    name: 'The Ascending Engine',
    challenge: 'Machine-code an elevator controller with a pluggable scheduling strategy.',
    timeLimitMin: 90,
    reward: 300,
    requires: [{ topicId: 'lld-behavioral', mastery: 40 }],
    criteria: [
      { key: 'model', label: 'Elevator, request and controller model', weight: 20 },
      { key: 'state', label: 'State pattern or explicit state machine', weight: 20 },
      { key: 'strategy', label: 'Swappable scheduling strategy', weight: 20 },
      { key: 'works', label: 'Handles concurrent requests correctly', weight: 20 },
      { key: 'tests', label: 'Tests or simulation driver', weight: 10 },
      { key: 'time', label: 'Finished within the time limit', weight: 10 },
    ],
  },
];

export function bossScore(boss: BossDef, checks: Record<string, boolean>): number {
  return boss.criteria.reduce((s, c) => s + (checks[c.key] ? c.weight : 0), 0);
}

export type BossOutcome = 'victory' | 'partial' | 'retreat';

export function bossOutcome(score: number): BossOutcome {
  if (score >= 80) return 'victory';
  if (score >= 50) return 'partial';
  return 'retreat';
}

/** Victory pays full reward × score; a partial clear pays half; a retreat pays nothing (but is recorded). */
export function bossReward(boss: BossDef, score: number): number {
  const o = bossOutcome(score);
  if (o === 'victory') return Math.round((boss.reward * score) / 100);
  if (o === 'partial') return Math.round((boss.reward * score) / 200);
  return 0;
}

export interface BossStatus {
  boss: BossDef;
  unlocked: boolean;
  progress: number;
  bestScore: number;
  defeated: boolean;
  attempts: number;
}

export function bossStatuses(state: AppState, stats: Map<string, TopicStats>): BossStatus[] {
  return BOSSES.map((boss) => {
    const parts = boss.requires.map((r) => Math.min(1, (stats.get(r.topicId)?.mastery ?? 0) / r.mastery));
    const progress = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 1;
    const attempts = state.bossAttempts.filter((a) => a.bossId === boss.id);
    const bestScore = attempts.reduce((m, a) => Math.max(m, a.score), 0);
    return {
      boss,
      unlocked: parts.every((p) => p >= 1),
      progress,
      bestScore,
      defeated: bestScore >= 80,
      attempts: attempts.length,
    };
  });
}
