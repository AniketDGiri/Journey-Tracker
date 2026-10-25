import { useMemo, useState, type ReactNode } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Target, X } from 'lucide-react';
import type { DayKey, GoalPeriod, PracticeItem } from '../domain/types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { moveGoal, removeGoal, toggleSubItem } from '../engine/actions';
import { evaluateGoals, goalsForDay, goalsOfPeriod, goalsWithin, rollup, sortGoals, type GoalStatus, type GoalView } from '../engine/plan';
import { addDays, addMonths, daysBetween, endOfMonth, formatDay, monthYear, parseDayKey, shortWeekday, startOfMonth, startOfWeek } from '../lib/date';
import { cn } from '../lib/cn';
import { Badge, Bar, Button, Empty, Segmented } from './ui';
import { DomainTag } from './bits';

// ── Small pieces ────────────────────────────────────────────────────────

export function GoalStatusBadge({ status, on }: { status: GoalStatus; on?: DayKey }) {
  const { today } = useStore();
  if (status === 'done') return <Badge tone="arc">Done{on ? ` · ${formatDay(on, today)}` : ''}</Badge>;
  if (status === 'missed') return <Badge tone="ember">Not done</Badge>;
  return <Badge>Open</Badge>;
}

export function GoalWhen({ view }: { view: GoalView }) {
  const { today } = useStore();
  const { period, start } = view.goal;
  const text = period === 'day' ? formatDay(start, today) : period === 'week' ? `Week of ${formatDay(start)}` : monthYear(start);
  return <span className="text-xs text-ink-soft">{text}</span>;
}

export function PlanButton({ itemId, subItemId, label, className }: { itemId: string; subItemId?: string; label: string; className?: string }) {
  const { open } = useUI();
  const { state } = useStore();
  const planned = state.goals.some((g) => g.itemId === itemId && g.subItemId === subItemId);
  return (
    <button
      type="button"
      onClick={() => open({ type: 'plan', itemId, subItemId })}
      aria-label={`Add “${label}” to plan`}
      title={planned ? 'Planned — add another date' : 'Add to daily / weekly / monthly plan'}
      className={cn(
        'inline-grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors',
        planned ? 'text-violet-soft hover:bg-violet/15' : 'text-ink-faint hover:bg-surface-3 hover:text-ink',
        className,
      )}
    >
      <CalendarPlus size={14} aria-hidden="true" />
    </button>
  );
}

