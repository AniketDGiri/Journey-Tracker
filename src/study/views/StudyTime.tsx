import { useMemo, useState } from 'react';
import { Clock, History, Plus, Timer, Trash2, X } from 'lucide-react';
import type { Domain, SessionOutcome, StudySession } from '../domain/types';
import { DOMAINS } from '../domain/types';
import { DOMAIN_META } from '../domain/catalog';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { deleteSession, finishSession } from '../engine/actions';
import { fmtMin } from '../engine/studytime';
import { addDays, daysBetween, formatDay, shortWeekday, startOfWeek } from '../lib/date';
import { cn } from '../lib/cn';
import { Bar, Button, Empty, Field, Panel, Ring, Segmented } from '../components/ui';
import { ItemPicker } from '../components/ItemPicker';
import { DomainTag } from '../components/bits';

/** Study-time tracking: log what you studied, totals against a daily goal, trends and the full session log. */

const DOMAIN_BAR: Record<Domain, string> = { dsa: 'bg-violet', hld: 'bg-arc', lld: 'bg-jade' };
const DOMAIN_DOT: Record<Domain, string> = { dsa: 'bg-violet-soft', hld: 'bg-arc-soft', lld: 'bg-jade' };
const OUTCOME_LABEL: Record<SessionOutcome, string> = { learned: 'Learned new', practiced: 'Practised', solved: 'Solved', revised: 'Revised' };

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

type DayTotals = Record<Domain, number> & { total: number };
const emptyDay = (): DayTotals => ({ dsa: 0, hld: 0, lld: 0, total: 0 });

// ── Log study time ──────────────────────────────────────────────────────

const QUICK: [number, string][] = [
  [30, '30m'],
  [60, '1h'],
  [90, '1h 30m'],
  [120, '2h'],
  [180, '3h'],
];

const OUTCOMES: { value: SessionOutcome; label: string }[] = [
  { value: 'learned', label: 'Learned new' },
  { value: 'practiced', label: 'Practised' },
  { value: 'solved', label: 'Solved' },
  { value: 'revised', label: 'Revised' },
];

/**
 * Records time already studied. It saves the same session the DSA / HLD / LLD
 * "Session" sheet does, so totals, XP, streaks and item time all stay in step.
 */
