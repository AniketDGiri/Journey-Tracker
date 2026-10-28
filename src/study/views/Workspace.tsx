import { Fragment, useMemo, useState } from 'react';
import { FolderPlus, Plus, RotateCcw, Search, Timer } from 'lucide-react';
import type { Difficulty, Domain, ItemStatus, PracticeItem } from '../domain/types';
import { DOMAIN_META, STATUS_LABELS } from '../domain/catalog';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { logProgress, toggleSubItem } from '../engine/actions';
import { domainMastery, itemMastery, MASTERY_EXPLAINER } from '../engine/mastery';
import { dueBucket, isLearned } from '../engine/revision';
import { xpByDomain } from '../engine/progression';
import { formatDay } from '../lib/date';
import { cn } from '../lib/cn';
import { Bar, Button, Checkbox, Empty, Panel, Ring, Segmented } from '../components/ui';
import { DiffDot, STATUS_ORDER, STATUS_TONE, SubItemCount } from '../components/bits';
import { Legend, SkillTree } from '../components/progress';
import { PlanButton } from '../components/planner';

type Tab = 'tree' | 'items' | 'revision';
type DueFilter = 'all' | 'due' | 'upcoming' | 'unscheduled' | 'weak';
type Sort = 'topic' | 'next' | 'mastery' | 'recent';

