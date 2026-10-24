import type { ActivityEvent, AppState, DayKey, Domain } from '../domain/types';
import { addDays, diffDays, startOfWeek } from '../lib/date';
import { grantedFor } from './progression';
import { isLearned } from './revision';
import type { TopicStats } from './mastery';
import { MASTERED_TOPIC, UNLOCK_THRESHOLD } from './mastery';

/**
 * Quests are derived from logged activity — never from a checkbox. A quest
 * becomes claimable once the underlying work is recorded; claiming is one click.
 */

export type QuestAction =
  | { type: 'log'; domain: Domain }
  | { type: 'revise' }
  | { type: 'navigate'; to: string };

export interface Quest {
  id: string;
  /** XP ledger ref — unique per period. */
  ref: string;
  cadence: 'daily' | 'weekly' | 'mission';
  domain?: Domain;
  title: string;
  detail: string;
  progress: number;
  target: number;
  complete: boolean;
  claimed: boolean;
  reward: number;
  action?: QuestAction;
}

const PRACTICE_TYPES = new Set(['solve', 'learn', 'progress', 'attempt', 'session']);

function distinct(evs: ActivityEvent[], key: (e: ActivityEvent) => string | undefined): number {
  return new Set(evs.map((e) => key(e) ?? e.id)).size;
}

export function dailyQuests(state: AppState, today: DayKey): Quest[] {
  const t = state.settings.targets;
  const xp = state.settings.xp;
  const todays = state.activity.filter((a) => a.date === today);
  const mk = (q: Omit<Quest, 'ref' | 'claimed' | 'complete' | 'cadence' | 'reward'>): Quest => {
    const ref = `${q.id}:${today}`;
    return {
      ...q,
      ref,
      cadence: 'daily',
      reward: xp.dailyQuest,
      complete: q.progress >= q.target,
      claimed: grantedFor(state, 'quest', ref) > 0,
      progress: Math.min(q.progress, q.target),
    };
  };

  const quests: Quest[] = [];
  if (t.dsaPerDay > 0) {
    const solved = distinct(
      todays.filter((a) => a.domain === 'dsa' && a.type === 'solve'),
      (e) => e.itemId,
    );
    quests.push(
      mk({
        id: 'daily-dsa',
        domain: 'dsa',
        title: `Solve ${t.dsaPerDay} DSA problem${t.dsaPerDay > 1 ? 's' : ''}`,
        detail: 'Independent or with hints — log the outcome honestly.',
        progress: solved,
        target: t.dsaPerDay,
        action: { type: 'log', domain: 'dsa' },
      }),
    );
  }
  if (t.hldPerDay > 0) {
    const n = distinct(
      todays.filter((a) => a.domain === 'hld' && PRACTICE_TYPES.has(a.type)),
      (e) => e.itemId,
    );
    quests.push(
      mk({
        id: 'daily-hld',
        domain: 'hld',
        title: 'Advance one system design concept or exercise',
        detail: 'Learn a concept or move a design through its rubric.',
        progress: n,
        target: t.hldPerDay,
        action: { type: 'log', domain: 'hld' },
      }),
    );
  }
  if (t.lldPerDay > 0) {
    const n = distinct(
      todays.filter((a) => a.domain === 'lld' && PRACTICE_TYPES.has(a.type)),
      (e) => e.itemId,
    );
    quests.push(
      mk({
        id: 'daily-lld',
        domain: 'lld',
        title: 'Implement or study one LLD item',
        detail: 'A pattern, a principle, or a machine-coding step.',
        progress: n,
        target: t.lldPerDay,
        action: { type: 'log', domain: 'lld' },
      }),
    );
  }
  const reviewedToday = distinct(
    todays.filter((a) => a.type === 'review'),
    (e) => e.itemId,
  );
  const stillDue = state.items.filter(
    (it) => isLearned(it) && it.review.nextReviewAt && diffDays(it.review.nextReviewAt, today) >= 0,
  ).length;
  const revTarget = Math.min(t.reviewsPerDay, stillDue + reviewedToday);
  if (revTarget > 0) {
    quests.push(
      mk({
        id: 'daily-revise',
        title: `Clear ${revTarget} revision${revTarget > 1 ? 's' : ''}`,
        detail: 'Recall first, then check your notes.',
        progress: reviewedToday,
        target: revTarget,
        action: { type: 'revise' },
      }),
    );
  }
  return quests;
}

