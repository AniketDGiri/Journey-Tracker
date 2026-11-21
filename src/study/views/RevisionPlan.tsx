import { useMemo, useState } from 'react';
import { CalendarDays, Check, RotateCcw, Search, X } from 'lucide-react';
import type { DayKey, Domain, PracticeItem } from '../domain/types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { planRevisions } from '../engine/actions';
import { isLearned } from '../engine/revision';
import { addDays, formatDay, formatDayInline, shortWeekday, weekday } from '../lib/date';
import { cn } from '../lib/cn';
import { Button, Panel, Segmented } from '../components/ui';
import { DomainTag } from '../components/bits';
import { SystemTag, SystemWindow } from '../components/system';

const WEEKENDS_AHEAD = 4;
/** More revisions than this on one day, next to that day's DSA and Java, starts to feel like a slog. */
const HEAVY_DAY = 6;

/** Saturdays and Sundays from today on, `weeks` weekends' worth. Today counts when it is a weekend day. */
export function weekendDays(today: DayKey, weeks = WEEKENDS_AHEAD): DayKey[][] {
  const wd = weekday(today);
  // The Saturday of the current (or coming) weekend; on a Sunday that is yesterday.
  const sat = wd === 0 ? addDays(today, -1) : addDays(today, 6 - wd);
  return Array.from({ length: weeks }, (_, i) => [addDays(sat, i * 7), addDays(sat, i * 7 + 1)].filter((d) => d >= today));
}

/** "2 days ago" reads lower-case mid-sentence; a calendar date ("Oct 22") keeps its capital. */
const inline = formatDayInline;

const fullDay = (d: DayKey, today: DayKey) => `${shortWeekday(d)} ${formatDay(d)}${d === today ? ' · today' : ''}`;

type Show = 'unplanned' | 'planned' | 'all';