export function Workspace({ domain }: { domain: Domain }) {
  const { state, derived, today, act } = useStore();
  const { open } = useUI();
  const meta = DOMAIN_META[domain];
  const [tab, setTab] = useState<Tab>('tree');
  const [topic, setTopic] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState<Difficulty | 'all'>('all');
  const [status, setStatus] = useState<ItemStatus | 'all'>('all');
  const [due, setDue] = useState<DueFilter>('all');
  const [sort, setSort] = useState<Sort>('topic');
  const [explain, setExplain] = useState(false);

  const items = useMemo(() => state.items.filter((i) => i.domain === domain), [state.items, domain]);
  const topics = useMemo(() => state.topics.filter((t) => t.domain === domain).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name)), [state.topics, domain]);
  const topicName = useMemo(() => new Map(topics.map((t) => [t.id, t.name])), [topics]);
  const topicOrder = useMemo(() => new Map(topics.map((t, i) => [t.id, i])), [topics]);

  const mastery = domainMastery(derived.stats, domain);
  const learned = items.filter(isLearned);
  const independent = items.filter((i) => i.status === 'independent').length;
  const dueItems = items.filter((i) => ['overdue', 'today'].includes(dueBucket(i, today)));
  const domainXp = xpByDomain(state)[domain];
  const solveTimes = learned.filter((i) => i.solveTimeMin).map((i) => i.solveTimeMin!);
  const avgSolve = solveTimes.length ? Math.round(solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length) : null;
  const byDiff = (['easy', 'medium', 'hard'] as Difficulty[]).map((d) => [d, learned.filter((i) => i.difficulty === d).length, items.filter((i) => i.difficulty === d).length] as const);
  const weakTopics = [...derived.stats.values()].filter((s) => s.topic.domain === domain && s.started > 0 && s.mastery < 40).sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  const patterns = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of learned) if (i.confidence >= 4) for (const t of i.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [learned]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter((i) => {
      if (topic && i.topicId !== topic) return false;
      if (needle && !i.title.toLowerCase().includes(needle) && !i.tags.some((t) => t.toLowerCase().includes(needle)) && !(topicName.get(i.topicId) ?? '').toLowerCase().includes(needle)) return false;
      if (diff !== 'all' && i.difficulty !== diff) return false;
      if (status !== 'all' && i.status !== status) return false;
      const b = dueBucket(i, today);
      if (due === 'due' && b !== 'overdue' && b !== 'today') return false;
      if (due === 'upcoming' && b !== 'upcoming') return false;
      if (due === 'unscheduled' && isLearned(i)) return false;
      if (due === 'weak' && !derived.queues.weak.some((w) => w.id === i.id)) return false;
      return true;
    });
    const key: Record<Sort, (i: PracticeItem) => string | number> = {
      topic: (i) => (topicOrder.get(i.topicId) ?? 99) * 1000 + STATUS_ORDER.indexOf(i.status),
      next: (i) => (isLearned(i) ? i.review.nextReviewAt ?? '9999' : '9999'),
      mastery: (i) => itemMastery(i, today),
      recent: (i) => -Date.parse(i.updatedAt),
    };
    return list.sort((a, b) => (key[sort](a) < key[sort](b) ? -1 : key[sort](a) > key[sort](b) ? 1 : 0));
  }, [items, topic, q, diff, status, due, sort, today, topicName, topicOrder, derived.queues.weak]);

  const quickStatus = (it: PracticeItem, s: ItemStatus) => act((st, ctx) => logProgress(st, it.id, { status: s }, ctx), { success: `${it.title} → ${STATUS_LABELS[it.kind][s]}` });

  const hasDifficulty = domain === 'dsa' || items.some((i) => i.difficulty);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <section className="st-panel flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <Ring value={mastery / 100} size={72} stroke={4} tone={domain === 'hld' ? 'arc' : 'violet'} label={`${meta.label} mastery ${mastery}%`}>
            <span className="num text-lg font-semibold">{mastery}%</span>
          </Ring>
          <div>
            <h2 className="text-xl font-semibold">{meta.title}</h2>
            <p className="text-sm text-ink-muted">{meta.tagline}</p>
            <button className="mt-1 text-[11px] text-violet-soft hover:underline" onClick={() => setExplain((e) => !e)} aria-expanded={explain}>
              How is mastery calculated?
            </button>
          </div>
        </div>
        <dl className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(104px,1fr))] gap-4 lg:px-6">
          <div>
            <dt className="st-label">Learned</dt>
            <dd className="num mt-1 text-lg font-semibold">
              {learned.length}
              <span className="text-xs font-normal text-ink-muted">/{items.length}</span>
            </dd>
          </div>
          <div>
            <dt className="st-label">Independent</dt>
            <dd className="num mt-1 text-lg font-semibold">{learned.length ? Math.round((independent / learned.length) * 100) : 0}%</dd>
          </div>
          <div>
            <dt className="st-label">{domain === 'dsa' ? 'Avg solve' : 'Due now'}</dt>
            <dd className="num mt-1 text-lg font-semibold">{domain === 'dsa' ? (avgSolve ? `${avgSolve}m` : '—') : dueItems.length}</dd>
          </div>
          <div>
            <dt className="st-label">{state.settings.gamification ? 'Domain XP' : 'Due now'}</dt>
            <dd className="num mt-1 text-lg font-semibold">{state.settings.gamification ? domainXp.toLocaleString() : dueItems.length}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => open({ type: 'log', domain, mode: 'new', topicId: topic })}>
            <Plus size={14} aria-hidden="true" /> Add item
          </Button>
          <Button variant="secondary" size="sm" onClick={() => open({ type: 'log', domain, mode: 'existing' })} disabled={!items.length}>
            Log progress
          </Button>
          <Button variant="secondary" size="sm" onClick={() => open({ type: 'focus', domain })} disabled={!dueItems.length}>
            <RotateCcw size={14} aria-hidden="true" /> Revise {dueItems.length || ''}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => open({ type: 'start-session', domain })}>
            <Timer size={14} aria-hidden="true" /> Session
          </Button>
        </div>
      </section>
      {explain && (
        <div className="st-panel p-4 text-xs text-ink-soft">
          <ul className="grid gap-1 sm:grid-cols-2">
            {MASTERY_EXPLAINER.map((l) => (
              <li key={l}>· {l}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        {hasDifficulty && (
          <Panel title="By difficulty">
            <ul className="flex flex-col gap-2.5">
              {byDiff.filter(([, , total]) => total > 0).map(([d, n, total]) => (
                <li key={d} className="flex items-center gap-3 text-xs">
                  <DiffDot difficulty={d} />
                  <span className="w-14 capitalize text-ink-soft">{d}</span>
                  <Bar value={n / total} tone={d === 'hard' ? 'ember' : 'violet'} label={`${d} progress`} />
                  <span className="num w-12 text-right text-ink-muted">
                    {n}/{total}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        <Panel title="Weak areas">
          {weakTopics.length || derived.queues.weak.some((w) => w.domain === domain) ? (
            <ul className="flex flex-col gap-2 text-xs">
              {weakTopics.map((s) => (
                <li key={s.topic.id} className="flex justify-between gap-2">
                  <button className="text-left text-ink-soft hover:text-ink" onClick={() => { setTopic(s.topic.id); setTab('items'); }}>
                    {s.topic.name}
                  </button>
                  <span className="num text-ink-muted">{s.mastery}%</span>
                </li>
              ))}
              {derived.queues.weak
                .filter((w) => w.domain === domain)
                .slice(0, 4 - weakTopics.length)
                .map((w) => (
                  <li key={w.id} className="flex justify-between gap-2">
                    <button className="truncate text-left text-ink-soft hover:text-ink" onClick={() => open({ type: 'item', itemId: w.id })}>
                      {w.title}
                    </button>
                    <span className={cn('shrink-0', w.status === 'unsolved' ? 'text-rose' : 'text-ember-soft')}>{STATUS_LABELS[w.kind][w.status]}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">No weak spots detected yet. Items you leave unsolved or forget show up here.</p>
          )}
        </Panel>
        <Panel title={domain === 'dsa' ? 'Patterns mastered' : 'Coverage'} className={hasDifficulty ? '' : 'md:col-span-2'}>
          {domain === 'dsa' ? (
            patterns.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {patterns.map(([p, n]) => (
                  <li key={p} className="rounded-md border border-violet/30 bg-violet/10 px-2 py-1 text-xs text-violet-soft">
                    {p} <span className="num text-ink-muted">×{n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-muted">Tag problems with their pattern (e.g. “monotonic stack”). Patterns on items you rate 4+ confidence appear here.</p>
            )
          ) : (
            <ul className="grid grid-cols-2 gap-2 text-xs">
              {[...derived.stats.values()]
                .filter((s) => s.topic.domain === domain)
                .sort((a, b) => b.mastery - a.mastery)
                .slice(0, 6)
                .map((s) => (
                  <li key={s.topic.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{s.topic.name}</span>
                    <span className="num text-ink-muted">{s.mastery}%</span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Workspace view"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'tree', label: 'Skill tree' },
            { value: 'items', label: `Items · ${items.length}` },
            { value: 'revision', label: `Revision queue · ${dueItems.length}` },
          ]}
        />
        {topic && (
          <button className="rounded-md border border-violet/40 bg-violet/10 px-2 py-1 text-xs text-violet-soft" onClick={() => setTopic(undefined)}>
            {topicName.get(topic)} ✕
          </button>
        )}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => open({ type: 'topic', domain })}>
          <FolderPlus size={14} aria-hidden="true" /> Add topic
        </Button>
      </div>

      {tab === 'tree' && (
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-muted">Topics unlock when their prerequisites reach 40% mastery. Select a topic to see its items.</p>
            <Legend />
          </div>
          <SkillTree
            domain={domain}
            selected={topic}
            onSelect={(t) => {
              setTopic(t);
              if (t) setTab('items');
            }}
          />
        </Panel>
      )}

      {tab === 'items' && (
        <Panel>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-muted">
              {topic ? <>Showing <span className="text-ink">{topicName.get(topic)}</span></> : 'All topics'} · <span className="num">{filtered.length}</span> item{filtered.length === 1 ? '' : 's'}
            </p>
            <Button size="sm" variant="primary" onClick={() => open({ type: 'log', domain, mode: 'new', topicId: topic })}>
              <Plus size={14} aria-hidden="true" /> Add item{topic ? ` to ${topicName.get(topic)}` : ''}
            </Button>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(5,auto)]">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <input className="st-input pl-8" placeholder="Search title, tag or topic" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" />
            </div>
            <select className="st-input" value={topic ?? ''} onChange={(e) => setTopic(e.target.value || undefined)} aria-label="Filter by topic">
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {hasDifficulty && (
              <select className="st-input" value={diff} onChange={(e) => setDiff(e.target.value as Difficulty | 'all')} aria-label="Filter by difficulty">
                <option value="all">Any difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            )}
            <select className="st-input" value={status} onChange={(e) => setStatus(e.target.value as ItemStatus | 'all')} aria-label="Filter by status">
              <option value="all">Any status</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[domain === 'dsa' ? 'problem' : 'concept'][s]}
                </option>
              ))}
            </select>
            <select className="st-input" value={due} onChange={(e) => setDue(e.target.value as DueFilter)} aria-label="Filter by revision">
              <option value="all">Any revision state</option>
              <option value="due">Due / overdue</option>
              <option value="upcoming">Due this week</option>
              <option value="unscheduled">Not learned yet</option>
              <option value="weak">Weak</option>
            </select>
            <select className="st-input" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort items">
              <option value="topic">Sort: topic</option>
              <option value="next">Sort: next revision</option>
              <option value="mastery">Sort: lowest mastery</option>
              <option value="recent">Sort: recently updated</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <Empty title="No items match these filters">
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => open({ type: 'log', domain, mode: 'new', topicId: topic })}>
                Add an item
              </Button>
            </Empty>
          ) : (
            <ItemTable items={filtered} topicName={topicName} onStatus={quickStatus} />
          )}
        </Panel>
      )}

      {tab === 'revision' && <RevisionList domain={domain} />}
    </div>
  );
}

function ItemTable({ items, topicName, onStatus }: { items: PracticeItem[]; topicName: Map<string, string>; onStatus: (i: PracticeItem, s: ItemStatus) => void }) {
  const { today, act } = useStore();
  const { open } = useUI();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggleRow = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const tick = (it: PracticeItem, subId: string) => {
    const sub = it.subItems?.find((s) => s.id === subId);
    const finishing = !!sub && !sub.done && (it.subItems ?? []).every((s) => s.id === subId || s.done);
    act((s, ctx) => toggleSubItem(s, it.id, subId, ctx), { success: finishing ? `Completed “${it.title}”` : undefined, silent: !finishing });
  };
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-muted">
            <th scope="col" className="py-2 pl-4 pr-3 font-medium sm:pl-5">Item</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">Conf.</th>
            <th scope="col" className="px-3 py-2 font-medium">Next revision</th>
            <th scope="col" className="py-2 pl-3 pr-4 font-medium sm:pr-5">Mastery</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const b = dueBucket(it, today);
            const m = itemMastery(it, today);
            const subs = it.subItems ?? [];
            const isOpen = subs.length > 0 && expanded.has(it.id);
            const panelId = `subs-${it.id}`;
            return (
              <Fragment key={it.id}>
                <tr className={cn('hover:bg-surface-2/40', isOpen ? 'bg-surface-2/30' : 'border-b border-line/60')}>
                  <td className="py-2.5 pl-4 pr-3 sm:pl-5">
                    <div className="flex max-w-[380px] items-center gap-2.5">
                      <button className="flex min-w-0 items-center gap-2.5 text-left" onClick={() => open({ type: 'item', itemId: it.id })}>
                        <DiffDot difficulty={it.difficulty} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink hover:text-violet-soft">{it.title}</span>
                          <span className="block truncate text-[11px] text-ink-muted">
                            {topicName.get(it.topicId)}
                            {it.tags.length ? ` · ${it.tags.join(', ')}` : ''}
                          </span>
                        </span>
                      </button>
                      <SubItemCount item={it} expanded={isOpen} onToggle={() => toggleRow(it.id)} controls={panelId} />
                      <PlanButton itemId={it.id} label={it.title} className="ml-auto" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={it.status}
                      onChange={(e) => onStatus(it, e.target.value as ItemStatus)}
                      aria-label={`Status of ${it.title}`}
                      className={cn(
                        'rounded-md border bg-surface-2 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-soft',
                        { muted: 'border-line-strong text-ink-muted', violet: 'border-violet/40 text-violet-soft', arc: 'border-arc/40 text-arc-soft', ember: 'border-ember/40 text-ember-soft', rose: 'border-rose/40 text-rose', jade: 'border-jade/40 text-jade' }[STATUS_TONE[it.status]],
                      )}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[it.kind][s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="num px-3 py-2.5 text-xs text-ink-soft">{it.confidence ? `${it.confidence}/5` : '—'}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {isLearned(it) && it.review.nextReviewAt ? (
                      <span className={cn('num', b === 'overdue' ? 'text-ember-soft' : b === 'today' ? 'text-violet-soft' : 'text-ink-soft')}>{formatDay(it.review.nextReviewAt, today)}</span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 pr-4 sm:pr-5">
                    <div className="flex items-center gap-2">
                      <Bar value={m / 100} tone={m >= 85 ? 'arc' : 'violet'} className="w-16" label={`Mastery ${m}`} />
                      <span className="num w-7 text-right text-xs text-ink-muted">{m}</span>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr id={panelId} className="border-b border-line/60 bg-surface-2/30">
                    <td colSpan={5} className="pb-3 pl-[42px] pr-4 sm:pl-[46px] sm:pr-5">
                      <div className="animate-rise border-l border-violet/30 pl-3">
                        <ul className="grid gap-x-6 sm:grid-cols-2" aria-label={`Sub-items of ${it.title}`}>
                          {subs.map((s) => (
                            <li key={s.id} className="flex items-center gap-1">
                              <div className="min-w-0 flex-1">
                                <Checkbox checked={s.done} onChange={() => tick(it, s.id)} label={<span className={cn(s.done && 'text-ink-muted line-through')}>{s.title}</span>} />
                              </div>
                              <PlanButton itemId={it.id} subItemId={s.id} label={s.title} />
                            </li>
                          ))}
                        </ul>
                        <button className="mt-1 text-[11px] text-ink-muted underline-offset-4 hover:text-violet-soft hover:underline" onClick={() => open({ type: 'item', itemId: it.id })}>
                          Add or edit steps
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RevisionList({ domain }: { domain?: Domain }) {
  const { derived, today, state } = useStore();
  const { open } = useUI();
  const f = (l: PracticeItem[]) => (domain ? l.filter((i) => i.domain === domain) : l);
  const groups: [string, PracticeItem[], string][] = [
    ['Overdue', f(derived.queues.overdue), 'text-ember-soft'],
    ['Due today', f(derived.queues.today), 'text-violet-soft'],
    ['Upcoming (7 days)', f(derived.queues.upcoming), 'text-ink-soft'],
    ['Weak — needs practice', f(derived.queues.weak), 'text-rose'],
  ];
  const topicName = new Map(state.topics.map((t) => [t.id, t.name]));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map(([label, list, tone]) => (
        <Panel key={label} title={`${label} · ${list.length}`}>
          {list.length === 0 ? (
            <p className="text-xs text-ink-muted">{label.startsWith('Overdue') ? 'Nothing overdue. Great rhythm.' : label.startsWith('Weak') ? 'No weak items right now.' : 'Nothing here.'}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line/60">
              {list.slice(0, 12).map((it) => (
                <li key={it.id}>
                  <button className="flex w-full items-center gap-3 py-2 text-left hover:text-violet-soft" onClick={() => open({ type: 'item', itemId: it.id })}>
                    <DiffDot difficulty={it.difficulty} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{it.title}</span>
                      <span className="block text-[11px] text-ink-muted">
                        {DOMAIN_META[it.domain].short} · {topicName.get(it.topicId)}
                      </span>
                    </span>
                    <span className={cn('num shrink-0 text-xs', tone)}>
                      {label.startsWith('Weak') ? STATUS_LABELS[it.kind][it.status] : it.review.nextReviewAt ? formatDay(it.review.nextReviewAt, today) : ''}
                    </span>
                  </button>
                </li>
              ))}
              {list.length > 12 && <li className="pt-2 text-[11px] text-ink-muted">+{list.length - 12} more</li>}
            </ul>
          )}
        </Panel>
      ))}
    </div>
  );
}