export function weeklyChallenges(state: AppState, today: DayKey): Quest[] {
  const ws = startOfWeek(today);
  const we = addDays(ws, 6);
  const inWeek = state.activity.filter((a) => diffDays(ws, a.date) >= 0 && diffDays(a.date, we) >= 0);
  const itemById = new Map(state.items.map((i) => [i.id, i]));
  const reward = state.settings.xp.weeklyChallenge;
  const mk = (q: Omit<Quest, 'ref' | 'claimed' | 'complete' | 'cadence' | 'reward'>): Quest => {
    const ref = `${q.id}:${ws}`;
    return {
      ...q,
      ref,
      cadence: 'weekly',
      reward,
      complete: q.progress >= q.target,
      claimed: grantedFor(state, 'weekly', ref) > 0,
      progress: Math.min(q.progress, q.target),
    };
  };
  return [
    mk({
      id: 'weekly-hard',
      domain: 'dsa',
      title: 'Solve 4 medium/hard problems independently',
      detail: 'No hints. Proves pattern recognition under pressure.',
      progress: distinct(
        inWeek.filter(
          (a) => a.type === 'solve' && a.domain === 'dsa' && a.status === 'independent' && a.difficulty !== 'easy',
        ),
        (e) => e.itemId,
      ),
      target: 4,
      action: { type: 'log', domain: 'dsa' },
    }),
    mk({
      id: 'weekly-design',
      title: 'Complete one design or machine-coding exercise',
      detail: 'HLD design or LLD implementation, rubric filled.',
      progress: distinct(
        inWeek.filter((a) => {
          const k = a.itemId ? itemById.get(a.itemId)?.kind : undefined;
          return a.type === 'solve' && (k === 'design' || k === 'machine-coding');
        }),
        (e) => e.itemId,
      ),
      target: 1,
      action: { type: 'navigate', to: 'hld' },
    }),
    mk({
      id: 'weekly-recall',
      title: 'Land 15 successful recalls',
      detail: 'Spaced repetition is where knowledge sticks.',
      progress: inWeek.filter((a) => a.type === 'review' && a.quality === 'success').length,
      target: 15,
      action: { type: 'revise' },
    }),
    mk({
      id: 'weekly-days',
      title: 'Study on 5 different days',
      detail: 'Consistency beats intensity. Rest days are fine.',
      progress: new Set(inWeek.map((a) => a.date)).size,
      target: 5,
    }),
  ];
}

/** Topic milestones: prove (unlock threshold) and master. */
export function missions(state: AppState, stats: Map<string, TopicStats>): Quest[] {
  const out: Quest[] = [];
  const base = state.settings.xp.mission;
  const dependents = (id: string) => state.topics.filter((t) => t.prerequisites.includes(id)).map((t) => t.name);
  for (const s of stats.values()) {
    const unlockRef = `prove:${s.topic.id}`;
    const masterRef = `master:${s.topic.id}`;
    const proveClaimed = grantedFor(state, 'mission', unlockRef) > 0;
    const masterClaimed = grantedFor(state, 'mission', masterRef) > 0;
    const deps = dependents(s.topic.id);
    if (!proveClaimed && (s.started > 0 || s.mastery >= UNLOCK_THRESHOLD)) {
      out.push({
        id: unlockRef,
        ref: unlockRef,
        cadence: 'mission',
        domain: s.topic.domain,
        title: `Prove ${s.topic.name}`,
        detail: deps.length ? `Reach ${UNLOCK_THRESHOLD}% mastery · unlocks ${deps.join(', ')}` : `Reach ${UNLOCK_THRESHOLD}% mastery`,
        progress: Math.min(s.mastery, UNLOCK_THRESHOLD),
        target: UNLOCK_THRESHOLD,
        complete: s.mastery >= UNLOCK_THRESHOLD,
        claimed: false,
        reward: base,
        action: { type: 'navigate', to: s.topic.domain },
      });
    } else if (proveClaimed && !masterClaimed) {
      out.push({
        id: masterRef,
        ref: masterRef,
        cadence: 'mission',
        domain: s.topic.domain,
        title: `Master ${s.topic.name}`,
        detail: `Reach ${MASTERED_TOPIC}% — requires spaced recall, not just solves`,
        progress: Math.min(s.mastery, MASTERED_TOPIC),
        target: MASTERED_TOPIC,
        complete: s.mastery >= MASTERED_TOPIC,
        claimed: false,
        reward: base * 2,
        action: { type: 'navigate', to: s.topic.domain },
      });
    }
  }
  return out.sort((a, b) => Number(b.complete) - Number(a.complete) || b.progress / b.target - a.progress / a.target);
}
