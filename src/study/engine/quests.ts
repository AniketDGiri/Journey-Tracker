import type { ActivityEvent, AppState, DayKey, Domain } from '../domain/types';
import { addDays, diffDays, endOfMonth, startOfMonth, startOfWeek } from '../lib/date';
import { grantedFor } from './progression';
import { evaluateGoals } from './plan';
import { JAVA_TRACK } from '../domain/catalog';
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
  cadence: 'daily' | 'weekly' | 'monthly' | 'mission';
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

/** The quests the player picked for `day`; every quest when nothing was picked. */
export function dailyQuests(state: AppState, day: DayKey): Quest[] {
  const all = availableDailyQuests(state, day);
  const plan = state.questPlan?.[day];
  return plan ? all.filter((q) => plan.includes(q.id)) : all;
}

/** Every daily quest that could be set for `day`, chosen or not. */
export function availableDailyQuests(state: AppState, today: DayKey): Quest[] {
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
  const javaTopics = new Set(state.topics.filter((x) => x.track === JAVA_TRACK).map((x) => x.id));
  if ((t.javaPerDay ?? 0) > 0 && javaTopics.size) {
    const n = distinct(
      todays.filter((a) => a.topicId && javaTopics.has(a.topicId) && PRACTICE_TYPES.has(a.type)),
      (e) => e.itemId,
    );
    quests.push(
      mk({
        id: 'daily-java',
        domain: 'dsa',
        title: `Study ${t.javaPerDay} Java concept${t.javaPerDay > 1 ? 's' : ''}`,
        detail: 'Learn it, write a small program with it, log the outcome.',
        progress: n,
        target: t.javaPerDay,
        action: { type: 'navigate', to: 'dsa' },
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

/** Month-long challenges, sized from the daily targets so they stretch without being out of reach. */
export function monthlyChallenges(state: AppState, today: DayKey): Quest[] {
  const ms = startOfMonth(today);
  const me = endOfMonth(today);
  const inMonth = state.activity.filter((a) => a.date >= ms && a.date <= me);
  const itemById = new Map(state.items.map((i) => [i.id, i]));
  const t = state.settings.targets;
  const reward = state.settings.xp.monthlyChallenge;
  const mk = (q: Omit<Quest, 'ref' | 'claimed' | 'complete' | 'cadence' | 'reward'>): Quest => {
    const ref = `${q.id}:${ms}`;
    return {
      ...q,
      ref,
      cadence: 'monthly',
      reward,
      complete: q.progress >= q.target,
      claimed: grantedFor(state, 'monthly', ref) > 0,
      progress: Math.min(q.progress, q.target),
    };
  };
  const dsaTarget = Math.max(10, t.dsaPerDay * 10);
  const hoursTarget = Math.max(10, Math.round((t.minutesPerDay * 20) / 60));
  const minutes = state.sessions.filter((s) => s.date >= ms && s.date <= me).reduce((n, s) => n + s.durationMin, 0);
  const goalsDone = evaluateGoals(state, today).filter((g) => g.status === 'done' && g.completedOn && g.completedOn >= ms && g.completedOn <= me).length;
  return [
    mk({
      id: 'monthly-dsa',
      domain: 'dsa',
      title: `Solve ${dsaTarget} DSA problems`,
      detail: 'Distinct problems, independent or with hints.',
      progress: distinct(inMonth.filter((a) => a.domain === 'dsa' && a.type === 'solve'), (e) => e.itemId),
      target: dsaTarget,
      action: { type: 'log', domain: 'dsa' },
    }),
    mk({
      id: 'monthly-design',
      title: 'Complete 3 design or machine-coding exercises',
      detail: 'Rubric-backed HLD designs or LLD builds.',
      progress: distinct(
        inMonth.filter((a) => {
          const k = a.itemId ? itemById.get(a.itemId)?.kind : undefined;
          return a.type === 'solve' && (k === 'design' || k === 'machine-coding');
        }),
        (e) => e.itemId,
      ),
      target: 3,
      action: { type: 'navigate', to: 'hld' },
    }),
    mk({
      id: 'monthly-recall',
      title: 'Land 40 successful recalls',
      detail: 'A month of spaced repetition.',
      progress: inMonth.filter((a) => a.type === 'review' && a.quality === 'success').length,
      target: 40,
      action: { type: 'revise' },
    }),
    mk({
      id: 'monthly-days',
      title: 'Study on 20 different days',
      detail: 'Rest days are fine. Most days is the goal.',
      progress: new Set(inMonth.map((a) => a.date)).size,
      target: 20,
    }),
    mk({
      id: 'monthly-hours',
      title: `Log ${hoursTarget} hours of focused study`,
      detail: 'Timed or manually logged study sessions.',
      progress: Math.floor(minutes / 60),
      target: hoursTarget,
      action: { type: 'navigate', to: 'sessions' },
    }),
    mk({
      id: 'monthly-plan',
      title: 'Achieve 10 planned goals',
      detail: 'Plan items for a day, week or month — then do them.',
      progress: goalsDone,
      target: 10,
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
