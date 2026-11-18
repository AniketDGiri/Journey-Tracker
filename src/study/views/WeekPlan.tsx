import { useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, CalendarPlus, Check, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import type { DayKey, Domain, GoalPeriod } from '../domain/types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { dailyQuests, monthlyChallenges, requiredOf, weeklyChallenges, type Quest } from '../engine/quests';
import { evaluateGoals, goalsForDay, goalsOfPeriod, goalsWithin, sortGoals, type GoalView } from '../engine/plan';
import { addGoal, removeGoal } from '../engine/actions';
import { isLearned } from '../engine/revision';
import { addDays, addMonths, daysBetween, endOfMonth, formatDay, isDayKey, monthYear, parseDayKey, shortWeekday, startOfMonth, startOfWeek, weekday } from '../lib/date';
import { cn } from '../lib/cn';
import { Badge, Bar, Button, Modal, Panel, Segmented } from '../components/ui';
import { GoalRow } from '../components/planner';
import { ItemPicker } from '../components/ItemPicker';
import { DomainTag } from '../components/bits';
import { SystemTag, SystemWindow } from '../components/system';

/**
 * Week Plan: decide ahead which items you'll do on which day, and see your revisions.
 * The quest engine reads this plan — each planned item is a daily quest for its day
 * (plus planned revisions); weekly and monthly quests count the goals planned inside them.
 */

type View = 'day' | 'week' | 'month';
const VIEW_KEY = 'ascend.plan.view';
const DAY_KEY = 'ascend.plan.day';

/** Opens Week Plan on one day (used by the Daily quests tab). */
export function openPlanDay(day: DayKey) {
  try {
    window.sessionStorage.setItem(DAY_KEY, day);
    window.localStorage.setItem(VIEW_KEY, 'day');
  } catch {
    /* opens on today instead */
  }
  window.location.hash = '/plan';
}

function readView(): View {
  try {
    const v = window.localStorage.getItem(VIEW_KEY);
    return v === 'day' || v === 'week' || v === 'month' ? v : 'week';
  } catch {
    return 'week';
  }
}

function takeDay(today: DayKey): DayKey {
  try {
    const d = window.sessionStorage.getItem(DAY_KEY);
    window.sessionStorage.removeItem(DAY_KEY);
    return isDayKey(d) ? d : today;
  } catch {
    return today;
  }
}

// Component tokens: one dot colour per study area, built from the semantic palette.
const DOMAIN_DOT: Record<Domain, string> = { dsa: 'bg-violet-soft', hld: 'bg-arc-soft', lld: 'bg-jade' };
const DOMAINS: { id: Domain; label: string }[] = [
  { id: 'dsa', label: 'DSA & Java' },
  { id: 'hld', label: 'HLD' },
  { id: 'lld', label: 'LLD' },
];

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

// ── Page ────────────────────────────────────────────────────────────────

export function WeekPlan() {
  const { today } = useStore();
  const [view, setViewState] = useState<View>(readView);
  const [anchor, setAnchor] = useState<DayKey>(() => takeDay(today));
  const [adding, setAdding] = useState<{ period: GoalPeriod; day: DayKey } | null>(null);

  const setView = (v: View) => {
    setViewState(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* not remembered */
    }
  };
  const openDay = (d: DayKey) => {
    setAnchor(d);
    setView('day');
  };
  const openWeek = (d: DayKey) => {
    setAnchor(d);
    setView('week');
  };

  const ws = startOfWeek(anchor);
  const ms = startOfMonth(anchor);
  const shift = (n: number) => setAnchor((a) => (view === 'day' ? addDays(a, n) : view === 'week' ? addDays(a, 7 * n) : addMonths(a, n)));
  const title =
    view === 'day' ? `${shortWeekday(anchor)}, ${formatDay(anchor)}` : view === 'week' ? `${formatDay(ws)} – ${formatDay(addDays(ws, 6))}` : monthYear(anchor);
  const quick: { label: string; to: DayKey; on: boolean }[] =
    view === 'day'
      ? [
          { label: 'Today', to: today, on: anchor === today },
          { label: 'Tomorrow', to: addDays(today, 1), on: anchor === addDays(today, 1) },
        ]
      : view === 'week'
        ? [
            { label: 'This week', to: today, on: ws === startOfWeek(today) },
            { label: 'Next week', to: addDays(startOfWeek(today), 7), on: ws === addDays(startOfWeek(today), 7) },
          ]
        : [
            { label: 'This month', to: today, on: ms === startOfMonth(today) },
            { label: 'Next month', to: addMonths(startOfMonth(today), 1), on: ms === addMonths(startOfMonth(today), 1) },
          ];

  return (
    <div className="flex flex-col gap-5">
      <SystemWindow label="Week plan">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <SystemTag>WEEK PLAN</SystemTag>
            <h2 className="mt-2 text-lg font-semibold">Decide it before the week starts</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Plan the items you’ll do each day. Every planned item becomes that day’s quest, alongside your planned revisions — weekly and monthly quests follow the same plan.
            </p>
          </div>
          <Segmented
            label="Plan view"
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label={`Previous ${view}`} onClick={() => shift(-1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="min-w-[150px] text-center text-sm font-medium" aria-live="polite">
              {title}
            </span>
            <Button variant="ghost" size="icon" aria-label={`Next ${view}`} onClick={() => shift(1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
          {quick.map((q) => (
            <Button key={q.label} size="sm" variant={q.on ? 'secondary' : 'ghost'} aria-pressed={q.on} onClick={() => setAnchor(q.to)}>
              {q.label}
            </Button>
          ))}
          {view === 'day' && (
            <input type="date" className="st-input num ml-auto h-8 w-40 py-1 text-xs" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} aria-label="Jump to date" />
          )}
        </div>
      </SystemWindow>

      {view === 'day' && <DayView day={anchor} onAdd={(period, day) => setAdding({ period, day })} />}
      {view === 'week' && <WeekView start={ws} onDay={openDay} onAdd={(period, day) => setAdding({ period, day })} />}
      {view === 'month' && <MonthView start={ms} onDay={openDay} onWeek={openWeek} onAdd={(period, day) => setAdding({ period, day })} />}

      {adding && <AddGoalModal period={adding.period} day={adding.day} onClose={() => setAdding(null)} />}
    </div>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────

const revisionsOn = (items: ReturnType<typeof useStore>['state']['items'], day: DayKey) => items.filter((it) => isLearned(it) && it.review.nextReviewAt === day);

function AddButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-xs text-ink-muted transition-colors hover:border-violet/50 hover:text-ink"
    >
      <CalendarPlus size={13} aria-hidden="true" /> {children}
    </button>
  );
}

/** A compact planned item inside a day card: status dot, title, remove. */
function MiniGoal({ view }: { view: GoalView }) {
  const { act } = useStore();
  const { open } = useUI();
  const done = view.status === 'done';
  return (
    <li className="group flex items-center gap-2 py-1">
      <span
        className={cn('h-2 w-2 shrink-0 rounded-full', done ? 'bg-jade' : view.status === 'missed' ? 'bg-ember' : view.item ? DOMAIN_DOT[view.item.domain] : 'bg-ink-faint')}
        aria-hidden="true"
      />
      <button
        type="button"
        className={cn('line-clamp-2 min-w-0 flex-1 break-words text-left text-xs', done ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}
        title={view.parent ? `${view.title} · in ${view.parent}` : view.title}
        onClick={() => view.item && open({ type: 'item', itemId: view.item.id })}
      >
        {view.title}
      </button>
      {!done && (
        <button
          type="button"
          className="rounded p-0.5 text-ink-faint opacity-60 hover:text-rose group-hover:opacity-100"
          aria-label={`Remove “${view.title}” from plan`}
          onClick={() => act((s) => removeGoal(s, view.goal.id), { success: 'Removed from plan' })}
        >
          <X size={12} />
        </button>
      )}
    </li>
  );
}

/** What a period's quests will ask, as they stand right now. */
function QuestPreview({ title, quests, note }: { title: string; quests: Quest[]; note: string }) {
  const { navigate } = useUI();
  const req = requiredOf(quests);
  return (
    <Panel
      title={title}
      action={
        <Button variant="link" size="xs" onClick={() => navigate('quests')}>
          Quests <ArrowRight size={12} aria-hidden="true" />
        </Button>
      }
    >
      {quests.length ? (
        <ul className="flex flex-col divide-y divide-line/60">
          {quests.map((q) => (
            <li key={q.ref} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm', q.complete ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>
                  {q.title} {q.bonus && <Badge tone="ember">Bonus</Badge>}
                </p>
                <Bar value={q.progress / q.target} tone={q.complete ? 'jade' : 'arc'} className="mt-1.5 max-w-[220px]" label={`${q.title} progress`} />
              </div>
              <span className="num shrink-0 text-[11px] text-ink-muted">
                {q.progress}/{q.target}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-xs text-ink-muted">Nothing planned yet.</p>
      )}
      <p className="mt-3 text-[11px] text-ink-muted">
        {plural(req.length, 'required quest')}. {note}
      </p>
    </Panel>
  );
}

// ── Week ────────────────────────────────────────────────────────────────

function DayCard({ day, all, onOpen, onAdd }: { day: DayKey; all: GoalView[]; onOpen: (d: DayKey) => void; onAdd: (p: GoalPeriod, d: DayKey) => void }) {
  const { state, today } = useStore();
  const past = day < today;
  const rest = state.settings.restDays.includes(weekday(day));
  const goals = sortGoals(goalsOfPeriod(all, 'day', day));
  const revs = revisionsOn(state.items, day).length;
  const quests = requiredOf(dailyQuests(state, day));
  const done = quests.filter((q) => q.complete).length;
  return (
    <article
      className={cn(
        'flex min-w-0 flex-col gap-2.5 rounded-xl border bg-surface p-3',
        day === today ? 'border-violet/60 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.25)]' : 'border-line',
        past && 'opacity-75',
      )}
      aria-label={`${shortWeekday(day)} ${formatDay(day)}`}
    >
      <header className="flex items-start justify-between gap-2">
        <button type="button" className="text-left" onClick={() => onOpen(day)} title="Open this day">
          <span className="st-label block">{shortWeekday(day)}</span>
          <span className="num text-sm font-semibold hover:text-violet-soft">{formatDay(day)}</span>
        </button>
        <span className="flex flex-wrap justify-end gap-1">
          {day === today && <Badge tone="violet">Today</Badge>}
          {rest && <Badge>Rest</Badge>}
        </span>
      </header>
      {revs > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <RotateCcw size={12} className="text-arc-soft" aria-hidden="true" /> {plural(revs, 'revision')}
        </p>
      )}
      {goals.length > 0 && (
        <ul className="flex flex-col" aria-label="Planned items">
          {goals.map((v) => (
            <MiniGoal key={v.goal.id} view={v} />
          ))}
        </ul>
      )}
      {!past && <AddButton onClick={() => onAdd('day', day)}>Plan an item</AddButton>}
      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-line/70 pt-2 text-[11px] text-ink-muted">
        <span>{quests.length ? plural(quests.length, 'quest') : 'No quests'}</span>
        {day <= today && quests.length > 0 && <span className={cn('num', done === quests.length ? 'text-jade' : 'text-ink-soft')}>{done}/{quests.length}</span>}
      </footer>
    </article>
  );
}

/** A revision on the agenda: still planned for `day`, or already done on it. */
function RevisionRow({ itemId, title, domain, done }: { itemId: string; title: string; domain: Domain; done: boolean }) {
  const { open } = useUI();
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', done ? 'border-jade/60 bg-jade/15 text-jade' : 'border-arc-soft/60 text-arc-soft')}
        aria-hidden="true"
      >
        {done ? <Check size={10} strokeWidth={3} /> : <RotateCcw size={9} />}
      </span>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => open({ type: 'item', itemId })}>
        <span className={cn('block truncate text-sm', done ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>{title}</span>
        <span className="flex items-center gap-2 text-[11px] text-ink-muted">
          <DomainTag domain={domain} /> Revision{done ? ' · done' : ''}
        </span>
      </button>
    </li>
  );
}

/**
 * Everything planned for the week in one list: goals for any day of the week,
 * then each day's planned items and revisions (revisions already done show as done).
 */
function WeekAgenda({
  start,
  days,
  all,
  weekGoals,
  onDay,
  onAdd,
}: {
  start: DayKey;
  days: DayKey[];
  all: GoalView[];
  weekGoals: GoalView[];
  onDay: (d: DayKey) => void;
  onAdd: (p: GoalPeriod, d: DayKey) => void;
}) {
  const { state, today } = useStore();
  const items = useMemo(() => new Map(state.items.map((i) => [i.id, i])), [state.items]);
  const perDay = days.map((d) => {
    const goals = sortGoals(goalsOfPeriod(all, 'day', d));
    // Done that day (from the log), plus still planned for it; an item counts once.
    const reviewed = [...new Set(state.activity.filter((a) => a.type === 'review' && a.date === d && a.itemId).map((a) => a.itemId!))];
    const planned = revisionsOn(state.items, d).map((i) => i.id).filter((id) => !reviewed.includes(id));
    const revs = [...planned.map((id) => ({ id, done: false })), ...reviewed.map((id) => ({ id, done: true }))].filter((r) => items.has(r.id));
    return { day: d, goals, revs };
  });
  const goalsAll = [...weekGoals, ...perDay.flatMap((p) => p.goals)];
  const revsAll = perDay.flatMap((p) => p.revs);
  const done = goalsAll.filter((g) => g.status === 'done').length + revsAll.filter((r) => r.done).length;
  const total = goalsAll.length + revsAll.length;
  const open = addDays(start, 6) >= today;

  return (
    <Panel title={`Planned this week · ${total}`}>
      <div className="mb-4 flex items-center gap-3">
        <Bar value={total ? done / total : 0} tone="jade" label="Week plan done" />
        <span className="num shrink-0 text-[11px] text-ink-muted">
          {done}/{total} done · {plural(goalsAll.length, 'item')} · {plural(revsAll.length, 'revision')}
        </span>
      </div>

      <section aria-label="Anytime this week">
        <p className="st-label">Anytime this week</p>
        <p className="mb-1 text-[11px] text-ink-muted">Finish on whichever day fits.</p>
        {weekGoals.length > 0 && (
          <ul className="flex flex-col divide-y divide-line/60">
            {sortGoals(weekGoals).map((v) => (
              <GoalRow key={v.goal.id} view={v} compact />
            ))}
          </ul>
        )}
        {open && (
          <div className="mt-2">
            <AddButton onClick={() => onAdd('week', start)}>Plan an item for this week</AddButton>
          </div>
        )}
      </section>

      {perDay.map(({ day, goals, revs }) => (
        <section key={day} aria-label={formatDay(day)} className="mt-5 border-t border-line/70 pt-4">
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="text-left hover:text-violet-soft" onClick={() => onDay(day)} title="Open this day">
              <span className="st-label">{shortWeekday(day)}</span> <span className="num text-sm font-medium">{formatDay(day)}</span>
              {day === today && (
                <Badge tone="violet" className="ml-2">
                  Today
                </Badge>
              )}
            </button>
          </div>
          {goals.length || revs.length ? (
            <ul className="mt-1 flex flex-col divide-y divide-line/60">
              {goals.map((v) => (
                <GoalRow key={v.goal.id} view={v} compact />
              ))}
              {revs.map((r) => {
                const it = items.get(r.id)!;
                return <RevisionRow key={r.id} itemId={it.id} title={it.title} domain={it.domain} done={r.done} />;
              })}
            </ul>
          ) : (
            <p className="mt-1 py-1 text-xs text-ink-muted">Nothing planned{day >= today ? ' yet' : ''}.</p>
          )}
          {day >= today && (
            <button type="button" className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink" onClick={() => onAdd('day', day)}>
              <CalendarPlus size={12} aria-hidden="true" /> Plan an item for {shortWeekday(day)}
            </button>
          )}
        </section>
      ))}
    </Panel>
  );
}

function WeekView({ start, onDay, onAdd }: { start: DayKey; onDay: (d: DayKey) => void; onAdd: (p: GoalPeriod, d: DayKey) => void }) {
  const { state, today } = useStore();
  const all = useMemo(() => evaluateGoals(state, today), [state, today]);
  const days = daysBetween(start, addDays(start, 6));
  const end = days[6];
  const weekGoals = goalsOfPeriod(all, 'week', start);
  const inside = goalsWithin(all, start, end);
  const revs = days.reduce((n, d) => n + revisionsOn(state.items, d).length, 0);
  // Judged as of today for the current week, as of its first day for a future one, as of its end for a past one.
  const asOf = today < start ? start : today > end ? end : today;
  const weekly = useMemo(() => weeklyChallenges(state, asOf), [state, asOf]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-surface-2/40 px-4 py-3 text-xs text-ink-soft">
        {DOMAINS.map((d) => (
          <span key={d.id} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', DOMAIN_DOT[d.id])} aria-hidden="true" />
            {d.label} <span className="num text-ink-muted">· {plural(inside.filter((v) => v.item?.domain === d.id).length, 'item')}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <RotateCcw size={12} className="text-arc-soft" aria-hidden="true" /> <span className="num">{plural(revs, 'revision')}</span>
        </span>
        <span className="num sm:ml-auto">{plural(inside.length, 'goal')} planned</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((d) => (
          <DayCard key={d} day={d} all={all} onOpen={onDay} onAdd={onAdd} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <WeekAgenda start={start} days={days} all={all} weekGoals={weekGoals} onDay={onDay} onAdd={onAdd} />
        <QuestPreview title="Weekly quests" quests={weekly} note="Everything planned this week adds an “achieve what you planned” quest; the DSA target follows the DSA problems you plan." />
      </div>
    </div>
  );
}

// ── Month ───────────────────────────────────────────────────────────────

function MonthView({ start, onDay, onWeek, onAdd }: { start: DayKey; onDay: (d: DayKey) => void; onWeek: (d: DayKey) => void; onAdd: (p: GoalPeriod, d: DayKey) => void }) {
  const { state, today } = useStore();
  const all = useMemo(() => evaluateGoals(state, today), [state, today]);
  const end = endOfMonth(start);
  const cells = daysBetween(startOfWeek(start), addDays(startOfWeek(end), 6));
  const weeks: DayKey[] = [];
  for (let w = startOfWeek(start); w <= end; w = addDays(w, 7)) weeks.push(w);
  const monthGoals = goalsOfPeriod(all, 'month', start);
  const asOf = today < start ? start : today > end ? end : today;
  const monthly = useMemo(() => monthlyChallenges(state, asOf), [state, asOf]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={monthYear(start)}>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-ink-faint" aria-hidden="true">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d) => {
              const inside = d >= start && d <= end;
              if (!inside) return <span key={d} aria-hidden="true" />;
              const dayGoals = goalsOfPeriod(all, 'day', d);
              const n = dayGoals.length;
              const areas = DOMAINS.filter((x) => dayGoals.some((v) => v.item?.domain === x.id));
              const revs = revisionsOn(state.items, d).length;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDay(d)}
                  aria-label={`${formatDay(d)}: ${plural(n, 'planned item')}, ${plural(revs, 'revision')}`}
                  className={cn(
                    'flex min-h-[3.5rem] flex-col items-center gap-1 rounded-md border px-0.5 py-1.5 text-xs transition-colors sm:min-h-[4.25rem]',
                    d === today ? 'border-violet/60 bg-violet/10' : 'border-line hover:border-violet/40',
                    d < today && 'opacity-60',
                  )}
                >
                  <span className="num">{parseDayKey(d).getDate()}</span>
                  <span className="flex gap-0.5" aria-hidden="true">
                    {areas.map((x) => (
                      <span key={x.id} className={cn('h-1.5 w-1.5 rounded-full', DOMAIN_DOT[x.id])} />
                    ))}
                  </span>
                  {(n > 0 || revs > 0) && (
                    <span className="num flex items-center gap-1 text-[9px] text-ink-muted" aria-hidden="true">
                      {n > 0 && <span className="text-violet-soft">{n}●</span>}
                      {revs > 0 && <span className="text-arc-soft">{revs}↻</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
            {DOMAINS.map((x) => (
              <span key={x.id} className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', DOMAIN_DOT[x.id])} aria-hidden="true" /> {x.label} ·{' '}
                <span className="num">{goalsWithin(all, start, end).filter((v) => v.item?.domain === x.id).length}</span>
              </span>
            ))}
            <span>
              <span className="text-violet-soft">●</span> planned items · <span className="text-arc-soft">↻</span> revisions
            </span>
          </p>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Weeks">
            <ul className="flex flex-col divide-y divide-line/60">
              {weeks.map((w) => {
                const goals = goalsWithin(all, w, addDays(w, 6));
                const done = goals.filter((g) => g.status === 'done').length;
                return (
                  <li key={w}>
                    <button type="button" className="flex w-full items-center gap-3 py-2 text-left text-xs hover:text-ink" onClick={() => onWeek(w)}>
                      <span className="w-28 shrink-0 text-ink-soft">Week of {formatDay(w)}</span>
                      <Bar value={goals.length ? done / goals.length : 0} tone="arc" label={`Week of ${formatDay(w)} goals done`} />
                      <span className="num w-16 shrink-0 text-right text-ink-muted">{goals.length ? `${done}/${goals.length}` : '—'}</span>
                      <ChevronRight size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel title={`Month goals · ${monthGoals.length}`}>
            {monthGoals.length > 0 && (
              <ul className="mb-3 flex flex-col divide-y divide-line/60">
                {sortGoals(monthGoals).map((v) => (
                  <GoalRow key={v.goal.id} view={v} compact />
                ))}
              </ul>
            )}
            {end >= today && <AddButton onClick={() => onAdd('month', start)}>Plan an item for this month</AddButton>}
          </Panel>
        </div>
      </div>
      <QuestPreview title="Monthly quests" quests={monthly} note="The planned-goals target is the number of goals you plan inside this month; the DSA target follows the DSA problems you plan." />
    </div>
  );
}

// ── Day ─────────────────────────────────────────────────────────────────

function DayView({ day, onAdd }: { day: DayKey; onAdd: (p: GoalPeriod, d: DayKey) => void }) {
  const { state, today } = useStore();
  const { open } = useUI();
  const all = useMemo(() => evaluateGoals(state, today), [state, today]);
  const views = goalsForDay(all, day);
  const dayGoals = sortGoals(views.filter((v) => v.goal.period === 'day'));
  const longer = sortGoals(views.filter((v) => v.goal.period !== 'day' && v.status !== 'done'));
  const revs = revisionsOn(state.items, day);
  const quests = dailyQuests(state, day);
  const rest = state.settings.restDays.includes(weekday(day));
  const past = day < today;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="flex flex-col gap-5 lg:col-span-7">
        <Panel title={`Planned items · ${dayGoals.length}`}>
          {dayGoals.length > 0 ? (
            <ul className="mb-3 flex flex-col divide-y divide-line/60">
              {dayGoals.map((v) => (
                <GoalRow key={v.goal.id} view={v} compact />
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-xs text-ink-muted">Nothing planned yet. Each item you plan here becomes one of this day’s quests.</p>
          )}
          {!past && <AddButton onClick={() => onAdd('day', day)}>Plan an item for this day</AddButton>}
          {rest && <p className="mt-2 text-[11px] text-ink-muted">Rest day: unfinished quests cost nothing.</p>}
          {longer.length > 0 && (
            <>
              <p className="st-label mb-1 mt-5">Still open this week &amp; month</p>
              <ul className="flex flex-col divide-y divide-line/60">
                {longer.map((v) => (
                  <GoalRow key={v.goal.id} view={v} compact />
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>
      <div className="flex flex-col gap-5 lg:col-span-5">
        <QuestPreview title="Daily quests for this day" quests={quests} note="One quest per planned item, plus this day’s planned revisions." />
        <Panel title={`Revisions · ${revs.length}`}>
          {revs.length ? (
            <ul className="flex flex-col divide-y divide-line/60">
              {revs.map((it) => (
                <li key={it.id}>
                  <button type="button" className="flex w-full items-center gap-2 py-2 text-left text-sm hover:text-violet-soft" onClick={() => open({ type: 'item', itemId: it.id })}>
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', DOMAIN_DOT[it.domain])} aria-hidden="true" />
                    <span className="truncate">{it.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">No revisions planned for this day. Plan them from Quests → Revision plan.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ── Add an item to the plan ─────────────────────────────────────────────

function AddGoalModal({ period, day, onClose }: { period: GoalPeriod; day: DayKey; onClose: () => void }) {
  const { state, act, today } = useStore();
  const [domain, setDomain] = useState<'all' | Domain>('all');
  const [itemId, setItemId] = useState<string | undefined>();
  const [subId, setSubId] = useState<string>('');
  const item = itemId ? state.items.find((i) => i.id === itemId) : undefined;
  const steps = (item?.subItems ?? []).filter((s) => !s.done);
  const label = period === 'day' ? formatDay(day, today) : period === 'week' ? `week of ${formatDay(startOfWeek(day))}` : monthYear(day);

  const add = () => {
    if (!item) return;
    const ok = act((s, ctx) => addGoal(s, { itemId: item.id, subItemId: subId || undefined, period, day }, ctx), {
      success: `Planned for ${label}: ${steps.find((x) => x.id === subId)?.title ?? item.title}`,
    });
    if (ok) {
      // Stay open so a whole day or week can be planned in one go.
      setItemId(undefined);
      setSubId('');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Plan for ${label}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
          <Button variant="primary" onClick={add} disabled={!item}>
            Add to plan
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented
          label="Filter by area"
          size="sm"
          value={domain}
          onChange={(v) => {
            setDomain(v);
            setItemId(undefined);
          }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'dsa', label: 'DSA & Java' },
            { value: 'hld', label: 'HLD' },
            { value: 'lld', label: 'LLD' },
          ]}
        />
        <ItemPicker
          domain={domain === 'all' ? undefined : domain}
          value={itemId}
          onChange={(id) => {
            setItemId(id);
            setSubId('');
          }}
          label="What will you work on?"
        />
        {item && steps.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-ink-soft">Whole item or one step?</legend>
            <div className="flex flex-col gap-1">
              {[{ id: '', title: 'The whole item' }, ...steps].map((s) => (
                <label key={s.id || 'whole'} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
                  <input type="radio" name="plan-step" className="accent-violet" checked={subId === s.id} onChange={() => setSubId(s.id)} />
                  <span className="truncate">{s.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <p className="text-[11px] text-ink-muted">
          {subId ? 'Completes when you tick the step.' : 'Completes when you log real work on it — a solve, attempt, revision, rubric step, ticked step or linked session.'}
        </p>
      </div>
    </Modal>
  );
}
