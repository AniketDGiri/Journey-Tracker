import { useMemo, useState } from 'react';
import type { Domain } from '../domain/types';
import { DOMAIN_META } from '../domain/catalog';
import { useStore } from '../store/AppStore';
import { domainMastery } from '../engine/mastery';
import { isLearned } from '../engine/revision';
import { addDays, diffDays, formatDay, startOfWeek } from '../lib/date';
import { Bar, Panel, Segmented } from '../components/ui';
import { Heatmap } from '../components/progress';
import { TOPIC_STATE_META } from '../components/bits';
import { cn } from '../lib/cn';

/** Single-series weekly column chart with per-bar hover labels. */
function WeekBars({ values, labels, unit, title }: { values: number[]; labels: string[]; unit: string; title: string }) {
  const max = Math.max(1, ...values);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <div className="relative flex h-36 items-end gap-2 border-b border-line" role="img" aria-label={`${title}: ${values.map((v, i) => `${labels[i]} ${v}${unit}`).join(', ')}`}>
        {values.map((v, i) => (
          <div key={i} className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {hover === i && (
              <span className="num absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-line-strong bg-surface-3 px-2 py-1 text-[11px] text-ink">
                {labels[i]} · {v}
                {unit}
              </span>
            )}
            <div className={cn('rounded-t-[4px] transition-colors', i === values.length - 1 ? 'bg-violet-soft' : hover === i ? 'bg-violet' : 'bg-violet-deep')} style={{ height: `${(v / max) * 100}%`, minHeight: v ? 3 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 text-[10px] text-ink-faint" aria-hidden="true">
        {labels.map((l, i) => (
          <span key={i} className="flex-1 truncate text-center">
            {i % 2 === values.length % 2 ? l : ''}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function Analytics() {
  const { state, derived, today } = useStore();
  const [range, setRange] = useState<'8' | '12' | '26'>('12');
  const weeks = Number(range);

  const weekly = useMemo(() => {
    const ws = startOfWeek(today);
    const starts = Array.from({ length: weeks }, (_, i) => addDays(ws, -(weeks - 1 - i) * 7));
    const idx = (d: string) => {
      const k = Math.floor(diffDays(starts[0], d) / 7);
      return k >= 0 && k < weeks ? k : -1;
    };
    const learned = Array(weeks).fill(0);
    const reviews = Array(weeks).fill(0);
    const minutes = Array(weeks).fill(0);
    const seen = new Set<string>();
    for (const a of state.activity) {
      const k = idx(a.date);
      if (k < 0) continue;
      if ((a.type === 'solve' || a.type === 'learn') && a.itemId && !seen.has(`${k}:${a.itemId}`)) {
        seen.add(`${k}:${a.itemId}`);
        learned[k]++;
      }
      if (a.type === 'review') reviews[k]++;
    }
    for (const s of state.sessions) {
      const k = idx(s.date);
      if (k >= 0) minutes[k] += s.durationMin;
    }
    return { labels: starts.map((s) => formatDay(s)), learned, reviews, hours: minutes.map((m) => Math.round(m / 6) / 10) };
  }, [state.activity, state.sessions, today, weeks]);

  const recall = useMemo(() => {
    const r = state.activity.filter((a) => a.type === 'review' && diffDays(a.date, today) < 30);
    const c = { success: 0, partial: 0, fail: 0 };
    for (const a of r) c[a.quality ?? 'partial']++;
    return { ...c, total: r.length };
  }, [state.activity, today]);

  const solveByDiff = useMemo(
    () =>
      (['easy', 'medium', 'hard'] as const).map((d) => {
        const t = state.items.filter((i) => i.kind === 'problem' && i.difficulty === d && isLearned(i) && i.solveTimeMin).map((i) => i.solveTimeMin!);
        return { d, avg: t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : null, n: t.length };
      }),
    [state.items],
  );

  const topics = useMemo(() => [...derived.stats.values()].sort((a, b) => a.topic.domain.localeCompare(b.topic.domain) || a.topic.tier - b.topic.tier), [derived.stats]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {(['dsa', 'hld', 'lld'] as Domain[]).map((d) => {
          const m = domainMastery(derived.stats, d);
          const list = topics.filter((t) => t.topic.domain === d);
          return (
            <Panel key={d} title={DOMAIN_META[d].title}>
              <p className="num text-3xl font-semibold">{m}%</p>
              <Bar value={m / 100} tone={d === 'hld' ? 'arc' : 'violet'} className="mt-3" label={`${DOMAIN_META[d].label} mastery`} />
              <p className="mt-2 text-xs text-ink-muted">
                {list.filter((s) => s.state === 'mastered').length} mastered · {list.filter((s) => s.state === 'in-progress' || s.state === 'revision-due').length} in progress · {list.filter((s) => s.state === 'locked').length} locked
              </p>
            </Panel>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="st-label">Weekly trends</h2>
        <Segmented label="Range" size="sm" value={range} onChange={setRange} options={[{ value: '8', label: '8w' }, { value: '12', label: '12w' }, { value: '26', label: '26w' }]} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Items learned / solved">
          <WeekBars title="Items learned per week" values={weekly.learned} labels={weekly.labels} unit="" />
        </Panel>
        <Panel title="Revisions">
          <WeekBars title="Revisions per week" values={weekly.reviews} labels={weekly.labels} unit="" />
        </Panel>
        <Panel title="Session hours">
          <WeekBars title="Session hours per week" values={weekly.hours} labels={weekly.labels} unit="h" />
          <p className="mt-2 text-[11px] text-ink-muted">Time is context, not the goal — outcomes above matter more.</p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recall quality · 30 days">
          {recall.total ? (
            <>
              <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${recall.success} recalled, ${recall.partial} partial, ${recall.fail} forgotten`}>
                <span className="bg-arc-soft" style={{ width: `${(recall.success / recall.total) * 100}%` }} />
                <span className="bg-ember" style={{ width: `${(recall.partial / recall.total) * 100}%` }} />
                <span className="bg-rose" style={{ width: `${(recall.fail / recall.total) * 100}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                {[
                  ['Recalled', recall.success, 'bg-arc-soft'],
                  ['Partial', recall.partial, 'bg-ember'],
                  ['Forgot', recall.fail, 'bg-rose'],
                ].map(([l, n, c]) => (
                  <div key={l as string}>
                    <dt className="flex items-center gap-1.5 text-ink-muted">
                      <span className={cn('h-2 w-2 rounded-sm', c as string)} aria-hidden="true" />
                      {l}
                    </dt>
                    <dd className="num mt-0.5 text-base font-semibold">{n}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="text-xs text-ink-muted">No revisions in the last 30 days.</p>
          )}
        </Panel>
        <Panel title="Average solve time (DSA)">
          <ul className="flex flex-col gap-3">
            {solveByDiff.map(({ d, avg, n }) => (
              <li key={d} className="flex items-center justify-between text-sm">
                <span className="capitalize text-ink-soft">{d}</span>
                <span className="num">
                  {avg ? `${avg} min` : '—'} <span className="text-[11px] text-ink-muted">({n})</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Consistency · 26 weeks">
          <Heatmap weeks={26} />
        </Panel>
      </div>

      <Panel title="All topics">
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-muted">
                <th scope="col" className="py-2 pl-4 font-medium sm:pl-5">Topic</th>
                <th scope="col" className="px-3 py-2 font-medium">Domain</th>
                <th scope="col" className="px-3 py-2 font-medium">State</th>
                <th scope="col" className="px-3 py-2 font-medium">Learned</th>
                <th scope="col" className="px-3 py-2 font-medium">Due</th>
                <th scope="col" className="py-2 pl-3 pr-4 font-medium sm:pr-5">Mastery</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((s) => (
                <tr key={s.topic.id} className="border-b border-line/60">
                  <td className="py-2 pl-4 sm:pl-5">{s.topic.name}</td>
                  <td className="px-3 py-2 text-xs text-ink-muted">{DOMAIN_META[s.topic.domain].short}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="flex items-center gap-1.5 text-ink-soft">
                      <span className={cn('h-2 w-2 rounded-full', TOPIC_STATE_META[s.state].dot)} aria-hidden="true" />
                      {TOPIC_STATE_META[s.state].label}
                    </span>
                  </td>
                  <td className="num px-3 py-2 text-xs">
                    {s.solved}/{Math.max(s.items.length, s.topic.target)}
                  </td>
                  <td className="num px-3 py-2 text-xs">{s.due || '—'}</td>
                  <td className="py-2 pl-3 pr-4 sm:pr-5">
                    <div className="flex items-center gap-2">
                      <Bar value={s.mastery / 100} tone={s.state === 'mastered' ? 'arc' : 'violet'} className="w-24" label={`${s.topic.name} mastery`} />
                      <span className="num text-xs text-ink-muted">{s.mastery}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