export function RevisionPlan() {
  const { state, today, act } = useStore();
  const { open } = useUI();
  const [domain, setDomain] = useState<'all' | Domain>('all');
  const [show, setShow] = useState<Show>('unplanned');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'least'>('recent');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [other, setOther] = useState('');

  const weekends = useMemo(() => weekendDays(today), [today]);
  const nextWeekend = weekends[0];
  const topicName = useMemo(() => new Map(state.topics.map((t) => [t.id, t.name])), [state.topics]);
  const completed = useMemo(() => state.items.filter(isLearned), [state.items]);
  const byDay = useMemo(() => {
    const m = new Map<DayKey, PracticeItem[]>();
    for (const it of completed) {
      const d = it.review.nextReviewAt;
      if (d) m.set(d, [...(m.get(d) ?? []), it]);
    }
    return m;
  }, [completed]);
  const missed = completed.filter((it) => it.review.nextReviewAt && it.review.nextReviewAt < today);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return completed
      .filter((it) => domain === 'all' || it.domain === domain)
      .filter((it) => (show === 'all' ? true : show === 'planned' ? !!it.review.nextReviewAt : !it.review.nextReviewAt))
      .filter((it) => !q || it.title.toLowerCase().includes(q) || (topicName.get(it.topicId) ?? '').toLowerCase().includes(q))
      .sort(
        (a, b) =>
          // Least revised first: fewest revisions, then the one revised longest ago.
          (sort === 'least' ? a.review.history.length - b.review.history.length || (a.review.lastReviewedAt ?? '').localeCompare(b.review.lastReviewedAt ?? '') : 0) ||
          (b.review.lastStudiedAt ?? '').localeCompare(a.review.lastStudiedAt ?? '') ||
          a.title.localeCompare(b.title),
      );
  }, [completed, domain, show, query, topicName, sort]);

  const plan = (ids: string[], date: DayKey | null) => {
    if (!ids.length) return;
    const n = ids.length;
    act((s, ctx) => planRevisions(s, ids, date, ctx), {
      success: date ? `${n} item${n > 1 ? 's' : ''} planned for ${fullDay(date, today)}` : `${n} item${n > 1 ? 's' : ''} taken off the plan`,
    });
    setPicked(new Set());
  };
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allShown = list.length > 0 && list.every((it) => picked.has(it.id));
  const unplannedCount = completed.filter((it) => !it.review.nextReviewAt).length;

  return (
    <div className="flex flex-col gap-5">
      <SystemWindow label="Revision plan">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SystemTag>REVISION PLAN</SystemTag>
            <h2 className="mt-2 text-lg font-semibold">Revise on weekends, a little at a time</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Pick what you’ve completed and the weekend day you’ll revise it. Weekends also carry DSA and Java, so keep each day light — about {HEAVY_DAY} items — and spread the rest to the next weekend.
            </p>
          </div>
          <dl className="flex gap-6">
            <div>
              <dt className="st-label">Completed</dt>
              <dd className="num mt-1 text-xl font-semibold">{completed.length}</dd>
            </div>
            <div>
              <dt className="st-label">Not planned</dt>
              <dd className={cn('num mt-1 text-xl font-semibold', unplannedCount > 0 && 'text-ember-soft')}>{unplannedCount}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {weekends.map((days, i) => (
            <div key={days[0] ?? i} className={cn('rounded-lg border p-3', i === 0 ? 'border-arc-soft/60 bg-arc/5' : 'border-line')}>
              <p className="st-label">{i === 0 ? (days.includes(today) ? 'This weekend' : 'Coming weekend') : `In ${i} week${i > 1 ? 's' : ''}`}</p>
              {days.map((d) => {
                const items = byDay.get(d) ?? [];
                return (
                  <div key={d} className="mt-2">
                    <p className="flex items-center justify-between text-xs">
                      <span className={cn('font-medium', d === today ? 'text-arc-soft' : 'text-ink')}>{fullDay(d, today)}</span>
                      <span className={cn('num', items.length > HEAVY_DAY ? 'text-ember-soft' : 'text-ink-muted')} title={items.length > HEAVY_DAY ? 'A heavy day — consider moving some to the next weekend' : undefined}>
                        {items.length}
                        {items.length > HEAVY_DAY && ' · heavy'}
                      </span>
                    </p>
                    {items.length ? (
                      <ul className="mt-1 flex flex-col gap-1">
                        {items.map((it) => (
                          <li key={it.id} className="group flex items-center gap-1.5 text-xs">
                            <DomainTag domain={it.domain} />
                            <button type="button" className="min-w-0 flex-1 truncate text-left text-ink-soft hover:text-ink" onClick={() => open({ type: 'item', itemId: it.id })}>
                              {it.title}
                            </button>
                            <button
                              type="button"
                              onClick={() => plan([it.id], null)}
                              aria-label={`Take “${it.title}” off the plan`}
                              className="grid h-5 w-5 place-items-center rounded text-ink-faint opacity-0 hover:bg-surface-3 hover:text-ink focus:opacity-100 group-hover:opacity-100"
                            >
                              <X size={12} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-[11px] text-ink-faint">Nothing planned</p>
                    )}
                  </div>
                );
              })}
              {days.includes(today) && (byDay.get(today)?.length ?? 0) > 0 && (
                <Button size="sm" variant="primary" className="mt-3 w-full" onClick={() => open({ type: 'focus' })}>
                  <RotateCcw size={13} aria-hidden="true" /> Start today’s revision
                </Button>
              )}
            </div>
          ))}
        </div>

        {missed.length > 0 && nextWeekend?.[0] && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-rose/40 bg-rose/5 px-3 py-2.5 text-sm">
            <span className="text-ink">
              {missed.length} planned revision{missed.length > 1 ? 's' : ''} slipped past {missed.length > 1 ? 'their days' : 'its day'}.
            </span>
            <Button size="sm" variant="secondary" className="ml-auto" onClick={() => plan(missed.map((it) => it.id), nextWeekend[0])}>
              Move to {fullDay(nextWeekend[0], today)}
            </Button>
          </div>
        )}
      </SystemWindow>

      <Panel title="Completed">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Show"
            size="sm"
            value={show}
            onChange={(v) => {
              setShow(v);
              setPicked(new Set());
            }}
            options={[
              { value: 'unplanned', label: 'Not planned' },
              { value: 'planned', label: 'Planned' },
              { value: 'all', label: 'All' },
            ]}
          />
          <Segmented
            label="Domain"
            size="sm"
            value={domain}
            onChange={setDomain}
            options={[
              { value: 'all', label: 'All' },
              { value: 'dsa', label: 'DSA' },
              { value: 'hld', label: 'HLD' },
              { value: 'lld', label: 'LLD' },
            ]}
          />
          <Segmented
            label="Sort"
            size="sm"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'recent', label: 'Recently completed' },
              { value: 'least', label: 'Least revised first' },
            ]}
          />
          <label className="relative ml-auto min-w-0 flex-[0_1_260px]">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or topic" aria-label="Search completed items" className="st-input h-8 w-full pl-8 text-sm" />
          </label>
        </div>

        {picked.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-violet/40 bg-violet/10 px-3 py-2 text-xs">
            <span className="font-medium text-ink">{picked.size} selected · plan for</span>
            {weekends.slice(0, 2).flat().map((d) => (
              <Button key={d} size="sm" variant="secondary" onClick={() => plan([...picked], d)}>
                {fullDay(d, today)}
              </Button>
            ))}
            <input type="date" min={today} value={other} onChange={(e) => setOther(e.target.value)} aria-label="Another day" className="st-input num h-8 w-40 py-1 text-xs" />
            <Button size="sm" variant="primary" disabled={!other} onClick={() => plan([...picked], other)}>
              Plan
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => plan([...picked], null)}>
              Remove from plan
            </Button>
          </div>
        )}

        {list.length ? (
          <>
            <label className="mt-3 flex items-center gap-2 border-b border-line pb-2 text-[11px] text-ink-muted">
              <input type="checkbox" checked={allShown} onChange={() => setPicked(allShown ? new Set() : new Set(list.map((it) => it.id)))} className="h-4 w-4 accent-violet" />
              Select all {list.length} shown
            </label>
            <ul className="flex flex-col divide-y divide-line/60">
              {list.map((it) => (
                <CompletedRow key={it.id} item={it} topic={topicName.get(it.topicId) ?? ''} picked={picked.has(it.id)} onPick={() => toggle(it.id)} weekend={nextWeekend ?? []} onPlan={(d) => plan([it.id], d)} />
              ))}
            </ul>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-ink-muted">
            {completed.length === 0
              ? 'Nothing completed yet. Items you solve or understand show up here, ready to plan.'
              : show === 'unplanned'
                ? 'Everything completed is on the plan.'
                : 'Nothing matches.'}
          </p>
        )}
      </Panel>
    </div>
  );
}

