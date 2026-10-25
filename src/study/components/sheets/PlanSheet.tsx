import { useMemo, useState } from 'react';
import { CalendarDays, Trash2 } from 'lucide-react';
import type { GoalPeriod } from '../../domain/types';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/ui';
import { addGoal, moveGoal, removeGoal } from '../../engine/actions';
import { evaluateGoals } from '../../engine/plan';
import { addDays, addMonths, formatDay, monthYear, startOfWeek } from '../../lib/date';
import { cn } from '../../lib/cn';
import { Button, Field, Modal } from '../ui';
import { GoalWhen, GoalStatusBadge } from '../planner';

interface Option {
  key: string;
  label: string;
  sub: string;
  period: GoalPeriod;
  day: string;
}

/** Add an item or sub-item to the plan: a day, a date, a week or a month. */
export function PlanSheet({ itemId, subItemId, goalId }: { itemId: string; subItemId?: string; goalId?: string }) {
  const { state, act, today } = useStore();
  const { close } = useUI();
  const item = state.items.find((i) => i.id === itemId);
  const sub = subItemId ? item?.subItems?.find((s) => s.id === subItemId) : undefined;
  const moving = goalId ? state.goals.find((g) => g.id === goalId) : undefined;

  const options: Option[] = useMemo(() => {
    const ws = startOfWeek(today);
    return [
      { key: 'today', label: 'Today', sub: formatDay(today), period: 'day', day: today },
      { key: 'tomorrow', label: 'Tomorrow', sub: formatDay(addDays(today, 1)), period: 'day', day: addDays(today, 1) },
      { key: 'week', label: 'This week', sub: `${formatDay(ws)} – ${formatDay(addDays(ws, 6))}`, period: 'week', day: today },
      { key: 'next-week', label: 'Next week', sub: `${formatDay(addDays(ws, 7))} – ${formatDay(addDays(ws, 13))}`, period: 'week', day: addDays(ws, 7) },
      { key: 'month', label: 'This month', sub: monthYear(today), period: 'month', day: today },
      { key: 'next-month', label: 'Next month', sub: monthYear(addMonths(today, 1)), period: 'month', day: addMonths(today, 1) },
    ];
  }, [today]);

  const [choice, setChoice] = useState<string>('today');
  const [date, setDate] = useState(addDays(today, 2));

  const existing = useMemo(
    () => evaluateGoals(state, today).filter((v) => v.goal.itemId === itemId && v.goal.subItemId === subItemId && v.goal.id !== goalId),
    [state, today, itemId, subItemId, goalId],
  );

  if (!item) {
    return (
      <Modal open onClose={close} title="Item not found">
        <p className="text-sm text-ink-muted">This item may have been deleted.</p>
      </Modal>
    );
  }

  const target = choice === 'date' ? { period: 'day' as GoalPeriod, day: date } : options.find((o) => o.key === choice)!;

  const save = () => {
    const ok = act(
      (s, ctx) => (moving ? moveGoal(s, moving.id, target.period, target.day, ctx) : addGoal(s, { itemId, subItemId, period: target.period, day: target.day }, ctx)),
      { success: moving ? 'Goal moved' : `Planned: ${sub?.title ?? item.title}` },
    );
    if (ok) close();
  };

  return (
    <Modal
      open
      onClose={close}
      title={moving ? 'Move goal' : 'Add to plan'}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={choice === 'date' && (!date || date < today)}>
            {moving ? 'Move' : 'Add to plan'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-lg border border-line bg-surface-2/50 px-3 py-2.5">
          <p className="text-sm font-medium">{sub?.title ?? item.title}</p>
          {sub && <p className="text-xs text-ink-muted">Sub-item of {item.title}</p>}
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-ink-soft">When will you do it?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Plan period">
            {[...options, { key: 'date', label: 'On a date', sub: 'Pick a day', period: 'day' as GoalPeriod, day: date }].map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={choice === o.key}
                onClick={() => setChoice(o.key)}
                className={cn(
                  'flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors',
                  choice === o.key ? 'border-violet bg-violet/10 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.5)]' : 'border-line-strong hover:border-violet/40',
                )}
              >
                <span className="text-sm font-medium">{o.label}</span>
                <span className="text-[11px] text-ink-muted">{o.sub}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {choice === 'date' && (
          <Field label="Date" htmlFor="plan-date">
            <input id="plan-date" type="date" className="st-input num w-48" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}

        <p className="flex items-start gap-2 text-[11px] text-ink-muted">
          <CalendarDays size={13} className="mt-px shrink-0" aria-hidden="true" />
          {sub
            ? 'Completes when you tick the sub-item.'
            : 'Completes when you log real work on this item in that window — a solve, attempt, revision, rubric step, ticked sub-item or linked session.'}
        </p>

        {existing.length > 0 && (
          <div>
            <p className="st-label mb-2">Already planned</p>
            <ul className="flex flex-col gap-1.5">
              {existing.map((v) => (
                <li key={v.goal.id} className="flex items-center gap-2 text-sm">
                  <GoalWhen view={v} />
                  <GoalStatusBadge status={v.status} />
                  <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" aria-label="Remove from plan" onClick={() => act((s) => removeGoal(s, v.goal.id), { success: 'Removed from plan' })}>
                    <Trash2 size={13} />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
