import type { ActivityEvent, Goal, PracticeItem, Topic } from './types';
import { makeItem } from './catalog';
import { RB_PROBLEMS, RB_TOPICS, type RbProblem } from './risingBrainData';

/**
 * DSA becomes the RisingBrain pattern-wise sheet. What it keeps and what goes:
 *
 * - A card for every problem in the sheet, under its pattern.
 * - A card you already have for one of those problems (same LeetCode/GFG link or same title)
 *   becomes that problem's card, keeping its id, status, notes, steps, revisions and history.
 * - A card that isn't in the sheet stays only if you completed it or did any work on it
 *   (attempted, notes, time, ticked steps, revisions, anything in the activity log). Those move
 *   to "Solved earlier", so nothing you did is lost. Untouched cards that aren't in the sheet go,
 *   and so do plan entries pointing at them.
 * - The Java track is never touched.
 *
 * Re-running it changes nothing: ids are fixed, and matched cards keep theirs.
 */

export const EARLIER_TOPIC = 'dsa-earlier';

const problemKey = (url?: string) => url?.match(/(?:leetcode\.com|geeksforgeeks\.org)\/problems\/([^/?#]+)/)?.[1]?.toLowerCase();
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/^episode[\s-]*\d+\s*:?\s*/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function linksOf(p: RbProblem): PracticeItem['links'] {
  const out: NonNullable<PracticeItem['links']> = [];
  if (p.leetcode && p.gfg) out.push({ label: 'GFG', url: p.gfg });
  if (p.video) out.push({ label: 'Video', url: p.video });
  return out.length ? out : undefined;
}

/** Did the player do anything with this card? Then it is never removed. */
function worked(i: PracticeItem, touched: Set<string>): boolean {
  return (
    i.status !== 'not-started' ||
    touched.has(i.id) ||
    i.timeSpentMin > 0 ||
    // Notes you wrote — not the "Also: <links>" the previous sheet filled in by itself.
    !!i.notes?.trim().replace(/^Also:(\s+https?:\/\/\S+)+$/, '') ||
    i.confidence > 0 ||
    (i.subItems ?? []).some((s) => s.done) ||
    i.review.history.length > 0
  );
}

export function applyRisingBrain(
  topics: Topic[],
  items: PracticeItem[],
  goals: Goal[],
  activity: ActivityEvent[],
  now: string,
): { topics: Topic[]; items: PracticeItem[]; goals: Goal[]; removed: number } {
  const javaTopics = new Set(topics.filter((t) => t.track).map((t) => t.id));
  const isMine = (i: PracticeItem) => i.domain === 'dsa' && !javaTopics.has(i.topicId);
  const touched = new Set(activity.map((a) => a.itemId).filter((x): x is string => !!x));
  const pool = items.filter(isMine);
  const claimed = new Set<string>();

  // Each sheet problem: your matching card (by link, then title), else a new one.
  const fromSheet: PracticeItem[] = RB_PROBLEMS.map((p) => {
    const keys = [problemKey(p.leetcode), problemKey(p.gfg)].filter(Boolean);
    const free = pool.filter((i) => !claimed.has(i.id));
    const mine =
      free.find((i) => i.id === p.id) ??
      free.find((i) => keys.includes(problemKey(i.url)) || (i.links ?? []).some((l) => keys.includes(problemKey(l.url)))) ??
      free.find((i) => norm(i.title) === norm(p.title));
    const sheet = {
      topicId: p.topic,
      title: p.title,
      difficulty: p.difficulty,
      url: p.leetcode ?? p.gfg,
      links: linksOf(p),
    };
    if (mine) {
      claimed.add(mine.id);
      // Your progress stays; only where it sits and its links follow the sheet. Its timestamps are
      // left alone, so this never looks like fresh work to another copy of the app.
      return { ...mine, ...sheet, kind: 'problem', tags: mine.tags.filter((t) => t !== 'dsa-sheet') };
    }
    return makeItem({ id: p.id, domain: 'dsa', kind: 'problem', custom: true, ...sheet }, now);
  });

  // Cards not in the sheet: kept (in "Solved earlier") only if you worked on them.
  const leftovers = pool.filter((i) => !claimed.has(i.id));
  const kept = leftovers.filter((i) => worked(i, touched)).map((i) => ({ ...i, topicId: EARLIER_TOPIC, tags: i.tags.filter((t) => t !== 'dsa-sheet') }));
  const gone = new Set(leftovers.filter((i) => !worked(i, touched)).map((i) => i.id));

  // Items in their original order: everything else as it was, then the sheet's, then the kept ones.
  const nextItems = [...items.filter((i) => !isMine(i)), ...fromSheet, ...kept];

  // Topics: the sheet's patterns where the DSA topics were; the Java track and other domains as they were.
  const count = (id: string) => fromSheet.filter((i) => i.topicId === id).length;
  const rbTopics: Topic[] = RB_TOPICS.map((t) => {
    const old = topics.find((x) => x.id === t.id);
    return { ...(old ?? { custom: true }), id: t.id, domain: 'dsa', name: t.name, tier: t.tier, prerequisites: t.prerequisites, target: count(t.id), description: t.description } as Topic;
  });
  if (kept.length) {
    rbTopics.push({
      id: EARLIER_TOPIC,
      domain: 'dsa',
      name: 'Solved earlier',
      tier: 0,
      prerequisites: [],
      target: kept.length,
      description: 'Problems you completed or worked on before the RisingBrain sheet. Kept with all their progress.',
      custom: true,
    } as Topic);
  }
  const isOldDsa = (t: Topic) => t.domain === 'dsa' && !t.track;
  const first = topics.findIndex(isOldDsa);
  const at = first === -1 ? topics.length : first;
  const rest = topics.filter((t) => !isOldDsa(t));
  const before = rest.filter((t) => topics.indexOf(t) < at);
  const after = rest.filter((t) => topics.indexOf(t) >= at);

  return {
    topics: [...before, ...rbTopics, ...after],
    items: nextItems,
    goals: goals.filter((g) => !gone.has(g.itemId)),
    removed: gone.size,
  };
}
