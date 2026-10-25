import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Dumbbell, Plus, Trash2, Utensils } from 'lucide-react';
import type { DayKey } from '../domain/types';
import { HABITS, NUTRITION_PLAN, type Meal, type MealOption } from '../domain/nutrition';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { addExtra, dayTotals, getDay, history, logMeal, logWeight, removeExtra, setNutritionTargets, summary, toggleHabit, weightTrend } from '../engine/nutrition';
import { addDays, formatDay, shortWeekday } from '../lib/date';
import { cn } from '../lib/cn';
import { Badge, Bar, Button, Checkbox, Empty, Field, Panel, Segmented } from '../components/ui';

const plan = NUTRITION_PLAN;

function Meter({ label, value, target, unit, mode }: { label: string; value: number; target: number; unit: string; mode: 'ceiling' | 'floor' }) {
  const over = mode === 'ceiling' && value > target;
  const met = mode === 'floor' ? value >= target : value <= target;
  const left = target - value;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="st-label">{label}</p>
        <p className="num text-[11px] text-ink-muted">
          {mode === 'ceiling' ? (over ? `${-left} ${unit} over` : `${left} ${unit} left`) : met ? 'Goal hit' : `${left} ${unit} to go`}
        </p>
      </div>
      <p className="num mt-1 text-3xl font-semibold">
        {value}
        <span className="text-sm font-normal text-ink-muted">
          {' '}
          / {target} {unit}
        </span>
      </p>
      <Bar value={value / target} tone={over ? 'ember' : mode === 'floor' && met ? 'jade' : mode === 'floor' ? 'violet' : 'arc'} className="mt-2 h-2" label={`${label} ${value} of ${target}`} />
    </div>
  );
}