function LogTimeForm() {
  const { state, today, act } = useStore();
  const [date, setDate] = useState(today);
  const [domain, setDomain] = useState<Domain>('dsa');
  const [topicId, setTopicId] = useState('');
  const [itemId, setItemId] = useState<string>();
  const [pickItem, setPickItem] = useState(false);
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [outcome, setOutcome] = useState<SessionOutcome>('practiced');
  const [notes, setNotes] = useState('');

  const topics = useMemo(() => state.topics.filter((t) => t.domain === domain).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name)), [state.topics, domain]);
  const item = itemId ? state.items.find((i) => i.id === itemId) : undefined;
  const minutes = (Number(hours) || 0) * 60 + (Number(mins) || 0);
  const setDuration = (m: number) => {
    setHours(String(Math.floor(m / 60)));
    setMins(String(m % 60));
  };

  const save = () => {
    const topicName = state.topics.find((t) => t.id === (item?.topicId ?? topicId))?.name;
    const fb = act(
      (s, ctx) =>
        finishSession(
          s,
          {
            domain,
            itemId,
            topicId: item?.topicId ?? (topicId || undefined),
            durationMin: minutes,
            outcome,
            confidence: 0,
            hintsUsed: false,
            notes,
            date,
          },
          ctx,
        ).state,
      { success: `Logged ${fmtMin(minutes)}${item ? ` · ${item.title}` : topicName ? ` · ${topicName}` : ''}${date !== today ? ` on ${formatDay(date)}` : ''}` },
    );
    if (fb) {
      // Keep date, domain and topic: several entries for one day are common.
      setHours('');
      setMins('');
      setNotes('');
      setItemId(undefined);
    }
  };

  return (
    <Panel title="Log study time" className="relative flex h-full flex-col overflow-hidden" id="log-time">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_200px_at_100%_0%,rgba(139,92,246,0.12),transparent)]" aria-hidden="true" />
      <form
        className="relative flex flex-1 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Date" htmlFor="lt-date">
            <input id="lt-date" type="date" className="st-input num w-44" max={today} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </Field>
          <Field label="Domain">
            <Segmented
              label="Domain"
              value={domain}
              onChange={(d) => {
                setDomain(d);
                setTopicId('');
                setItemId(undefined);
                setPickItem(false);
              }}
              options={DOMAINS.map((d) => ({ value: d, label: DOMAIN_META[d].short }))}
            />
          </Field>
        </div>

        <Field label="Topic" htmlFor="lt-topic">
          <select id="lt-topic" className="st-input" value={item?.topicId ?? topicId} disabled={!!item} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">General practice (no specific topic)</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        {item ? (
          <div className="flex items-center gap-2 rounded-lg border border-violet/40 bg-violet/10 px-3 py-2 text-sm">
            <span className="st-label shrink-0 text-violet-soft">Item</span>
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            <Button size="sm" variant="ghost" onClick={() => setPickItem(true)}>
              Change
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setItemId(undefined)} aria-label="Unlink item">
              <X size={13} />
            </Button>
          </div>
        ) : !pickItem ? (
          <button type="button" className="self-start text-xs text-ink-muted underline-offset-4 hover:text-violet-soft hover:underline" onClick={() => setPickItem(true)}>
            + Link to a specific item (optional) — the time is added to it
          </button>
        ) : null}
        {pickItem && (
          <div className="rounded-lg border border-line p-3">
            <ItemPicker
              domain={domain}
              value={itemId}
              onChange={(id) => {
                setItemId(id);
                if (id) setPickItem(false);
              }}
              label="Find an item"
            />
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setPickItem(false)}>
              Cancel
            </Button>
          </div>
        )}

        <Field label="Time studied">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-ink-muted">
              <input className="st-input num w-16" inputMode="numeric" aria-label="Hours" placeholder="0" value={hours} onChange={(e) => setHours(e.target.value.replace(/\D/g, '').slice(0, 2))} />h
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink-muted">
              <input className="st-input num w-16" inputMode="numeric" aria-label="Minutes" placeholder="0" value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, '').slice(0, 3))} />m
            </label>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
            {QUICK.map(([m, l]) => (
              <Button key={m} size="sm" variant={minutes === m ? 'primary' : 'subtle'} onClick={() => setDuration(m)}>
                {l}
              </Button>
            ))}
          </div>
        </Field>

        <Field label="What did you do?">
          <Segmented label="What did you do" size="sm" value={outcome} onChange={setOutcome} options={OUTCOMES} />
        </Field>
        <Field label="Notes (optional)" htmlFor="lt-notes" hint={item ? 'Also appended to the item’s notes.' : undefined}>
          <input id="lt-notes" className="st-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. sliding window problems, consistent hashing chapter" />
        </Field>

        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button type="submit" variant="primary" disabled={!(minutes > 0)}>
            <Plus size={14} aria-hidden="true" /> Add {minutes > 0 ? fmtMin(minutes) : 'time'}
          </Button>
          <p className="text-xs text-ink-muted">
            {date === today ? 'Counts toward today.' : `Counts toward ${formatDay(date)}.`} Same as logging from a DSA / HLD / LLD session.
          </p>
        </div>
      </form>
    </Panel>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export function StudyTime() {
  const { state, today, act } = useStore();
  const { open } = useUI();
  const [range, setRange] = useState<'14' | '30'>('14');
  const [shown, setShown] = useState(25);
  const [confirmId, setConfirmId] = useState<string>();
  const goal = state.settings.targets.minutesPerDay;

  const byDay = useMemo(() => {
    const m = new Map<string, DayTotals>();
    for (const s of state.sessions) {
      const d = m.get(s.date) ?? emptyDay();
      d[s.domain] += s.durationMin;
      d.total += s.durationMin;
      m.set(s.date, d);
    }
    return m;
  }, [state.sessions]);

  const sum = (from: string, to = today) => {
    let t = 0;
    for (const [d, v] of byDay) if (d >= from && d <= to) t += v.total;
    return t;
  };
  const todayMin = byDay.get(today)?.total ?? 0;
  const weekMin = sum(startOfWeek(today));
  const monthMin = sum(`${today.slice(0, 7)}-01`);
  const allMin = sum('0000-01-01');

  const n = Number(range);
  const days = daysBetween(addDays(today, -(n - 1)), today);
  const series = days.map((d) => ({ day: d, ...(byDay.get(d) ?? emptyDay()) }));
  const rangeMin = series.reduce((a, d) => a + d.total, 0);
  const studied = series.filter((d) => d.total > 0).length;
  const metGoal = series.filter((d) => d.total >= goal).length;
  const best = series.reduce((b, d) => (d.total > b.total ? d : b), series[0]);
  const max = Math.max(goal, ...series.map((d) => d.total), 1);

  const rangeStart = days[0];
  const rangeSessions = useMemo(() => state.sessions.filter((s) => s.date >= rangeStart), [state.sessions, rangeStart]);
  const domainSplit = DOMAINS.map((d) => ({ d, min: rangeSessions.filter((s) => s.domain === d).reduce((a, s) => a + s.durationMin, 0) }));
  const focus = useMemo(() => {
    const m = new Map<string, { label: string; domain: Domain; min: number }>();
    for (const s of rangeSessions) {
      const item = s.itemId ? state.items.find((i) => i.id === s.itemId) : undefined;
      const topic = state.topics.find((t) => t.id === (item?.topicId ?? s.topicId));
      const key = item ? `i:${item.id}` : topic ? `t:${topic.id}` : `d:${s.domain}`;
      const label = item?.title ?? topic?.name ?? `General practice · ${DOMAIN_META[s.domain].short}`;
      const e = m.get(key) ?? { label, domain: s.domain, min: 0 };
      e.min += s.durationMin;
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.min - a.min).slice(0, 6);
  }, [rangeSessions, state.items, state.topics]);

  const log = useMemo(() => [...state.sessions].sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1)), [state.sessions]);
  const visible = log.slice(0, shown);
  const groups: { date: string; list: StudySession[] }[] = [];
  for (const s of visible) {
    const g = groups[groups.length - 1];
    if (g?.date === s.date) g.list.push(s);
    else groups.push({ date: s.date, list: [s] });
  }

  const remove = (id: string) => {
    act((s) => deleteSession(s, id), { success: 'Session removed from the log' });
    setConfirmId(undefined);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <LogTimeForm />
      </div>

      <div className="flex flex-col gap-4 lg:col-span-7">
      <Panel title="Today">
        <div className="flex flex-wrap items-center gap-6">
          <Ring value={todayMin / goal} size={104} stroke={5} tone={todayMin >= goal ? 'jade' : 'violet'} label={`${fmtMin(todayMin)} of ${fmtMin(goal)} goal`}>
            <span className="num text-xl font-semibold leading-none">{fmtMin(todayMin)}</span>
            <span className="mt-1 text-[10px] text-ink-muted">of {fmtMin(goal)}</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">
              {todayMin >= goal ? 'Daily goal met' : todayMin > 0 ? `${fmtMin(goal - todayMin)} to your daily goal` : 'Nothing logged yet today'}
            </p>
            <p className="mt-1 text-xs text-ink-muted">Goal: {fmtMin(goal)} a day · change it in Settings → Daily targets.</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
              {(
                [
                  ['This week', weekMin],
                  ['This month', monthMin],
                  ['All time', allMin],
                ] as const
              ).map(([l, v]) => (
                <div key={l}>
                  <dt className="st-label">{l}</dt>
                  <dd className="num mt-1 text-lg font-semibold">{fmtMin(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Panel>

      <Panel
        title="Daily study time"
       
        action={<Segmented label="Range" size="sm" value={range} onChange={setRange} options={[{ value: '14', label: '14 days' }, { value: '30', label: '30 days' }]} />}
      >
        <div className="relative flex h-48 items-end gap-1" role="img" aria-label={`Study time per day, last ${n} days: ${fmtMin(rangeMin)} in total`}>
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-muted/50" style={{ bottom: `${(goal / max) * 100}%` }} aria-hidden="true">
            <span className="absolute -top-4 right-0 text-[10px] text-ink-muted">goal {fmtMin(goal)}</span>
          </div>
          {series.map((d) => (
            <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${formatDay(d.day)} · ${fmtMin(d.total)}${d.total ? ` (DSA ${fmtMin(d.dsa)}, HLD ${fmtMin(d.hld)}, LLD ${fmtMin(d.lld)})` : ''}`}>
              <div className={cn('flex w-full flex-col-reverse overflow-hidden rounded-[4px]', d.total === 0 && 'bg-surface-3/70')} style={{ height: d.total ? `${(d.total / max) * 100}%` : '3px' }}>
                {DOMAINS.map((dm) => d[dm] > 0 && <div key={dm} className={DOMAIN_BAR[dm]} style={{ height: `${(d[dm] / d.total) * 100}%` }} />)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1" aria-hidden="true">
          {series.map((d, i) => (
            <span key={d.day} className={cn('num min-w-0 flex-1 text-center text-[9px]', d.day === today ? 'text-violet-soft' : 'text-ink-faint')}>
              {n === 14 || i % 3 === 0 || d.day === today ? (n === 14 ? `${shortWeekday(d.day)[0]}${d.day.slice(8)}` : d.day.slice(8)) : ''}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-ink-muted">
          <span>
            Total <span className="num text-ink">{fmtMin(rangeMin)}</span>
          </span>
          <span>
            Avg / study day <span className="num text-ink">{studied ? fmtMin(rangeMin / studied) : '—'}</span>
          </span>
          <span>
            Days studied <span className="num text-ink">{studied}/{n}</span>
          </span>
          <span>
            Goal met <span className="num text-ink">{metGoal}</span>
          </span>
          {best?.total > 0 && (
            <span>
              Best <span className="num text-ink">{fmtMin(best.total)}</span> · {formatDay(best.day)}
            </span>
          )}
          <span className="ml-auto flex items-center gap-3">
            {DOMAINS.map((d) => (
              <span key={d} className="flex items-center gap-1">
                <span className={cn('h-2 w-2 rounded-sm', DOMAIN_DOT[d])} aria-hidden="true" /> {DOMAIN_META[d].short}
              </span>
            ))}
          </span>
        </div>
      </Panel>
      </div>

      <Panel title={`Where the time went · ${n} days`} className="lg:col-span-4">
        {rangeMin === 0 ? (
          <Empty icon={<Clock size={18} />} title="No sessions in this range">
            Time you log here or from a DSA/HLD/LLD session shows up in this breakdown.
          </Empty>
        ) : (
          <div className="flex flex-col gap-5">
            <ul className="flex flex-col gap-3">
              {domainSplit.map(({ d, min }) => (
                <li key={d}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-ink-soft">{DOMAIN_META[d].label}</span>
                    <span className="num text-ink-muted">
                      {fmtMin(min)} · {Math.round((min / rangeMin) * 100)}%
                    </span>
                  </div>
                  <Bar value={min / rangeMin} tone={d === 'hld' ? 'arc' : d === 'lld' ? 'jade' : 'violet'} label={`${DOMAIN_META[d].label} share`} />
                </li>
              ))}
            </ul>
            <div>
              <p className="st-label mb-2">Top focus</p>
              <ul className="flex flex-col gap-1.5">
                {focus.map((f) => (
                  <li key={f.label} className="flex items-center gap-2 text-sm">
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOMAIN_DOT[f.domain])} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{f.label}</span>
                    <span className="num text-xs text-ink-muted">{fmtMin(f.min)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title={`Session log · ${log.length}`}
        className="lg:col-span-8"
        action={
          <Button size="sm" variant="secondary" onClick={() => { document.getElementById('log-time')?.scrollIntoView({ behavior: 'smooth' }); document.getElementById('lt-date')?.focus({ preventScroll: true }); }}>
            <Plus size={13} aria-hidden="true" /> Log time
          </Button>
        }
      >
        {log.length === 0 ? (
          <Empty icon={<History size={18} />} title="No sessions yet">
            Use the form above to add the time you’ve studied — any past date works too.
          </Empty>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((g) => {
              const total = byDay.get(g.date)?.total ?? 0;
              return (
                <section key={g.date} aria-label={formatDay(g.date, today)}>
                  <header className="mb-1.5 flex items-baseline justify-between border-b border-line pb-1.5">
                    <h3 className="text-sm font-medium">
                      {formatDay(g.date, today)} <span className="text-xs font-normal text-ink-muted">· {shortWeekday(g.date)}</span>
                    </h3>
                    <span className={cn('num text-xs', total >= goal ? 'text-jade' : 'text-ink-muted')}>{fmtMin(total)}</span>
                  </header>
                  <ul className="flex flex-col">
                    {g.list.map((s) => {
                      const item = s.itemId ? state.items.find((i) => i.id === s.itemId) : undefined;
                      const topic = state.topics.find((t) => t.id === (item?.topicId ?? s.topicId));
                      return (
                        <li key={s.id} className="group flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm sm:flex-nowrap">
                          <span className="num w-[136px] shrink-0 whitespace-nowrap text-xs text-ink-muted">
                            {hhmm(s.startedAt)}–{hhmm(s.endedAt)}
                          </span>
                          <DomainTag domain={s.domain} />
                          <span className="min-w-0 flex-1">
                            {item ? (
                              <button className="truncate text-left text-ink hover:text-violet-soft" onClick={() => open({ type: 'item', itemId: item.id })}>
                                {item.title}
                              </button>
                            ) : (
                              <span className="truncate text-ink-soft">{topic?.name ?? 'General practice'}</span>
                            )}
                            {s.notes && <span className="block truncate text-[11px] text-ink-muted">{s.notes}</span>}
                          </span>
                          <span className="text-xs text-ink-muted">{OUTCOME_LABEL[s.outcome]}</span>
                          <span className="num w-14 text-right font-medium">{fmtMin(s.durationMin)}</span>
                          {confirmId === s.id ? (
                            <span className="flex items-center gap-1">
                              <Button size="sm" variant="danger" onClick={() => remove(s.id)}>
                                Delete
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmId(undefined)}>
                                Keep
                              </Button>
                            </span>
                          ) : (
                            <button
                              className="rounded p-1.5 text-ink-faint opacity-60 hover:bg-surface-3 hover:text-rose focus:opacity-100 group-hover:opacity-100"
                              onClick={() => setConfirmId(s.id)}
                              aria-label={`Delete ${fmtMin(s.durationMin)} session`}
                              title="Delete — removes the time, keeps any XP already earned"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
            {log.length > shown && (
              <Button variant="ghost" size="sm" className="self-center" onClick={() => setShown((x) => x + 25)}>
                <Timer size={13} aria-hidden="true" /> Show older sessions
              </Button>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