/** Item sheet: plan the item or any of its saved steps. */
export function PlanTargets({ item }: { item: PracticeItem }) {
  const subs = item.subItems ?? [];
  return (
    <section aria-label="Plan" className="rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink-soft">Plan it</p>
        <span className="flex items-center gap-1 text-[11px] text-ink-muted">
          Whole item <PlanButton itemId={item.id} label={item.title} />
        </span>
      </div>
      {subs.length > 0 && (
        <ul className="mt-1 flex flex-col">
          {subs.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 py-0.5">
              <span className={cn('min-w-0 flex-1 truncate text-sm', s.done ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>{s.title}</span>
              <PlanButton itemId={item.id} subItemId={s.id} label={s.title} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[11px] text-ink-muted">Add it to today, a date, a week or a month. New steps can be planned once saved.</p>
    </section>
  );
}

// ── Goal row ────────────────────────────────────────────────────────────

export function GoalRow({ view, compact }: { view: GoalView; compact?: boolean }) {
  const { act, today } = useStore();
  const { open } = useUI();
  const { goal, item, subItem, status } = view;
  const isSub = !!goal.subItemId;
  const done = status === 'done';

  return (
    <li className={cn('flex items-center gap-3', compact ? 'py-2' : 'py-2.5')}>
      {isSub && subItem && item ? (
        <input
          type="checkbox"
          checked={subItem.done}
          onChange={() => act((s, ctx) => toggleSubItem(s, item.id, subItem.id, ctx), { success: subItem.done ? undefined : `Done: ${subItem.title}`, silent: subItem.done })}
          aria-label={`Mark “${subItem.title}” ${subItem.done ? 'not done' : 'done'}`}
          className="h-4 w-4 shrink-0 cursor-pointer accent-violet"
        />
      ) : (
        <span
          className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', done ? 'border-arc-soft bg-arc/30' : status === 'missed' ? 'border-ember/70' : 'border-line-strong')}
          aria-hidden="true"
        >
          {done && <span className="h-1.5 w-1.5 rounded-full bg-arc-soft" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <button className="block max-w-full text-left" onClick={() => item && open({ type: 'item', itemId: item.id })} disabled={!item}>
          <span className={cn('block truncate text-sm', done ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>{view.title}</span>
        </button>
        <span className="flex items-center gap-2 text-[11px] text-ink-muted">
          {item && <DomainTag domain={item.domain} />}
          {view.parent && <span className="truncate">in {view.parent}</span>}
          {!compact && goal.period !== 'day' && <GoalWhen view={view} />}
        </span>
      </div>
      {done ? (
        <span className="num shrink-0 text-[11px] text-arc-soft">✓ {view.completedOn ? formatDay(view.completedOn, today) : ''}</span>
      ) : status === 'missed' ? (
        <Button size="sm" variant="secondary" onClick={() => act((s, ctx) => moveGoal(s, goal.id, 'day', today, ctx), { success: 'Moved to today' })}>
          Move to today
        </Button>
      ) : !isSub && item ? (
        <Button size="sm" variant="secondary" onClick={() => open({ type: 'log', domain: item.domain, itemId: item.id })}>
          Log
        </Button>
      ) : null}
      <div className="flex shrink-0">
        {!done && item && (
          <button className="rounded-md p-1.5 text-ink-faint hover:bg-surface-3 hover:text-ink" aria-label="Move to another date" title="Move" onClick={() => open({ type: 'plan', itemId: item.id, subItemId: goal.subItemId, goalId: goal.id })}>
            <CalendarPlus size={13} />
          </button>
        )}
        <button className="rounded-md p-1.5 text-ink-faint hover:bg-surface-3 hover:text-rose" aria-label="Remove from plan" title="Remove from plan" onClick={() => act((s) => removeGoal(s, goal.id), { success: 'Removed from plan' })}>
          <X size={13} />
        </button>
      </div>
    </li>
  );
}

function GoalList({ views, empty, compact }: { views: GoalView[]; empty?: ReactNode; compact?: boolean }) {
  if (!views.length) return empty ? <>{empty}</> : null;
  return (
    <ul className="flex flex-col divide-y divide-line/60">
      {sortGoals(views).map((v) => (
        <GoalRow key={v.goal.id} view={v} compact={compact} />
      ))}
    </ul>
  );
}

function Summary({ views, label }: { views: GoalView[]; label: string }) {
  const r = rollup(views);
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface-2/40 p-4 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div className="col-span-2 sm:col-span-1">
        <p className="st-label">{label}</p>
        <p className="num mt-1 text-2xl font-semibold">
          {r.done}
          <span className="text-sm font-normal text-ink-muted">/{r.total} achieved</span>
        </p>
        <Bar value={r.rate} tone="arc" className="mt-2" label={`${label} completion`} />
      </div>
      <div>
        <p className="st-label">Completion</p>
        <p className="num mt-1 text-lg font-semibold">{r.total ? `${Math.round(r.rate * 100)}%` : '—'}</p>
      </div>
      <div>
        <p className="st-label">Open</p>
        <p className="num mt-1 text-lg font-semibold">{r.open}</p>
      </div>
      <div>
        <p className="st-label">Not done</p>
        <p className={cn('num mt-1 text-lg font-semibold', r.missed ? 'text-ember-soft' : '')}>{r.missed}</p>
      </div>
    </div>
  );
}

// ── Planner (Quests page) ───────────────────────────────────────────────

export function Planner() {
  const { state, today } = useStore();
  const { navigate } = useUI();
  const [view, setView] = useState<GoalPeriod>('day');
  const [anchor, setAnchor] = useState<DayKey>(today);
  const all = useMemo(() => evaluateGoals(state, today), [state, today]);

  const shift = (n: number) => setAnchor((a) => (view === 'day' ? addDays(a, n) : view === 'week' ? addDays(a, 7 * n) : addMonths(a, n)));
  const ws = startOfWeek(anchor);
  const ms = startOfMonth(anchor);
  const me = endOfMonth(anchor);
  const title =
    view === 'day' ? `${shortWeekday(anchor)}, ${formatDay(anchor)}${anchor === today ? ' · Today' : ''}` : view === 'week' ? `${formatDay(ws)} – ${formatDay(addDays(ws, 6))}` : monthYear(anchor);
  const isCurrent = view === 'day' ? anchor === today : view === 'week' ? ws === startOfWeek(today) : ms === startOfMonth(today);

  const goToDay = (d: DayKey) => {
    setAnchor(d);
    setView('day');
  };

  const emptyHint = (
    <Empty icon={<Target size={20} />} title="Nothing planned here yet">
      Use the <CalendarPlus size={11} className="inline" aria-hidden="true" /> button beside any item or sub-item in{' '}
      <button className="underline underline-offset-2" onClick={() => navigate('dsa')}>DSA</button>,{' '}
      <button className="underline underline-offset-2" onClick={() => navigate('hld')}>HLD</button> or{' '}
      <button className="underline underline-offset-2" onClick={() => navigate('lld')}>LLD</button> to add it.
    </Empty>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Planner view"
          value={view}
          onChange={setView}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
        />
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
        {!isCurrent && (
          <Button variant="ghost" size="sm" onClick={() => setAnchor(today)}>
            Back to today
          </Button>
        )}
        {view === 'day' && <input type="date" className="st-input num ml-auto w-40" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} aria-label="Jump to date" />}
      </div>

      {view === 'day' && <DayView day={anchor} all={all} empty={emptyHint} />}
      {view === 'week' && <WeekView start={ws} all={all} empty={emptyHint} onDay={goToDay} />}
      {view === 'month' && <MonthView start={ms} end={me} all={all} empty={emptyHint} onDay={goToDay} />}
    </div>
  );
}

function DayView({ day, all, empty }: { day: DayKey; all: GoalView[]; empty: ReactNode }) {
  const views = goalsForDay(all, day);
  const dayGoals = views.filter((v) => v.goal.period === 'day');
  const longer = views.filter((v) => v.goal.period !== 'day' && v.status !== 'done');
  const achievedToday = all.filter((v) => v.completedOn === day && v.goal.period !== 'day');
  return (
    <div className="flex flex-col gap-4">
      <Summary views={dayGoals} label="Planned for this day" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <p className="st-label mb-1">Day goals</p>
          <GoalList views={dayGoals} empty={empty} />
        </section>
        <section>
          <p className="st-label mb-1">Open this week &amp; month</p>
          <GoalList views={longer} empty={<p className="py-2 text-xs text-ink-muted">No open weekly or monthly goals.</p>} />
          {achievedToday.length > 0 && (
            <>
              <p className="st-label mb-1 mt-4">Also achieved this day</p>
              <GoalList views={achievedToday} compact />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function WeekView({ start, all, empty, onDay }: { start: DayKey; all: GoalView[]; empty: ReactNode; onDay: (d: DayKey) => void }) {
  const { today } = useStore();
  const end = addDays(start, 6);
  const inside = goalsWithin(all, start, end);
  const weekGoals = goalsOfPeriod(all, 'week', start);
  const days = daysBetween(start, end);
  return (
    <div className="flex flex-col gap-4">
      <Summary views={inside} label="This week (day + week goals)" />
      <div className="grid grid-cols-7 gap-1.5" role="list" aria-label="Days of the week">
        {days.map((d) => {
          const r = rollup(goalsOfPeriod(all, 'day', d));
          return (
            <button
              key={d}
              role="listitem"
              onClick={() => onDay(d)}
              className={cn('flex flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 hover:border-violet/50', d === today ? 'border-violet/60 bg-violet/10' : 'border-line')}
              aria-label={`${shortWeekday(d)} ${formatDay(d)}: ${r.done} of ${r.total} done`}
            >
              <span className="text-[10px] uppercase text-ink-muted">{shortWeekday(d)}</span>
              <span className="num text-sm">{parseDayKey(d).getDate()}</span>
              <span className={cn('num text-[11px]', !r.total ? 'text-ink-faint' : r.done === r.total ? 'text-arc-soft' : r.missed ? 'text-ember-soft' : 'text-ink-soft')}>{r.total ? `${r.done}/${r.total}` : '—'}</span>
            </button>
          );
        })}
      </div>
      <section>
        <p className="st-label mb-1">Weekly goals</p>
        <GoalList views={weekGoals} empty={inside.length ? <p className="py-2 text-xs text-ink-muted">No weekly goals — day goals are shown above.</p> : empty} />
      </section>
    </div>
  );
}

function MonthView({ start, end, all, empty, onDay }: { start: DayKey; end: DayKey; all: GoalView[]; empty: ReactNode; onDay: (d: DayKey) => void }) {
  const { today } = useStore();
  const inside = goalsWithin(all, start, end);
  const monthGoals = goalsOfPeriod(all, 'month', start);
  const gridStart = startOfWeek(start);
  const gridEnd = addDays(startOfWeek(end), 6);
  const cells = daysBetween(gridStart, gridEnd);
  const weeks: DayKey[] = [];
  for (let w = gridStart; w <= end; w = addDays(w, 7)) weeks.push(w);
  return (
    <div className="flex flex-col gap-4">
      <Summary views={inside} label="This month (all goals)" />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-ink-faint" aria-hidden="true">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d) => {
              const inMonth = d >= start && d <= end;
              const r = rollup(goalsOfPeriod(all, 'day', d));
              return (
                <button
                  key={d}
                  disabled={!inMonth}
                  onClick={() => onDay(d)}
                  className={cn(
                    'flex h-12 flex-col items-center justify-center gap-0.5 rounded-md border text-xs sm:h-14',
                    !inMonth ? 'border-transparent text-ink-faint/40' : d === today ? 'border-violet/60 bg-violet/10' : 'border-line hover:border-violet/40',
                    inMonth && r.total > 0 && r.done === r.total && 'bg-arc/10',
                  )}
                  aria-label={inMonth ? `${formatDay(d)}: ${r.done} of ${r.total} done` : undefined}
                >
                  <span className="num">{parseDayKey(d).getDate()}</span>
                  {inMonth && r.total > 0 && (
                    <span className={cn('num text-[9px]', r.done === r.total ? 'text-arc-soft' : r.missed ? 'text-ember-soft' : 'text-ink-muted')}>
                      {r.done}/{r.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {weeks.map((w) => {
              const r = rollup(goalsWithin(all, w, addDays(w, 6)).filter((v) => v.windowStart >= start && v.windowEnd <= end));
              return (
                <li key={w} className="flex items-center gap-3 text-xs">
                  <span className="w-28 shrink-0 whitespace-nowrap text-ink-soft">Week of {formatDay(w)}</span>
                  <Bar value={r.rate} tone="arc" label={`Week of ${formatDay(w)} completion`} />
                  <span className="num w-12 text-right text-ink-muted">{r.total ? `${r.done}/${r.total}` : '—'}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <section>
          <p className="st-label mb-1">Monthly goals</p>
          <GoalList views={monthGoals} empty={inside.length ? <p className="py-2 text-xs text-ink-muted">No monthly goals.</p> : empty} />
        </section>
      </div>
    </div>
  );
}

// ── Dashboard: today's plan ─────────────────────────────────────────────

export function TodayPlan() {
  const { state, today } = useStore();
  const { navigate } = useUI();
  const all = useMemo(() => evaluateGoals(state, today), [state, today]);
  const views = goalsForDay(all, today);
  const missedRecent = all.filter((v) => v.status === 'missed' && v.goal.period === 'day' && v.windowEnd >= addDays(today, -3));
  const r = rollup(views);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="st-label">
          My plan · {r.done}/{r.total}
        </p>
        <button className="text-xs text-ink-muted hover:text-ink" onClick={() => navigate('quests')}>
          Planner
        </button>
      </div>
      {views.length || missedRecent.length ? (
        <ul className="flex flex-col divide-y divide-line/60">
          {sortGoals([...views, ...missedRecent])
            .slice(0, 6)
            .map((v) => (
              <GoalRow key={v.goal.id} view={v} compact />
            ))}
        </ul>
      ) : (
        <p className="py-2 text-xs text-ink-muted">
          Nothing planned for today. Use <CalendarPlus size={11} className="inline" aria-hidden="true" /> beside any item or sub-item to add it to today, a date, a week or a month.
        </p>
      )}
    </div>
  );
}
