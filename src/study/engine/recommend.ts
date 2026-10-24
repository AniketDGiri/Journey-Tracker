import type { AppState, DayKey, Domain, PracticeItem } from '../domain/types';
import { DOMAIN_META } from '../domain/catalog';
import type { TopicStats } from './mastery';
import { domainMastery } from './mastery';
import { revisionQueues } from './revision';
import { dailyQuests } from './quests';
import { bossStatuses } from './bosses';

export type RecAction =
  | { type: 'revise' }
  | { type: 'finish-session' }
  | { type: 'log'; domain: Domain; itemId?: string }
  | { type: 'boss'; bossId: string }
  | { type: 'navigate'; to: string };

export interface Recommendation {
  title: string;
  detail: string;
  cta: string;
  reason: string;
  domain?: Domain;
  action: RecAction;
}

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

/** The best next item in a domain: retry weak attempts first, then the next unstarted item in the weakest open topic. */
export function nextItemFor(_state: AppState, stats: Map<string, TopicStats>, domain: Domain): PracticeItem | undefined {
  const open = [...stats.values()]
    .filter((s) => s.topic.domain === domain && s.state !== 'locked' && s.state !== 'mastered')
    .sort((a, b) => a.topic.tier - b.topic.tier || b.started - a.started || a.mastery - b.mastery);
  for (const s of open) {
    const retry = s.items.find((i) => i.status === 'attempted' || i.status === 'unsolved');
    if (retry) return retry;
    const fresh = s.items
      .filter((i) => i.status === 'not-started')
      .sort((a, b) => DIFF_ORDER[a.difficulty ?? 'medium'] - DIFF_ORDER[b.difficulty ?? 'medium']);
    if (fresh[0]) return fresh[0];
  }
  return undefined;
}

export function recommend(state: AppState, stats: Map<string, TopicStats>, today: DayKey): Recommendation {
  if (state.activeSession) {
    return {
      title: 'Wrap up your study session',
      detail: 'Record what you achieved while it is fresh.',
      cta: 'Finish session',
      reason: 'A session is running.',
      domain: state.activeSession.domain,
      action: { type: 'finish-session' },
    };
  }
  const q = revisionQueues(state.items, today);
  if (q.overdue.length) {
    return {
      title: `Clear ${q.overdue.length} overdue revision${q.overdue.length > 1 ? 's' : ''}`,
      detail: 'Overdue items fade fastest. A quick recall now restores them.',
      cta: 'Start revision',
      reason: 'Overdue revisions come first — they protect what you already learned.',
      action: { type: 'revise' },
    };
  }
  if (q.today.length) {
    return {
      title: `Revise ${q.today.length} item${q.today.length > 1 ? 's' : ''} due today`,
      detail: 'Recall before you peek at your notes.',
      cta: 'Start revision',
      reason: 'Due revisions are scheduled at the point you are about to forget.',
      action: { type: 'revise' },
    };
  }
  const quests = dailyQuests(state, today).filter((x) => x.domain && !x.complete);
  const domains = quests.map((x) => x.domain!) as Domain[];
  if (domains.length) {
    const d = domains.sort((a, b) => domainMastery(stats, a) - domainMastery(stats, b))[0];
    const item = nextItemFor(state, stats, d);
    const topic = item ? stats.get(item.topicId)?.topic : undefined;
    return {
      title: item ? item.title : `Add a ${DOMAIN_META[d].short} item to practise`,
      detail: item
        ? `${DOMAIN_META[d].short} · ${topic?.name ?? ''}${item.difficulty ? ` · ${item.difficulty}` : ''}${item.status === 'unsolved' || item.status === 'attempted' ? ' · retry' : ''}`
        : 'Every open topic is covered — add a new problem or concept.',
      cta: item ? 'Log result' : 'Quick add',
      reason: `${DOMAIN_META[d].label} is your lowest-mastery domain with an open daily quest.`,
      domain: d,
      action: { type: 'log', domain: d, itemId: item?.id },
    };
  }
  const boss = bossStatuses(state, stats).find((b) => b.unlocked && !b.defeated);
  if (boss) {
    return {
      title: `Challenge ${boss.boss.name}`,
      detail: boss.boss.challenge,
      cta: 'Enter boss battle',
      reason: 'Daily quests are done and a boss is unlocked — test real mastery.',
      domain: boss.boss.domain,
      action: { type: 'boss', bossId: boss.boss.id },
    };
  }
  if (q.weak.length) {
    const w = q.weak[0];
    return {
      title: `Strengthen: ${w.title}`,
      detail: 'Optional — your daily quests are complete.',
      cta: 'Log result',
      reason: 'This is your weakest item right now.',
      domain: w.domain,
      action: { type: 'log', domain: w.domain, itemId: w.id },
    };
  }
  return {
    title: 'Daily quests complete',
    detail: 'Rest is part of training. Come back tomorrow sharper.',
    cta: 'View progress',
    reason: 'Nothing urgent remains today.',
    action: { type: 'navigate', to: 'analytics' },
  };
}
