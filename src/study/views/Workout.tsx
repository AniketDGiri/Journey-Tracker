import { useMemo, useState } from 'react';
import { Dumbbell, Moon, Play, Trash2, Video } from 'lucide-react';
import { PHASES } from '../domain/fitness';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { deleteWorkoutLog, exerciseHistory, getPhase, lastPerformance, nextWorkout, overloadHint, phaseProgress, setActivePhase, setPhaseStart, weekRange, weekSchedule, type SlotStatus } from '../engine/fitness';
import { formatDay, shortWeekday, parseDayKey } from '../lib/date';
import { cn } from '../lib/cn';
import { Badge, Bar, Button, Empty, Panel, Segmented } from '../components/ui';

const SLOT: Record<SlotStatus, { label: string; cls: string }> = {
  done: { label: 'Done', cls: 'border-arc/50 bg-arc/10 text-arc-soft' },
  today: { label: 'Today', cls: 'border-violet bg-violet/10 text-violet-soft shadow-glow' },
  upcoming: { label: 'Planned', cls: 'border-line-strong text-ink-soft' },
  open: { label: 'Still open', cls: 'border-ember/50 text-ember-soft' },
  rest: { label: 'Rest', cls: 'border-dashed border-line text-ink-faint' },
  'rest-active': { label: 'Trained', cls: 'border-arc/40 text-arc-soft' },
};

const fmtW = (w: number) => (w > 0 ? `${w} kg` : 'BW');

