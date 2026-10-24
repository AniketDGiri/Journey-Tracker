import type { AppState, DayKey, Domain, ItemStatus, PracticeItem, Topic } from '../domain/types';
import { diffDays } from '../lib/date';
import { isLearned } from './revision';
import { RUBRICS } from '../domain/catalog';

/**
 * Mastery is evidence-based: outcome of the attempt, successful spaced recalls,
 * rubric coverage for design work, and self-rated confidence.
 * Every number here is shown in the UI's "How is this calculated?" panels.
 */

const STATUS_BASE: Record<ItemStatus, number> = {
  'not-started': 0,
  attempted: 12,
  unsolved: 8,
  'with-hints': 35,
  independent: 55,
};

export const MASTERY_EXPLAINER = [
  'Outcome: solved independently 55 · with hints 35 · attempted 12 · unsolved 8',
  'Successful spaced recalls: +8 each, up to +32',
  'Confidence (1–5): up to +8',
  'Design/LLD rubric: outcome is scaled by rubric coverage',
  'Overdue revision: −10 until reviewed',
  'Mastered item ≥ 85 · Topic mastery = sum of item mastery ÷ max(items, topic target)',
];

export function rubricRatio(item: PracticeItem): number {
  if (item.kind !== 'design' && item.kind !== 'machine-coding') return 1;
  const keys = RUBRICS[item.kind].map((r) => r.key);
  return keys.filter((k) => item.rubric[k]).length / keys.length;
}

export function itemMastery(item: PracticeItem, today: DayKey): number {
  let base = STATUS_BASE[item.status];
  if (item.kind === 'design' || item.kind === 'machine-coding') {
    // Design work needs rubric evidence: at least 40% of the outcome comes from coverage.
    base = base * (0.4 + 0.6 * rubricRatio(item));
  }
  let score = base;
  if (isLearned(item)) {
    score += Math.min(item.review.successCount, 4) * 8;
    score += (Math.min(item.confidence, 5) / 5) * 8;
    const next = item.review.nextReviewAt;
    if (next && diffDays(next, today) > 0) score -= 10;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export const MASTERED_ITEM = 85;
export const MASTERED_TOPIC = 80;
export const UNLOCK_THRESHOLD = 40;

export type TopicState = 'locked' | 'available' | 'in-progress' | 'mastered' | 'revision-due';

export interface TopicStats {
  topic: Topic;
  mastery: number;
  items: PracticeItem[];
  solved: number;
  started: number;
  due: number;
  state: TopicState;
  /** Prerequisites still below the unlock threshold. */
  blockers: Topic[];
}

export function topicMastery(topic: Topic, items: PracticeItem[], today: DayKey): number {
  if (!items.length) return 0;
  const sum = items.reduce((s, it) => s + itemMastery(it, today), 0);
  return Math.round(sum / Math.max(items.length, topic.target));
}

export function computeTopicStats(state: AppState, today: DayKey): Map<string, TopicStats> {
  const byTopic = new Map<string, PracticeItem[]>();
  for (const it of state.items) {
    const arr = byTopic.get(it.topicId) ?? [];
    arr.push(it);
    byTopic.set(it.topicId, arr);
  }
  const mastery = new Map<string, number>();
  for (const t of state.topics) mastery.set(t.id, topicMastery(t, byTopic.get(t.id) ?? [], today));
  const topicById = new Map(state.topics.map((t) => [t.id, t]));

  const out = new Map<string, TopicStats>();
  for (const t of state.topics) {
    const items = byTopic.get(t.id) ?? [];
    const m = mastery.get(t.id) ?? 0;
    const blockers = t.prerequisites
      .map((p) => topicById.get(p))
      .filter((p): p is Topic => !!p && (mastery.get(p.id) ?? 0) < UNLOCK_THRESHOLD);
    const due = items.filter(
      (it) => isLearned(it) && it.review.nextReviewAt && diffDays(it.review.nextReviewAt, today) >= 0,
    ).length;
    const solved = items.filter(isLearned).length;
    const started = items.filter((it) => it.status !== 'not-started').length;
    let st: TopicState;
    if (due > 0) st = 'revision-due';
    else if (m >= MASTERED_TOPIC) st = 'mastered';
    else if (started > 0) st = 'in-progress';
    else if (blockers.length) st = 'locked';
    else st = 'available';
    out.set(t.id, { topic: t, mastery: m, items, solved, started, due, state: st, blockers });
  }
  return out;
}

export function domainMastery(stats: Map<string, TopicStats>, domain: Domain): number {
  const list = [...stats.values()].filter((s) => s.topic.domain === domain);
  if (!list.length) return 0;
  return Math.round(list.reduce((s, x) => s + x.mastery, 0) / list.length);
}

export function overallMastery(stats: Map<string, TopicStats>): number {
  return Math.round((domainMastery(stats, 'dsa') + domainMastery(stats, 'hld') + domainMastery(stats, 'lld')) / 3);
}
