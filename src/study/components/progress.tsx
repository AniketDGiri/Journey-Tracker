import { useMemo } from 'react';
import { Check, Flame, Lock, Pencil, Shield } from 'lucide-react';
import type { Domain } from '../domain/types';
import { DOMAIN_META } from '../domain/catalog';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import type { Quest } from '../engine/quests';
import { claimQuest } from '../engine/actions';
import { domainMastery, type TopicStats } from '../engine/mastery';
import { addDays, daysBetween, formatDay, monthLabel, startOfWeek } from '../lib/date';
import { cn } from '../lib/cn';
import { Bar, Button, Ring } from './ui';
import { DomainTag, TOPIC_STATE_META } from './bits';
import { Sigil } from './Sigil';
import { MAX_SHIELDS } from '../engine/streak';
import { useLegacyDays } from '../store/legacy';

// ── Player card ─────────────────────────────────────────────────────────

export function PlayerCard() {
  const { state, derived } = useStore();
  const { level, streak, stats } = derived;
  const game = state.settings.gamification;
  const overall = Math.round((domainMastery(stats, 'dsa') + domainMastery(stats, 'hld') + domainMastery(stats, 'lld')) / 3);
  const solved = state.items.filter((i) => i.status === 'independent' || i.status === 'with-hints').length;
  return (
    <section className="st-panel relative overflow-hidden p-5" aria-label="Player profile">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet/10 blur-3xl" aria-hidden="true" />
      <div className="flex items-center gap-4">
        {game ? (
          <Ring value={level.progress} size={68} stroke={3} label={`Level ${level.level}, ${Math.round(level.progress * 100)}% to next`}>
            <div className="flex flex-col items-center leading-none">
              <span className="text-[9px] uppercase tracking-widest text-ink-muted">Lv</span>
              <span className="num text-xl font-semibold">{level.level}</span>
            </div>
          </Ring>
        ) : (
          <Ring value={overall / 100} size={68} stroke={3} tone="arc" label={`Overall progress ${overall}%`}>
            <span className="num text-lg font-semibold">{overall}%</span>
          </Ring>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-muted">{state.settings.playerName || 'Your journey'}</p>
          {game ? (
            <>
              <p className="flex items-center gap-2 text-lg font-semibold tracking-wide">
                <Sigil size={16} /> {level.rank.name}
              </p>
              <p className="num text-xs text-ink-muted">
                {level.intoLevel.toLocaleString()} / {level.forNext.toLocaleString()} XP to Lv {level.level + 1}
              </p>
            </>
          ) : (
            <p className="text-lg font-semibold">Overall preparation</p>
          )}
        </div>
      </div>
      {game && <Bar value={level.progress} className="mt-4" label="XP to next level" />}
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div>
          <dt className="st-label">Streak</dt>
          <dd className="num mt-1 flex items-center gap-1 text-lg font-semibold">
            <Flame size={15} className={streak.current ? 'text-ember' : 'text-ink-faint'} aria-hidden="true" />
            {streak.current}
            <span className="text-xs font-normal text-ink-muted">d</span>
          </dd>
          <p className="num text-[11px] text-ink-muted">best {streak.longest}d</p>
        </div>
        <div>
          <dt className="st-label">Shields</dt>
          <dd className="mt-1 flex items-center gap-1 text-lg font-semibold" aria-label={`${streak.shields} of ${MAX_SHIELDS} streak shields`}>
            {Array.from({ length: MAX_SHIELDS }).map((_, i) => (
              <Shield key={i} size={15} className={i < streak.shields ? 'fill-arc/30 text-arc-soft' : 'text-ink-faint'} aria-hidden="true" />
            ))}
          </dd>
          <p className="text-[11px] text-ink-muted">1 per 7 active days</p>
        </div>
        <div>
          <dt className="st-label">{game ? 'Overall' : 'Solved'}</dt>
          <dd className="num mt-1 text-lg font-semibold">{game ? `${overall}%` : solved}</dd>
          <p className="num text-[11px] text-ink-muted">{game ? `${solved} items learned` : 'items learned'}</p>
        </div>
      </dl>
      {!streak.activeToday && streak.current > 0 && <p className="mt-3 text-[11px] text-ink-muted">Log anything meaningful today to extend your streak.</p>}
      {streak.current === 0 && streak.longest > 0 && <p className="mt-3 text-[11px] text-ink-muted">New streak starts with your next session — your progress and XP are all still here.</p>}
    </section>
  );
}

// ── Quests ──────────────────────────────────────────────────────────────

export function QuestList({ quests, compact }: { quests: Quest[]; compact?: boolean }) {
  const { state, act } = useStore();
  const { open, navigate } = useUI();
  const game = state.settings.gamification;
  const go = (q: Quest) => {
    const a = q.action;
    if (!a) return;
    if (a.type === 'log') open({ type: 'log', domain: a.domain });
    else if (a.type === 'revise') open({ type: 'focus' });
    else navigate(a.to);
  };
  return (
    <ul className="flex flex-col divide-y divide-line">
      {quests.map((q) => (
        <li key={q.ref} className={cn('flex items-center gap-3', compact ? 'py-2.5' : 'py-3')}>
          <span
            className={cn(
              'grid h-7 w-7 shrink-0 place-items-center rounded-full border',
              q.claimed || (!game && q.complete) ? 'border-arc/50 bg-arc/15 text-arc-soft' : q.complete ? 'border-violet bg-violet/20 text-violet-soft shadow-glow' : 'border-line-strong text-ink-faint',
            )}
            aria-hidden="true"
          >
            {q.complete ? <Check size={14} /> : <span className="num text-[10px]">{Math.round((q.progress / q.target) * 100)}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {q.domain && <DomainTag domain={q.domain} />}
              <p className={cn('truncate text-sm', q.claimed ? 'text-ink-muted' : 'text-ink')}>{q.title}</p>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Bar value={q.progress / q.target} tone={q.complete ? 'arc' : 'violet'} className="max-w-[200px]" label={`${q.title} progress`} />
              <span className="num text-[11px] text-ink-muted">
                {q.progress}/{q.target}
              </span>
            </div>
          </div>
          {q.claimed ? (
            <span className="text-xs text-ink-muted">Claimed</span>
          ) : q.complete && game ? (
            <Button size="sm" variant="primary" onClick={() => act((s, ctx) => claimQuest(s, q, ctx), { success: q.title })}>
              Claim +{q.reward}
            </Button>
          ) : q.complete ? (
            <span className="text-xs text-arc-soft">Done</span>
          ) : q.action ? (
            <Button size="sm" variant="secondary" onClick={() => go(q)}>
              {q.action.type === 'log' ? 'Log' : q.action.type === 'revise' ? 'Revise' : 'Open'}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// ── Heatmap ─────────────────────────────────────────────────────────────

export function Heatmap({ weeks = 18 }: { weeks?: number }) {
  const { state, today, derived } = useStore();
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of state.activity) m.set(a.date, (m.get(a.date) ?? 0) + 1);
    return m;
  }, [state.activity]);
  const start = addDays(startOfWeek(today), -(weeks - 1) * 7);
  const days = daysBetween(start, addDays(startOfWeek(today), 6));
  const cols: string[][] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));
  const legacy = useLegacyDays();
  const total = days.filter((d) => ((counts.get(d) ?? 0) > 0 || legacy.has(d)) && d <= today).length;
  const legacyInRange = days.filter((d) => legacy.has(d) && !(counts.get(d) ?? 0)).length;
  const level = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
  const shades = ['bg-surface-3', 'bg-violet-deep/50', 'bg-violet-deep', 'bg-violet', 'bg-violet-soft'];
  // A day won in the earlier tracker, with nothing logged in Ascend that day.
  const legacyShade = 'bg-arc/70';

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1" role="img" aria-label={`Activity on ${total} of the last ${weeks * 7} days`}>
          <div className="flex gap-[3px] pl-0 text-[10px] text-ink-faint" aria-hidden="true">
            {cols.map((c, i) => (
              <span key={i} className="w-[11px]">
                {i === 0 || monthLabel(c[0]) !== monthLabel(cols[i - 1][0]) ? monthLabel(c[0]) : ''}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {cols.map((c, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {c.map((d) => {
                  const n = counts.get(d) ?? 0;
                  const mark = derived.streak.marks.get(d);
                  const future = d > today;
                  const old = legacy.has(d);
                  return (
                    <span
                      key={d}
                      title={future ? '' : `${formatDay(d)} · ${n} activit${n === 1 ? 'y' : 'ies'}${old ? ' · completed in earlier tracker' : ''}${mark === 'shielded' ? ' · shield used' : mark === 'rest' ? ' · rest day' : ''}`}
                      className={cn(
                        'h-[11px] w-[11px] rounded-[3px]',
                        future ? 'bg-transparent' : n === 0 && old ? legacyShade : shades[level(n)],
                        mark === 'shielded' && 'ring-1 ring-arc-soft/70',
                        d === today && 'ring-1 ring-ink-soft',
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span className="num">{total} active days</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          Less {shades.map((s) => <span key={s} className={cn('h-2.5 w-2.5 rounded-[2px]', s)} />)} More
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-[2px] ring-1 ring-arc-soft/70" aria-hidden="true" /> Shield used
        </span>
        {legacy.size > 0 && (
          <span className="flex items-center gap-1" title="Days won in the earlier tracker: minimum hours met or Main Task ticked">
            <span className={cn('h-2.5 w-2.5 rounded-[2px]', legacyShade)} aria-hidden="true" /> Completed earlier
            {legacyInRange > 0 && <span className="num text-ink-faint">({legacyInRange})</span>}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Branch overview (dashboard) ─────────────────────────────────────────

export function BranchOverview() {
  const { derived } = useStore();
  const { navigate } = useUI();
  return (
    <div className="flex flex-col gap-4">
      {(['dsa', 'hld', 'lld'] as Domain[]).map((d) => {
        const list = [...derived.stats.values()].filter((s) => s.topic.domain === d).sort((a, b) => a.topic.tier - b.topic.tier);
        const m = domainMastery(derived.stats, d);
        const mastered = list.filter((s) => s.state === 'mastered').length;
        return (
          <button key={d} onClick={() => navigate(d)} className="group flex items-center gap-4 rounded-lg p-1 text-left hover:bg-surface-2/60" aria-label={`${DOMAIN_META[d].label}: ${m}% mastery. Open workspace`}>
            <Ring value={m / 100} size={46} stroke={3} tone={d === 'hld' ? 'arc' : 'violet'}>
              <span className="num text-xs font-semibold">{m}</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{DOMAIN_META[d].title}</p>
                <p className="num text-[11px] text-ink-muted">
                  {mastered}/{list.length} mastered
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
                {list.map((s) => (
                  <span key={s.topic.id} title={`${s.topic.name} · ${TOPIC_STATE_META[s.state].label} · ${s.mastery}%`} className={cn('h-2 w-4 rounded-sm', TOPIC_STATE_META[s.state].dot, s.state === 'locked' && 'opacity-60')} />
                ))}
              </div>
            </div>
          </button>
        );
      })}
      <Legend />
    </div>
  );
}

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted">
      {(Object.keys(TOPIC_STATE_META) as (keyof typeof TOPIC_STATE_META)[]).map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-sm', TOPIC_STATE_META[k].dot)} aria-hidden="true" />
          {TOPIC_STATE_META[k].label}
        </li>
      ))}
    </ul>
  );
}

// ── Skill tree (workspace) ──────────────────────────────────────────────

const TRACK_LABEL: Record<string, string> = { java: 'Java · from scratch' };

export function SkillTree({ domain, selected, onSelect }: { domain: Domain; selected?: string; onSelect: (topicId: string | undefined) => void }) {
  const { derived, state } = useStore();
  const { open } = useUI();
  // A domain can hold separate learning tracks (e.g. Java inside DSA): each gets its own section and tiers.
  const sections = useMemo(() => {
    const list = [...derived.stats.values()].filter((s) => s.topic.domain === domain);
    const byTrack = new Map<string, TopicStats[]>();
    for (const s of list) byTrack.set(s.topic.track ?? '', [...(byTrack.get(s.topic.track ?? '') ?? []), s]);
    return [...byTrack.entries()]
      .sort((a, b) => (a[0] === '' ? 1 : 0) - (b[0] === '' ? 1 : 0))
      .map(([track, items]) => {
        const m = new Map<number, TopicStats[]>();
        for (const s of items) m.set(s.topic.tier, [...(m.get(s.topic.tier) ?? []), s]);
        return { track, tiers: [...m.entries()].sort((a, b) => a[0] - b[0]) };
      });
  }, [derived.stats, domain]);
  const multi = sections.length > 1;
  const nameOf = (id: string) => state.topics.find((t) => t.id === id)?.name ?? '';

  return (
    <div className="flex flex-col gap-8">
      {sections.map(({ track, tiers }) => (
        <section key={track || 'main'} aria-label={track ? TRACK_LABEL[track] ?? track : DOMAIN_META[domain].label}>
          {multi && (
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className={cn('h-2 w-2 rotate-45 rounded-[2px]', track ? 'bg-ember' : 'bg-violet-soft')} aria-hidden="true" />
              {track ? TRACK_LABEL[track] ?? track : DOMAIN_META[domain].label}
            </h3>
          )}
          <ol className="relative flex flex-col gap-5">
            <span className="absolute bottom-3 left-[11px] top-3 w-px bg-gradient-to-b from-violet/50 via-line to-transparent" aria-hidden="true" />
            {tiers.map(([tier, list]) => (
              <li key={tier} className="relative pl-9">
                <span className="num absolute left-0 top-1 grid h-6 w-6 place-items-center rounded-full border border-line-strong bg-surface text-[10px] text-ink-muted" aria-hidden="true">
                  {tier + 1}
                </span>
                <p className="st-label mb-2">Tier {tier + 1}</p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((s) => {
                    const meta = TOPIC_STATE_META[s.state];
                    const active = selected === s.topic.id;
                    return (
                      <div key={s.topic.id} className={cn('group relative rounded-xl border bg-surface-2/50 transition-colors', meta.ring, active && 'bg-violet/10 ring-1 ring-violet-soft')}>
                        <button
                          onClick={() => onSelect(active ? undefined : s.topic.id)}
                          aria-pressed={active}
                          className="flex w-full flex-col gap-2 p-3 pr-9 text-left"
                          aria-label={`${s.topic.name}, ${meta.label}, ${s.mastery}% mastery${s.blockers.length ? `, needs ${s.blockers.map((b) => b.name).join(' and ')}` : ''}. ${active ? 'Clear filter' : 'Filter items'}`}
                        >
                          <span className="flex items-center gap-2">
                            {s.state === 'locked' ? <Lock size={12} className="text-ink-faint" aria-hidden="true" /> : <span className={cn('h-2 w-2 rounded-full', meta.dot)} aria-hidden="true" />}
                            <span className={cn('truncate text-sm font-medium', meta.text)}>{s.topic.name}</span>
                            <span className="num ml-auto text-xs text-ink-muted">{s.mastery}%</span>
                          </span>
                          <Bar value={s.mastery / 100} tone={s.state === 'mastered' ? 'arc' : s.state === 'locked' ? 'muted' : 'violet'} label={`${s.topic.name} mastery`} />
                          <span className="text-[11px] text-ink-muted">
                            {s.state === 'locked' && s.blockers.length
                              ? `Unlocks at 40% in ${s.blockers.map((b) => b.name).join(', ')}`
                              : `${s.solved}/${Math.max(s.items.length, s.topic.target)} learned${s.due ? ` · ${s.due} due` : ''}`}
                          </span>
                        </button>
                        <button
                          onClick={() => open({ type: 'topic', domain, topicId: s.topic.id })}
                          className="absolute right-2 top-2 rounded-md p-1.5 text-ink-faint opacity-0 hover:bg-surface-3 hover:text-ink focus:opacity-100 group-hover:opacity-100"
                          aria-label={`Edit topic ${s.topic.name}`}
                        >
                          <Pencil size={12} />
                        </button>
                        {s.topic.prerequisites.length > 0 && s.state !== 'locked' && <span className="sr-only">Requires {s.topic.prerequisites.map(nameOf).join(', ')}</span>}
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