export function Workout() {
  const { state, today, act } = useStore();
  const { open } = useUI();
  const phase = getPhase(state.fitness.activePhaseId) ?? PHASES[0];
  const prog = phaseProgress(state, phase, today);
  const [week, setWeek] = useState<number>(prog.week);
  const [startInput, setStartInput] = useState(prog.start ?? today);
  const [showNotes, setShowNotes] = useState(false);
  const shownWeek = Math.min(week, phase.weeks - 1);

  const schedule = prog.start ? weekSchedule(state, phase, prog.start, shownWeek, today) : [];
  const next = prog.start ? nextWorkout(state, phase, prog.start, prog.week) : phase.workouts[0];
  const weekDoneCount = schedule.filter((s) => s.status === 'done').length;
  const thisWeekDone = prog.start ? weekSchedule(state, phase, prog.start, prog.week, today).filter((s) => s.status === 'done').length : 0;
  const nameOf = (id: string) => phase.workouts.find((w) => w.id === id)?.code ?? id;

  const exercises = useMemo(() => {
    const seen = new Map<string, string>();
    for (const w of phase.workouts) for (const e of w.exercises) if (!seen.has(e.id)) seen.set(e.id, e.name);
    return [...seen.entries()].map(([id, name]) => ({ id, name, history: exerciseHistory(state, id) }));
  }, [phase, state]);

  const logs = useMemo(() => [...state.fitness.logs].filter((l) => l.phaseId === phase.id).sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at)), [state.fitness.logs, phase.id]);

  return (
    <div className="flex flex-col gap-4">
      {/* Phase header */}
      <section className="st-panel flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
        <div className="flex items-start gap-4 lg:flex-1">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-violet/40 bg-violet/10 text-violet-soft">
            <Dumbbell size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{phase.name}</h2>
              {prog.finished ? <Badge tone="arc">Complete</Badge> : prog.started ? <Badge tone="violet">Week {prog.week + 1} of {phase.weeks}</Badge> : <Badge>Not started</Badge>}
            </div>
            <p className="mt-1 text-sm text-ink-muted">{phase.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Segmented label="Phase" size="sm" value={phase.id} onChange={(id) => act((s) => setActivePhase(s, id), { silent: true })} options={PHASES.map((p) => ({ value: p.id, label: p.name }))} />
              <span className="text-[11px] text-ink-faint">Phase-1 and Phase-2 will appear here once added.</span>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-5 lg:w-[380px]">
          <div>
            <dt className="st-label">Sessions</dt>
            <dd className="num mt-1 text-lg font-semibold">
              {prog.sessionsDone}
              <span className="text-xs font-normal text-ink-muted">/{prog.sessionsTotal}</span>
            </dd>
          </div>
          <div>
            <dt className="st-label">This week</dt>
            <dd className="num mt-1 text-lg font-semibold">
              {thisWeekDone}
              <span className="text-xs font-normal text-ink-muted">/{phase.workouts.length}</span>
            </dd>
          </div>
          <div>
            <dt className="st-label">Started</dt>
            <dd className="num mt-1 text-lg font-semibold">{prog.start ? formatDay(prog.start) : '—'}</dd>
          </div>
          <div className="col-span-3">
            <Bar value={prog.sessionsDone / prog.sessionsTotal} tone="arc" label="Phase progress" />
          </div>
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Next workout */}
        <section className="st-panel relative overflow-hidden p-5 lg:col-span-5" aria-label="Next workout">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_180px_at_100%_0%,rgba(139,92,246,0.14),transparent)]" aria-hidden="true" />
          <div className="relative">
            <p className="st-label text-violet-soft">● Next workout</p>
            {!prog.start ? (
              <>
                <h3 className="mt-3 text-xl font-semibold">Start {phase.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">Pick the day of your first session. Weeks are counted from this date.</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input type="date" className="st-input num w-44" value={startInput} onChange={(e) => setStartInput(e.target.value)} aria-label="Phase start date" />
                  <Button variant="primary" onClick={() => act((s) => setPhaseStart(s, phase.id, startInput), { success: `${phase.name} starts ${formatDay(startInput)}` })}>
                    Set start
                  </Button>
                </div>
              </>
            ) : next && !prog.finished ? (
              <>
                <h3 className="mt-3 text-2xl font-semibold">
                  {next.code} <span className="text-ink-muted">· {next.title}</span>
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  Opener: {next.exercises.find((e) => e.opener)?.name} · {next.exercises.length} exercises + {next.cardioMin} min cardio
                </p>
                {schedule.find((s) => s.date === today)?.plan === 'rest' && <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted"><Moon size={12} aria-hidden="true" /> Today is a suggested rest day — any day this week counts.</p>}
                <Button variant="primary" className="mt-5" onClick={() => open({ type: 'workout-log', phaseId: phase.id, workoutId: next.id })}>
                  <Play size={14} aria-hidden="true" /> Log {next.code}
                </Button>
              </>
            ) : (
              <>
                <h3 className="mt-3 text-xl font-semibold">{prog.finished ? `${phase.name} complete` : 'All sessions done this week'}</h3>
                <p className="mt-1 text-sm text-ink-soft">{prog.finished ? 'Great work. Add the next phase when you receive it.' : phase.restGuidance}</p>
              </>
            )}
          </div>
        </section>

        {/* Week strip */}
        <Panel
          className="lg:col-span-7"
          title={prog.start ? `Week ${shownWeek + 1} · ${formatDay(weekRange(prog.start, shownWeek)[0])} – ${formatDay(weekRange(prog.start, shownWeek)[1])} · ${weekDoneCount}/${phase.workouts.length}` : 'Weekly schedule'}
          action={
            prog.start && phase.weeks > 1 ? (
              <Segmented label="Week" size="sm" value={String(shownWeek)} onChange={(w) => setWeek(Number(w))} options={Array.from({ length: phase.weeks }, (_, i) => ({ value: String(i), label: `W${i + 1}` }))} />
            ) : undefined
          }
        >
          {prog.start ? (
            <div className="grid grid-cols-7 gap-1.5">
              {schedule.map((s) => {
                const meta = SLOT[s.status];
                const w = phase.workouts.find((x) => x.id === s.plan);
                return (
                  <button
                    key={s.date}
                    onClick={() => w && open({ type: 'workout-log', phaseId: phase.id, workoutId: w.id })}
                    disabled={!w || s.date > today}
                    className={cn('flex flex-col items-center gap-1 rounded-lg border px-1 py-3 text-center disabled:cursor-default', meta.cls)}
                    aria-label={`${shortWeekday(s.date)} ${formatDay(s.date)}: ${w ? w.code : 'rest'}, ${meta.label}`}
                  >
                    <span className="text-[10px] uppercase opacity-80">{shortWeekday(s.date)}</span>
                    <span className="num text-sm text-ink">{parseDayKey(s.date).getDate()}</span>
                    <span className="text-[11px] font-medium">{w ? w.code : 'Rest'}</span>
                    <span className="hidden text-[10px] opacity-80 sm:block">{s.status === 'done' && s.doneOn && s.doneOn !== s.date ? `Done ${shortWeekday(s.doneOn)}` : meta.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Suggested order: {phase.pattern.map((p) => (p === 'rest' ? 'Rest' : nameOf(p))).join(' · ')}</p>
          )}
          <p className="mt-3 text-[11px] text-ink-muted">Any day in the week counts — just keep a rest day between two full-body sessions.</p>
        </Panel>
      </div>

      {/* Workouts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {phase.workouts.map((w) => (
          <Panel key={w.id} title={`${w.code} · ${w.title}`} action={<Button size="sm" variant="secondary" onClick={() => open({ type: 'workout-log', phaseId: phase.id, workoutId: w.id })}>Log</Button>}>
            <ol className="flex flex-col divide-y divide-line/60">
              {w.exercises.map((e) => {
                const last = lastPerformance(state, e.id);
                return (
                  <li key={e.id} className="py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm">
                        {e.name} {e.opener && <Badge tone="violet" className="ml-1">Opener</Badge>}
                      </span>
                      <span className="num shrink-0 text-xs text-ink-muted">
                        {e.sets}×{e.repsMin}–{e.repsMax}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {last ? (
                        <>
                          <span className="num">{fmtW(Math.max(...last.sets.map((s) => s.weight)))}</span> × <span className="num">{last.sets.map((s) => s.reps).join('/')}</span> · <span className="text-violet-soft">{overloadHint(e, last)}</span>
                        </>
                      ) : (
                        'Not logged yet'
                      )}
                    </p>
                  </li>
                );
              })}
              <li className="py-2 text-[11px] text-ink-muted">+ {w.cardioMin} min cardio</li>
            </ol>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Exercise progress */}
        <Panel className="lg:col-span-7" title="Exercise progress">
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-muted">
                  <th scope="col" className="py-2 pl-4 font-medium sm:pl-5">Exercise</th>
                  <th scope="col" className="px-3 py-2 font-medium">Best set</th>
                  <th scope="col" className="px-3 py-2 font-medium">Sessions</th>
                  <th scope="col" className="py-2 pl-3 pr-4 font-medium sm:pr-5">Top weight trend</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map(({ id, name, history }) => {
                  const best = history.reduce<(typeof history)[number] | undefined>((m, p) => (!m || p.bestWeight > m.bestWeight || (p.bestWeight === m.bestWeight && p.bestReps > m.bestReps) ? p : m), undefined);
                  const max = Math.max(1, ...history.map((h) => h.bestWeight));
                  return (
                    <tr key={id} className="border-b border-line/60">
                      <td className="py-2 pl-4 sm:pl-5">{name}</td>
                      <td className="num px-3 py-2 text-xs">{best ? `${fmtW(best.bestWeight)} × ${best.bestReps}` : '—'}</td>
                      <td className="num px-3 py-2 text-xs">{history.length}</td>
                      <td className="py-2 pl-3 pr-4 sm:pr-5">
                        {history.length ? (
                          <div className="flex h-6 items-end gap-0.5" role="img" aria-label={`Top weight per session: ${history.map((h) => h.bestWeight).join(', ')} kg`}>
                            {history.slice(-12).map((h, i) => (
                              <span key={i} title={`${formatDay(h.date)}: ${h.bestWeight} kg × ${h.bestReps}`} className="w-2 rounded-t-[2px] bg-violet" style={{ height: `${Math.max(12, (h.bestWeight / max) * 100)}%` }} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-ink-faint">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* History */}
        <Panel className="lg:col-span-5" title={`History · ${logs.length}`}>
          {logs.length ? (
            <ul className="flex max-h-[460px] flex-col divide-y divide-line/60 overflow-y-auto pr-1">
              {logs.map((l) => {
                const w = phase.workouts.find((x) => x.id === l.workoutId);
                const sets = l.exercises.reduce((n, e) => n + e.sets.length, 0);
                return (
                  <li key={l.id} className="group py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{w?.code}</span>
                      <span className="text-xs text-ink-muted">{formatDay(l.date, today)}</span>
                      {l.formVideoShared && (
                        <span title="Form video shared" className="text-arc-soft">
                          <Video size={12} aria-label="Form video shared" />
                        </span>
                      )}
                      <button
                        className="ml-auto rounded-md p-1 text-ink-faint opacity-60 hover:text-rose group-hover:opacity-100"
                        aria-label={`Delete ${w?.code} log from ${formatDay(l.date)}`}
                        onClick={() => window.confirm('Delete this workout log?') && act((s) => deleteWorkoutLog(s, l.id), { success: 'Workout deleted' })}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="num mt-0.5 text-[11px] text-ink-muted">
                      {sets} sets{l.durationMin ? ` · ${l.durationMin} min` : ''}
                      {l.cardioMin ? ` · ${l.cardioMin} min cardio` : ' · no cardio'}
                    </p>
                    {l.notes && <p className="mt-1 text-xs text-ink-soft">{l.notes}</p>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon={<Dumbbell size={20} />} title="No workouts logged yet">
              Log your first session and the next one will prefill your weights.
            </Empty>
          )}
        </Panel>
      </div>

      {/* Coach notes */}
      <Panel
        title={`${phase.name} · Phase notes`}
        action={
          <button className="text-xs text-ink-muted hover:text-ink" onClick={() => setShowNotes((v) => !v)} aria-expanded={showNotes}>
            {showNotes ? 'Hide rest, cardio & substitution guide' : 'Rest, cardio & substitution guide'}
          </button>
        }
      >
        <p className="mb-4 text-sm text-ink-soft">{phase.intro}</p>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {phase.notes.map((n, i) => (
            <li key={n.title} className="rounded-lg border border-line p-4">
              <p className="flex gap-2 text-sm font-medium">
                <span className="num text-violet-soft">{i + 1}.</span>
                <span>{n.title}</span>
              </p>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-xs leading-relaxed text-ink-soft marker:text-ink-faint">
                {n.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
              {n.important && (
                <p className="mt-3 rounded-md border border-ember/30 bg-ember/10 px-2.5 py-1.5 text-xs text-ember-soft">
                  <strong className="font-semibold">Very important:</strong> {n.important}
                </p>
              )}
            </li>
          ))}
        </ol>
        {showNotes && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-line p-3">
              <p className="text-sm font-medium">Rest days</p>
              <p className="mt-1 text-xs text-ink-muted">{phase.restGuidance}</p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <p className="text-sm font-medium">Post-workout cardio</p>
              <p className="mt-1 text-xs text-ink-muted">{phase.cardioGuidance}</p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <p className="text-sm font-medium">Substitutions</p>
              <p className="mt-1 text-xs text-ink-muted">{phase.substitutionGuidance}</p>
            </div>
          </div>
        )}
        {prog.start && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-xs text-ink-muted">
            <span>Change start date</span>
            <input type="date" className="st-input num h-8 w-40 py-1 text-xs" value={startInput} onChange={(e) => setStartInput(e.target.value)} aria-label="Change phase start date" />
            <Button size="sm" variant="ghost" disabled={startInput === prog.start} onClick={() => act((s) => setPhaseStart(s, phase.id, startInput), { success: 'Start date updated' })}>
              Update
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
