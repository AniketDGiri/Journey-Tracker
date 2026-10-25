import type { AppState, Domain, ItemStatus, RecallQuality } from './types';
import { createEmptyState } from './defaults';
import { addDays, toDayKey } from '../lib/date';
import { claimQuest, editItem, finishSession, logProgress, reviewItem, syncAchievements, type Ctx } from '../engine/actions';
import { computeTopicStats } from '../engine/mastery';
import { nextItemFor } from '../engine/recommend';
import { revisionQueues } from '../engine/revision';
import { RUBRICS } from './catalog';
import { dailyQuests, missions, weeklyChallenges } from '../engine/quests';
import { logWorkout } from '../engine/fitness';
import { addExtra, logMeal, logWeight, toggleHabit } from '../engine/nutrition';
import { NUTRITION_PLAN } from './nutrition';
import { PHASES } from './fitness';

/**
 * Builds a realistic ~6-week demo history by replaying real actions through the
 * engine, so every number in sample mode is internally consistent.
 * The resulting state is flagged `mode: 'sample'` and never mixes with real data.
 */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function buildSampleState(now: Date = new Date()): AppState {
  const rand = rng(42);
  // The demo history is replayed against every domain's starter items.
  let state: AppState = { ...createEmptyState(now, ['dsa', 'hld', 'lld']), mode: 'sample', onboarded: true };
  const today = toDayKey(now);
  const DAYS = 42;

  const ctxFor = (day: string, hour: number): Ctx => {
    const [y, m, d] = day.split('-').map(Number);
    return { today: day, now: new Date(y, m - 1, d, hour, Math.floor(rand() * 60)).toISOString() };
  };

  for (let i = DAYS; i >= 1; i--) {
    const day = addDays(today, -i);
    // Realistic gaps: skip ~15% of days.
    if (rand() < 0.15) continue;
    const ctx = ctxFor(day, 19);

    // Revisions first.
    const q = revisionQueues(state.items, day);
    for (const it of [...q.overdue, ...q.today].slice(0, 14)) {
      const r = rand();
      const quality: RecallQuality = r < 0.68 ? 'success' : r < 0.88 ? 'partial' : 'fail';
      state = reviewItem(state, it.id, quality, ctxFor(day, 8));
    }

    // DSA practice.
    const n = rand() < 0.55 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const stats = computeTopicStats(state, day);
      const item = nextItemFor(state, stats, 'dsa');
      if (!item) break;
      const r = rand();
      const hard = item.difficulty === 'hard';
      const status: ItemStatus = r < (hard ? 0.3 : 0.6) ? 'independent' : r < 0.85 ? 'with-hints' : 'unsolved';
      const minutes = 15 + Math.floor(rand() * (hard ? 45 : 30));
      state = logProgress(
        state,
        item.id,
        { status, confidence: status === 'independent' ? 3 + Math.floor(rand() * 3) : 2, minutes, solveTimeMin: status === 'unsolved' ? undefined : minutes },
        ctx,
      );
    }

    // System design / LLD on alternating days.
    for (const domain of ['hld', 'lld'] as Domain[]) {
      if (rand() < 0.45) continue;
      const stats = computeTopicStats(state, day);
      const item = nextItemFor(state, stats, domain);
      if (!item) continue;
      if (item.kind === 'design' || item.kind === 'machine-coding') {
        const keys = RUBRICS[item.kind].map((r) => r.key);
        const done = Object.fromEntries(keys.slice(0, 5 + Math.floor(rand() * 4)).map((k) => [k, true]));
        state = logProgress(state, item.id, { status: rand() < 0.5 ? 'with-hints' : 'independent', rubric: done, confidence: 3, minutes: 60 }, ctx);
      } else {
        state = logProgress(state, item.id, { status: rand() < 0.7 ? 'independent' : 'with-hints', confidence: 3 + Math.floor(rand() * 2), minutes: 25 }, ctx);
      }
    }

    if (rand() < 0.35) {
      state = finishSession(
        state,
        { domain: 'dsa', durationMin: 30 + Math.floor(rand() * 40), outcome: 'practiced', confidence: 3, hintsUsed: false, notes: '' },
        ctxFor(day, 21),
      ).state;
    }

    const claimable = [...dailyQuests(state, day), ...weeklyChallenges(state, day), ...missions(state, computeTopicStats(state, day))];
    for (const quest of claimable) {
      if (quest.complete && !quest.claimed) state = claimQuest(state, quest, ctx);
    }
    state = syncAchievements(state, ctx).state;
  }
  // A few realistic notes and pattern tags so revision mode and pattern stats have content.
  const NOTES: Record<string, [string[], string]> = {
    'dsa:two-sum': [['hash map'], 'One pass: store value→index, check target - x before inserting. O(n) / O(n).'],
    'dsa:best-time-to-buy-and-sell-stock': [['prefix min'], 'Track min price so far; answer = max(price - min). O(n).'],
    'dsa:valid-parentheses': [['stack'], 'Push openers, pop on closer and compare. Empty stack at end.'],
    'dsa:daily-temperatures': [['monotonic stack'], 'Decreasing stack of indices; pop while current is warmer, record distance.'],
    'dsa:3sum': [['two pointers', 'sorting'], 'Sort, fix i, two pointers on the rest. Skip duplicates for i and for l/r after a hit.'],
    'dsa:container-with-most-water': [['two pointers'], 'Move the shorter wall inward — the taller one can never do better with less width.'],
    'dsa:longest-substring-without-repeating-characters': [['sliding window', 'hash map'], 'last-seen map; left = max(left, last[c] + 1).'],
    'dsa:group-anagrams': [['hash map'], 'Key = sorted word or 26-count tuple.'],
    'dsa:reverse-linked-list': [['pointers'], 'prev/curr/next; return prev.'],
    'dsa:binary-search': [['binary search'], 'lo <= hi, mid = lo + (hi - lo) / 2. Watch the off-by-one on updates.'],
    'dsa:search-in-rotated-sorted-array': [['binary search'], 'One half is always sorted; check whether target lies in it.'],
    'dsa:maximum-depth-of-binary-tree': [['dfs'], '1 + max(depth(l), depth(r)).'],
  };
  const c = ctxFor(addDays(today, -1), 22);
  for (const [id, [tags, notes]] of Object.entries(NOTES)) {
    if (state.items.some((i) => i.id === id)) state = editItem(state, id, { tags, notes }, c);
  }

  // Training: Phase-0 started 6 days ago; FBD-1 and FBD-2 logged, FBD-3 still open this week.
  const p0 = PHASES[0];
  const weights: Record<string, number> = { bench: 40, 'db-shoulder-press': 10, 'cable-row': 35, 'goblet-squat': 16, rdl: 40, 'sa-db-row': 14, 'lat-pulldown': 35 };
  ([['fbd-1', -6, 72], ['fbd-2', -4, 80]] as const).forEach(([wid, off, dur]) => {
    const w = p0.workouts.find((x) => x.id === wid)!;
    state = logWorkout(
      state,
      {
        phaseId: p0.id,
        workoutId: w.id,
        date: addDays(today, off),
        durationMin: dur,
        cardioMin: 15,
        formVideoShared: off === -6,
        notes: off === -6 ? 'Bench felt stable; sent form video.' : 'RDL hinge still rounding slightly at the bottom.',
        exercises: w.exercises.map((e, i) => ({
          exerciseId: e.id,
          name: e.name,
          sets: Array.from({ length: e.sets }, (_, k) => ({ reps: Math.max(10, 15 - k - (i % 2)), weight: weights[e.id] ?? 0 })),
        })),
      },
      ctxFor(addDays(today, off), 7),
    );
  });

  // Nutrition: 12 days of mostly on-plan eating and a gently trending weight.
  for (let i = 12; i >= 1; i--) {
    const day = addDays(today, -i);
    if (i === 9) continue; // one unlogged day
    const nc = ctxFor(day, 21);
    for (const meal of NUTRITION_PLAN.meals) {
      const opt = meal.options[(i + meal.id.length) % meal.options.length];
      const over = i % 5 === 0 && meal.id === 'dinner' ? 180 : 0;
      state = logMeal(state, day, meal.id, { optionId: opt.id, cal: opt.totalCal + over, protein: opt.totalProtein }, nc);
    }
    if (i % 4 === 0) state = addExtra(state, day, { name: 'Diet coke', cal: 0, protein: 0 }, nc);
    for (const h of ['sleep', 'water', 'fruitveg', 'salad']) if ((i + h.length) % 4 !== 0) state = toggleHabit(state, day, h, 'habits', true, nc);
    for (const sId of ['protein', 'd3', 'omega3', 'creatine']) if ((i + sId.length) % 5 !== 0) state = toggleHabit(state, day, sId, 'supplements', true, nc);
    if (i % 2 === 0) state = logWeight(state, day, 74 - (12 - i) * 0.06 + ((i * 7) % 5) * 0.1, nc);
  }
  return state;
}