function OptionDetail({ option }: { option: MealOption }) {
  return (
    <div className="mt-3 rounded-lg border border-line bg-void/40 p-3">
      <p className="text-sm font-medium">{option.title}</p>
      <div className="-mx-3 mt-2 overflow-x-auto">
        <table className="w-full min-w-[300px] text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-ink-muted">
              <th scope="col" className="py-1 pl-3 font-medium">Food</th>
              <th scope="col" className="py-1 font-medium">Amount</th>
              <th scope="col" className="py-1 text-right font-medium">Cals</th>
              <th scope="col" className="py-1 pr-3 text-right font-medium">Protein</th>
            </tr>
          </thead>
          <tbody>
            {option.foods.map((f, i) => (
              <tr key={i} className="border-t border-line/60">
                <td className="py-1.5 pl-3 text-ink-soft">
                  {f.food}
                  {f.role && <span className="block text-[9px] uppercase tracking-wider text-ink-faint">{f.role}</span>}
                </td>
                <td className="py-1.5 text-ink-muted">{f.amount ?? ''}</td>
                <td className="num py-1.5 text-right">{f.cal ?? ''}</td>
                <td className="num py-1.5 pr-3 text-right">{f.protein != null ? `${f.protein} g` : ''}</td>
              </tr>
            ))}
            <tr className="border-t border-line font-medium">
              <td className="py-1.5 pl-3">Total</td>
              <td />
              <td className="num py-1.5 text-right">{option.totalCal}</td>
              <td className="num py-1.5 pr-3 text-right">{option.totalProtein} g</td>
            </tr>
          </tbody>
        </table>
      </div>
      {option.description && <p className="mt-3 whitespace-pre-line text-xs text-ink-soft">{option.description}</p>}
      {option.tips.length > 0 && (
        <>
          <p className="st-label mt-3">{option.tipsTitle ?? 'Meal tips'}</p>
          <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-xs leading-relaxed text-ink-soft marker:text-ink-faint">
            {option.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function MealCard({ meal, date }: { meal: Meal; date: DayKey }) {
  const { state, act, today } = useStore();
  const { navigate } = useUI();
  const entry = getDay(state, date).meals[meal.id];
  const [view, setView] = useState<string>(entry?.optionId ?? meal.options[0].id);
  const [open, setOpen] = useState(false);
  const viewed = meal.options.find((o) => o.id === view) ?? meal.options[0];
  const future = date > today;

  const log = (o: MealOption) => act((s, ctx) => logMeal(s, date, meal.id, { optionId: o.id, cal: o.totalCal, protein: o.totalProtein }, ctx), { success: `${meal.name} logged · ${o.totalCal} kcal, ${o.totalProtein} g protein` });
  const adjust = (field: 'cal' | 'protein', v: string) => {
    if (!entry) return;
    const n = Number(v);
    if (!Number.isFinite(n) || n === entry[field]) return;
    act((s, ctx) => logMeal(s, date, meal.id, { ...entry, [field]: n }, ctx), { silent: true });
  };

  return (
    <li className={cn('rounded-xl border p-4', entry ? 'border-arc/40 bg-arc/[0.04]' : 'border-line')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{meal.name}</p>
          <p className="text-[11px] text-ink-muted">
            Under {meal.targetCal} Cals, {meal.targetProtein} gms Protein
          </p>
        </div>
        {meal.options.length > 1 && (
          <Segmented label={`${meal.name} option`} size="sm" value={view} onChange={setView} options={meal.options.map((o) => ({ value: o.id, label: o.label.replace('Option ', 'Opt ') }))} />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{viewed.title}</span>
        <span className="num text-xs text-ink-muted">
          {viewed.totalCal} kcal · {viewed.totalProtein} g
        </span>
        {entry?.optionId === viewed.id ? (
          <Badge tone="arc">Eaten</Badge>
        ) : (
          <Button size="sm" variant={entry ? 'secondary' : 'primary'} onClick={() => log(viewed)} disabled={future}>
            {entry ? 'Switch to this' : 'I ate this'}
          </Button>
        )}
      </div>

      {entry && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3 text-xs">
          <span className="text-ink-muted">Actual:</span>
          <label className="flex items-center gap-1">
            <span className="sr-only">{meal.name} calories</span>
            <input key={`c${entry.cal}`} className="st-input num h-8 w-20 py-1 text-xs" inputMode="numeric" defaultValue={entry.cal} onBlur={(e) => adjust('cal', e.target.value)} />
            <span className="text-ink-muted">kcal</span>
          </label>
          <label className="flex items-center gap-1">
            <span className="sr-only">{meal.name} protein</span>
            <input key={`p${entry.protein}`} className="st-input num h-8 w-16 py-1 text-xs" inputMode="numeric" defaultValue={entry.protein} onBlur={(e) => adjust('protein', e.target.value)} />
            <span className="text-ink-muted">g protein</span>
          </label>
          <button className="ml-auto text-ink-faint hover:text-rose" onClick={() => act((s, ctx) => logMeal(s, date, meal.id, null, ctx), { silent: true })}>
            Clear
          </button>
        </div>
      )}

      <button className="mt-3 flex items-center gap-1 text-xs text-violet-soft hover:underline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" /> {open ? 'Hide' : 'Foods, portions & tips'}
      </button>
      {open && <OptionDetail option={viewed} />}

      {meal.after && (
        <button onClick={() => navigate('workout')} className="mt-3 flex w-full items-center gap-2 rounded-lg border border-violet/30 bg-violet/10 px-3 py-2 text-left text-xs text-violet-soft hover:bg-violet/15">
          <Dumbbell size={13} aria-hidden="true" /> {meal.after}
        </button>
      )}
    </li>
  );
}

export function Nutrition() {
  const { state, act, today } = useStore();
  const [date, setDate] = useState<DayKey>(today);
  const [food, setFood] = useState({ name: '', cal: '', protein: '' });
  const [weight, setWeight] = useState('');
  const [editTargets, setEditTargets] = useState(false);
  const [budget, setBudget] = useState(String(state.nutrition.calorieBudget));
  const [goal, setGoal] = useState(String(state.nutrition.proteinGoal));

  const totals = dayTotals(state, date);
  const day = getDay(state, date);
  const hist = useMemo(() => history(state, today, 14), [state, today]);
  const sum = summary(hist);
  const trend = useMemo(() => weightTrend(state), [state]);
  const latest = trend[trend.length - 1];
  const maxCal = Math.max(state.nutrition.calorieBudget * 1.25, ...hist.map((h) => h.cal));
  const { calorieBudget, proteinGoal } = state.nutrition;

  return (
    <div className="flex flex-col gap-4">
      {/* Plan header */}
      <section className="st-panel flex flex-col gap-5 p-5 lg:flex-row lg:items-start">
        <div className="flex items-start gap-4 lg:flex-1">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-jade/40 bg-jade/10 text-jade">
            <Utensils size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">Nutrition Plan</h2>
              <Badge tone="jade">{plan.goal}</Badge>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{plan.focus}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:w-[460px]">
          <div>
            <dt className="st-label">Calorie budget</dt>
            <dd className="num mt-1 text-lg font-semibold">{calorieBudget}</dd>
          </div>
          <div>
            <dt className="st-label">Protein goal</dt>
            <dd className="num mt-1 text-lg font-semibold">{proteinGoal} g</dd>
          </div>
          <div>
            <dt className="st-label">Maintenance</dt>
            <dd className="num mt-1 text-lg font-semibold">~{plan.maintenance}</dd>
          </div>
          <div>
            <dt className="st-label">Start weight</dt>
            <dd className="num mt-1 text-lg font-semibold">{plan.currentWeight} kg</dd>
          </div>
          <div className="col-span-2 sm:col-span-4">
            {editTargets ? (
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Calories" htmlFor="nt-cal">
                  <input id="nt-cal" className="st-input num h-8 w-24 py-1" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))} />
                </Field>
                <Field label="Protein (g)" htmlFor="nt-pro">
                  <input id="nt-pro" className="st-input num h-8 w-20 py-1" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/\D/g, ''))} />
                </Field>
                <Button size="sm" variant="primary" onClick={() => act((s) => setNutritionTargets(s, Number(budget), Number(goal)), { success: 'Targets updated' }) && setEditTargets(false)}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditTargets(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button className="text-[11px] text-violet-soft hover:underline" onClick={() => setEditTargets(true)}>
                Coach updated your targets? Edit them
              </button>
            )}
          </div>
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Day */}
        <div className="flex flex-col gap-4 lg:col-span-8">
          <Panel
            title="Daily log"
            action={
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => setDate((d) => addDays(d, -1))}>
                  <ChevronLeft size={16} />
                </Button>
                <span className="min-w-[110px] text-center text-sm font-medium" aria-live="polite">
                  {shortWeekday(date)}, {formatDay(date, today)}
                </span>
                <Button variant="ghost" size="icon" aria-label="Next day" onClick={() => setDate((d) => addDays(d, 1))} disabled={date >= today}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            }
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <Meter label="Calories" value={totals.cal} target={calorieBudget} unit="kcal" mode="ceiling" />
              <Meter label="Protein" value={totals.protein} target={proteinGoal} unit="g" mode="floor" />
            </div>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {plan.meals.map((m) => (
                <MealCard key={`${m.id}-${date}`} meal={m} date={date} />
              ))}
            </ul>

            <div className="mt-5 border-t border-line pt-4">
              <p className="st-label mb-2">Anything else today</p>
              {day.extras.length > 0 && (
                <ul className="mb-3 flex flex-col divide-y divide-line/60">
                  {day.extras.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-1.5 text-sm">
                      <span className="flex-1 truncate">{e.name}</span>
                      <span className="num text-xs text-ink-muted">
                        {e.cal} kcal · {e.protein} g
                      </span>
                      <button className="rounded p-1 text-ink-faint hover:text-rose" aria-label={`Remove ${e.name}`} onClick={() => act((s) => removeExtra(s, date, e.id), { silent: true })}>
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (act((s, ctx) => addExtra(s, date, { name: food.name, cal: Number(food.cal) || 0, protein: Number(food.protein) || 0 }, ctx), { silent: true })) setFood({ name: '', cal: '', protein: '' });
                }}
              >
                <input className="st-input h-9 min-w-[160px] flex-1" placeholder="Food, e.g. Green tea" value={food.name} onChange={(e) => setFood({ ...food, name: e.target.value })} aria-label="Food name" />
                <input className="st-input num h-9 w-24" inputMode="numeric" placeholder="kcal" value={food.cal} onChange={(e) => setFood({ ...food, cal: e.target.value.replace(/\D/g, '') })} aria-label="Calories" />
                <input className="st-input num h-9 w-24" inputMode="numeric" placeholder="protein g" value={food.protein} onChange={(e) => setFood({ ...food, protein: e.target.value.replace(/\D/g, '') })} aria-label="Protein grams" />
                <Button type="submit" size="sm" variant="secondary" className="h-9" disabled={!food.name.trim() || date > today}>
                  <Plus size={13} aria-hidden="true" /> Add
                </Button>
              </form>
            </div>
          </Panel>
        </div>

        {/* Side column */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          <Panel title="Daily habits">
            <div className="flex flex-col">
              {HABITS.map((h) => (
                <Checkbox key={h.id} checked={!!day.habits[h.id]} onChange={(v) => act((s, ctx) => toggleHabit(s, date, h.id, 'habits', v, ctx), { silent: true })} label={h.label} />
              ))}
            </div>
            <p className="st-label mb-1 mt-4">Supplements</p>
            <div className="flex flex-col">
              {plan.supplements.map((sp) => (
                <Checkbox key={sp.id} checked={!!day.supplements[sp.id]} onChange={(v) => act((s, ctx) => toggleHabit(s, date, sp.id, 'supplements', v, ctx), { silent: true })} label={sp.label} />
              ))}
            </div>
          </Panel>

          <Panel title="Body weight">
            <div className="flex items-baseline gap-3">
              <p className="num text-3xl font-semibold">{latest ? latest.kg : plan.currentWeight}</p>
              <p className="text-sm text-ink-muted">kg</p>
              {latest && (
                <p className="num ml-auto text-xs text-ink-muted">
                  7-entry avg {latest.avg} · {latest.avg - plan.currentWeight >= 0 ? '+' : ''}
                  {(latest.avg - plan.currentWeight).toFixed(1)} vs start
                </p>
              )}
            </div>
            {trend.length > 1 && (
              <div className="mt-3 flex h-14 items-end gap-1" role="img" aria-label={`Weight entries: ${trend.map((t) => t.kg).join(', ')} kg`}>
                {(() => {
                  const vals = trend.slice(-20);
                  const lo = Math.min(...vals.map((v) => v.kg)) - 0.3;
                  const hi = Math.max(...vals.map((v) => v.kg)) + 0.3;
                  return vals.map((v) => (
                    <span key={v.date} title={`${formatDay(v.date)}: ${v.kg} kg`} className="flex-1 rounded-t-[2px] bg-jade/70" style={{ height: `${((v.kg - lo) / (hi - lo)) * 100}%` }} />
                  ));
                })()}
              </div>
            )}
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (act((s, ctx) => logWeight(s, date, Number(weight), ctx), { success: `Weight logged for ${formatDay(date, today)}` })) setWeight('');
              }}
            >
              <input className="st-input num h-9" inputMode="decimal" placeholder={`Weight for ${formatDay(date, today).toLowerCase()} (kg)`} value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} aria-label="Body weight in kg" />
              <Button type="submit" size="sm" variant="secondary" className="h-9" disabled={!weight}>
                Log
              </Button>
            </form>
            <p className="mt-2 text-[11px] text-ink-muted">Weigh in at the same time of day. The average matters more than any single reading.</p>
          </Panel>
        </div>
      </div>

      {/* History */}
      <Panel title="Last 14 days">
        <dl className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="st-label">Days logged</dt>
            <dd className="num mt-1 text-lg font-semibold">{sum.loggedDays}/14</dd>
          </div>
          <div>
            <dt className="st-label">Within budget</dt>
            <dd className="num mt-1 text-lg font-semibold">{sum.withinBudget}</dd>
          </div>
          <div>
            <dt className="st-label">Protein goal hit</dt>
            <dd className="num mt-1 text-lg font-semibold">{sum.proteinHit}</dd>
          </div>
          <div>
            <dt className="st-label">Avg (logged days)</dt>
            <dd className="num mt-1 text-lg font-semibold">
              {sum.loggedDays ? `${sum.avgCal} kcal · ${sum.avgProtein} g` : '—'}
            </dd>
          </div>
        </dl>
        {sum.loggedDays ? (
          <div className="grid gap-6 md:grid-cols-2">
            <figure>
              <figcaption className="st-label mb-2">Calories vs budget ({calorieBudget})</figcaption>
              <div className="relative flex h-32 items-end gap-1.5 border-b border-line" role="img" aria-label={`Daily calories: ${hist.map((h) => (h.logged ? h.cal : 'not logged')).join(', ')}`}>
                <span className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-faint" style={{ bottom: `${(calorieBudget / maxCal) * 100}%` }} aria-hidden="true" />
                {hist.map((h) => (
                  <button key={h.date} onClick={() => setDate(h.date)} title={`${formatDay(h.date)}: ${h.logged ? `${h.cal} kcal` : 'not logged'}`} className="flex h-full flex-1 flex-col justify-end" aria-label={`Open ${formatDay(h.date)}`}>
                    <span className={cn('w-full rounded-t-[3px]', !h.logged ? 'bg-surface-3' : h.withinBudget ? 'bg-arc' : 'bg-ember', h.date === date && 'ring-1 ring-ink-soft')} style={{ height: h.logged ? `${(h.cal / maxCal) * 100}%` : '3px' }} />
                  </button>
                ))}
              </div>
            </figure>
            <figure>
              <figcaption className="st-label mb-2">Protein vs goal ({proteinGoal} g)</figcaption>
              <div className="relative flex h-32 items-end gap-1.5 border-b border-line" role="img" aria-label={`Daily protein: ${hist.map((h) => (h.logged ? `${h.protein} g` : 'not logged')).join(', ')}`}>
                <span className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-faint" style={{ bottom: `${(proteinGoal / Math.max(proteinGoal * 1.3, ...hist.map((x) => x.protein))) * 100}%` }} aria-hidden="true" />
                {hist.map((h) => (
                  <button key={h.date} onClick={() => setDate(h.date)} title={`${formatDay(h.date)}: ${h.logged ? `${h.protein} g` : 'not logged'}`} className="flex h-full flex-1 flex-col justify-end" aria-label={`Open ${formatDay(h.date)}`}>
                    <span className={cn('w-full rounded-t-[3px]', !h.logged ? 'bg-surface-3' : h.proteinHit ? 'bg-jade' : 'bg-violet-deep', h.date === date && 'ring-1 ring-ink-soft')} style={{ height: h.logged ? `${(h.protein / Math.max(proteinGoal * 1.3, ...hist.map((x) => x.protein))) * 100}%` : '3px' }} />
                  </button>
                ))}
              </div>
            </figure>
          </div>
        ) : (
          <Empty icon={<Utensils size={20} />} title="Nothing logged yet">
            Tap “I ate this” on a meal above — it takes one click per meal.
          </Empty>
        )}
        <p className="mt-3 text-[11px] text-ink-muted">Dashed line = target. Blue/green bars met the target; amber went over budget. Click a bar to open that day.</p>
      </Panel>

      {/* Coach notes */}
      <Panel title="Coach notes">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="st-label mb-2">Some important nutrition tips</p>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-soft marker:text-violet-soft">
              {plan.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="st-label mb-2">Note</p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-soft marker:text-ink-faint">
                {plan.note.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="st-label mb-2">Supplements recommended</p>
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-ink-soft marker:text-ink-faint">
                {plan.supplements.map((s) => (
                  <li key={s.id}>{s.label}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