// The gauge's pointed ends (as in a game HP bar). The frame and the track share it, the track inset by 2px.
const GAUGE_SHAPE = 'polygon(7px 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 7px 100%, 0 50%)';

/**
 * How many times an item has been revised, as a segmented gauge: one cell per revision up to
 * the end of the revision ladder. Amber while it's still being built, green once it's full.
 */
export function RevisionGauge({ count, target, className }: { count: number; target: number; className?: string }) {
  const full = count >= target;
  const extra = Math.max(0, count - target);
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        role="meter"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(count, target)}
        aria-label={`Revised ${count} time${count === 1 ? '' : 's'} of ${target}`}
        title={`Revised ${count}× — ${full ? 'the whole ladder is done' : `${target - count} more to finish the ladder`}`}
        className={cn('relative block h-[18px] w-[150px] shrink-0', full ? 'bg-jade/80' : count ? 'bg-jade/55' : 'bg-line-strong')}
        style={{ clipPath: GAUGE_SHAPE }}
      >
        <span className="absolute inset-[2px] flex gap-[2px] bg-void px-[7px] py-[2px]" style={{ clipPath: GAUGE_SHAPE }}>
          {Array.from({ length: target }, (_, i) => (
            <span
              key={i}
              className={cn('flex-1 rounded-[1px]', i < count ? (full ? 'text-jade' : 'text-ember') : 'text-jade/10')}
              // Thin vertical stripes in the cell's colour, like the reference bar.
              style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 4px)', backgroundColor: i < count ? 'transparent' : 'currentColor' }}
            />
          ))}
        </span>
      </span>
      <span className={cn('num w-12 shrink-0 text-[11px]', full ? 'text-jade' : count ? 'text-ember-soft' : 'text-ink-faint')}>
        {Math.min(count, target)}/{target}
        {extra > 0 && <span className="text-jade"> +{extra}</span>}
      </span>
    </span>
  );
}

function CompletedRow({ item: it, topic, picked, onPick, weekend, onPlan }: { item: PracticeItem; topic: string; picked: boolean; onPick: () => void; weekend: DayKey[]; onPlan: (d: DayKey | null) => void }) {
  const { state, today } = useStore();
  const { open } = useUI();
  const next = it.review.nextReviewAt;
  const revised = it.review.history.length;
  const ladder = state.settings.intervals.length;
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <input type="checkbox" checked={picked} onChange={onPick} aria-label={`Select “${it.title}”`} className="h-4 w-4 shrink-0 accent-violet" />
      <div className="min-w-0 flex-[1_1_260px]">
        <div className="flex items-center gap-2">
          <DomainTag domain={it.domain} />
          <button type="button" className="truncate text-left text-sm text-ink hover:underline" onClick={() => open({ type: 'item', itemId: it.id })}>
            {it.title}
          </button>
        </div>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-ink-muted">
          {topic && <span>{topic}</span>}
          {it.review.firstStudiedAt && <span>· completed {inline(it.review.firstStudiedAt, today)}</span>}
          <span>· {revised ? `last revised ${inline(it.review.lastReviewedAt ?? today, today)}` : 'never revised'}</span>
        </p>
      </div>
      <RevisionGauge count={revised} target={ladder} />
      {next ? (
        <span className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', next < today ? 'border-rose/50 text-rose' : 'border-arc-soft/60 text-arc-soft')}>
          <CalendarDays size={12} aria-hidden="true" />
          {fullDay(next, today)}
          <button type="button" onClick={() => onPlan(null)} aria-label="Take off the plan" className="ml-0.5 text-ink-muted hover:text-ink">
            <X size={12} />
          </button>
        </span>
      ) : (
        <span className="flex flex-wrap items-center gap-1.5">
          {weekend.map((d) => (
            <Button key={d} size="sm" variant="secondary" onClick={() => onPlan(d)} title={`Revise on ${fullDay(d, today)}`}>
              <Check size={12} aria-hidden="true" /> {shortWeekday(d)} {formatDay(d)}
            </Button>
          ))}
          <input
            type="date"
            min={today}
            value=""
            onChange={(e) => e.target.value && onPlan(e.target.value)}
            aria-label={`Pick another day for “${it.title}”`}
            title="Another day"
            className="st-input num h-8 w-36 py-1 text-xs"
          />
        </span>
      )}
    </li>
  );
}
