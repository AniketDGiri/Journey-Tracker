import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { CARDIO_ONLY, type LoggedSet } from '../../domain/fitness';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/ui';
import { getPhase, lastPerformance, logWorkout, overloadHint, trainedYesterday } from '../../engine/fitness';
import { formatDay } from '../../lib/date';
import { cn } from '../../lib/cn';
import { Badge, Button, Checkbox, Field, Modal, Segmented } from '../ui';

interface Draft {
  exerciseId: string;
  name: string;
  substitution: string;
  showSub: boolean;
  sets: { reps: string; weight: string }[];
}

/** Log a workout set by set; weights prefill from last time so logging takes seconds. */
export function WorkoutLogSheet({ phaseId, workoutId: w0 }: { phaseId: string; workoutId: string }) {
  const { state, act, today } = useStore();
  const { close } = useUI();
  const phase = getPhase(phaseId);
  const [workoutId, setWorkoutId] = useState(w0);
  const cardioOnly = workoutId === CARDIO_ONLY;
  // A cardio-only session keeps the last strength workout around so switching back loses nothing.
  const [lastStrength, setLastStrength] = useState(w0 === CARDIO_ONLY ? (phase?.workouts[0]?.id ?? '') : w0);
  const workout = phase?.workouts.find((w) => w.id === (cardioOnly ? lastStrength : workoutId));
  const [date, setDate] = useState(today);

  const buildDraft = (wid: string): Draft[] =>
    (phase?.workouts.find((w) => w.id === wid)?.exercises ?? []).map((e) => {
      const last = lastPerformance(state, e.id);
      return {
        exerciseId: e.id,
        name: e.name,
        substitution: last?.substitution ?? '',
        showSub: !!last?.substitution,
        sets: Array.from({ length: e.sets }, (_, i) => ({ reps: '', weight: last?.sets[i]?.weight != null ? String(last.sets[i].weight) : last?.sets[0] ? String(last.sets[0].weight) : '' })),
      };
    });
  const [draft, setDraft] = useState<Draft[]>(() => buildDraft(w0 === CARDIO_ONLY ? lastStrength : w0));
  const [cardio, setCardio] = useState(String(workout?.cardioMin ?? 15));
  const [duration, setDuration] = useState('');
  const [video, setVideo] = useState(false);
  const [notes, setNotes] = useState('');

  if (!phase || !workout) return null;

  const upd = (i: number, fn: (d: Draft) => Draft) => setDraft((ds) => ds.map((d, j) => (j === i ? fn(d) : d)));
  const filledSets = draft.reduce((n, d) => n + d.sets.filter((s) => Number(s.reps) > 0).length, 0);
  const totalSets = workout.exercises.reduce((n, e) => n + e.sets, 0);
  const cardioMin = Number(cardio) || 0;
  const canSave = cardioOnly ? cardioMin > 0 : filledSets > 0;

  const save = () => {
    const ok = act(
      (s, ctx) =>
        logWorkout(
          s,
          {
            phaseId,
            workoutId,
            date,
            durationMin: Number(duration) || undefined,
            cardioMin,
            formVideoShared: video,
            notes,
            exercises: cardioOnly ? [] : draft.map((d) => ({
              exerciseId: d.exerciseId,
              name: d.name,
              substitution: d.showSub ? d.substitution : undefined,
              sets: d.sets.map<LoggedSet>((x) => ({ reps: Number(x.reps) || 0, weight: Number(x.weight) || 0 })),
            })),
          },
          ctx,
        ),
      { success: cardioOnly ? `Cardio logged · ${cardioMin} min` : `${workout.code} logged · ${filledSets} sets` },
    );
    if (ok) close();
  };

  return (
    <Modal
      open
      onClose={close}
      wide
      title={cardioOnly ? 'Log cardio' : `Log ${workout.code} · ${workout.title}`}
      footer={
        <>
          <span className="mr-auto self-center text-xs text-ink-muted">
            {cardioOnly ? (
              cardioMin > 0 ? (
                <>
                  <span className="num text-ink">{cardioMin}</span> min cardio
                </>
              ) : (
                'Enter your cardio minutes'
              )
            ) : (
              <>
                <span className="num text-ink">{filledSets}</span>/{totalSets} sets filled
              </>
            )}
          </span>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!canSave}>
            {cardioOnly ? 'Save cardio' : 'Save workout'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-3">
          <Segmented
            label="Workout"
            value={workoutId}
            onChange={(w) => {
              setWorkoutId(w);
              if (w === CARDIO_ONLY || w === lastStrength) return;
              setLastStrength(w);
              setDraft(buildDraft(w));
            }}
            options={[...phase.workouts.map((w) => ({ value: w.id, label: w.code })), { value: CARDIO_ONLY, label: 'Cardio only' }]}
          />
          <Field label="Date" htmlFor="wo-date">
            <input id="wo-date" type="date" className="st-input num w-44" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        {cardioOnly && (
          <p className="rounded-lg border border-line bg-surface-2/40 px-3 py-2 text-xs text-ink-soft">
            A cardio-only day: no strength sets needed. It earns the cardio bonus (15+ min) and counts toward Cardio Engine, but it isn’t one of this week’s workouts and doesn’t tick the Daily Quest’s strength objective.
          </p>
        )}
        {!cardioOnly && trainedYesterday(state, date) && date === today && (
          <p className="rounded-lg border border-ember/30 bg-ember/10 px-3 py-2 text-xs text-ember-soft">
            You trained yesterday. This phase keeps a rest day between full-body sessions. Log it if you already trained, but consider resting.
          </p>
        )}

        <ol className={cn('flex flex-col gap-3', cardioOnly && 'hidden')}>
          {workout.exercises.map((e, i) => {
            const last = lastPerformance(state, e.id, date === today ? undefined : date);
            const d = draft[i];
            return (
              <li key={e.id} className="rounded-xl border border-line bg-surface-2/40 p-3.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="num text-xs text-ink-faint">{i + 1}</span>
                  <h3 className="text-sm font-medium">{e.name}</h3>
                  {e.opener && <Badge tone="violet">Opener</Badge>}
                  <span className="num text-xs text-ink-muted">
                    {e.sets} × {e.repsMin}–{e.repsMax}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink-muted">
                  {last ? (
                    <>
                      Last ({formatDay(last.date, today)}): <span className="num">{last.sets.map((s) => s.reps).join(' / ')}</span> @ <span className="num">{Math.max(...last.sets.map((s) => s.weight)) || 'bodyweight'}{Math.max(...last.sets.map((s) => s.weight)) ? ' kg' : ''}</span>
                      {last.substitution ? ` · as ${last.substitution}` : ''} ·{' '}
                    </>
                  ) : null}
                  <span className="text-violet-soft">{overloadHint(e, last)}</span>
                </p>
                <div className="mt-3 grid grid-cols-[auto_1fr_1fr] items-center gap-x-2 gap-y-1.5 sm:max-w-md">
                  <span className="st-label text-[10px]">Set</span>
                  <span className="st-label text-[10px]">kg</span>
                  <span className="st-label text-[10px]">Reps</span>
                  {d.sets.map((s, k) => (
                    <div key={k} className="contents">
                      <span className="num w-6 text-xs text-ink-muted">{k + 1}</span>
                      <input
                        className="st-input num h-9 py-1"
                        inputMode="decimal"
                        aria-label={`${e.name} set ${k + 1} weight in kg`}
                        value={s.weight}
                        placeholder="BW"
                        onChange={(ev) => upd(i, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === k ? { ...y, weight: ev.target.value.replace(/[^\d.]/g, '').slice(0, 6) } : y)) }))}
                      />
                      <input
                        className={cn('st-input num h-9 py-1', s.reps && Number(s.reps) >= e.repsMax && 'border-arc/50')}
                        inputMode="numeric"
                        aria-label={`${e.name} set ${k + 1} reps`}
                        value={s.reps}
                        placeholder={last?.sets[k] ? String(last.sets[k].reps) : `${e.repsMin}–${e.repsMax}`}
                        onChange={(ev) => upd(i, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === k ? { ...y, reps: ev.target.value.replace(/\D/g, '').slice(0, 3) } : y)) }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => upd(i, (x) => ({ ...x, sets: [...x.sets, { reps: '', weight: x.sets[x.sets.length - 1]?.weight ?? '' }] }))}>
                    <Plus size={12} aria-hidden="true" /> Set
                  </Button>
                  {d.sets.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => upd(i, (x) => ({ ...x, sets: x.sets.slice(0, -1) }))}>
                      <Minus size={12} aria-hidden="true" /> Set
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => upd(i, (x) => ({ ...x, showSub: !x.showSub }))} aria-expanded={d.showSub}>
                    {d.showSub ? 'No substitution' : 'Substituted?'}
                  </Button>
                  {d.showSub && (
                    <input className="st-input h-8 max-w-xs py-1 text-xs" value={d.substitution} onChange={(ev) => upd(i, (x) => ({ ...x, substitution: ev.target.value }))} placeholder="Exercise you did instead" aria-label={`Substitute for ${e.name}`} />
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className={cn('grid gap-4 sm:grid-cols-3', !cardioOnly && 'border-t border-line pt-5')}>
          <Field label="Cardio (min)" htmlFor="wo-cardio" hint="Target 15 min">
            <input id="wo-cardio" className="st-input num" inputMode="numeric" autoFocus={cardioOnly} value={cardio} onChange={(e) => setCardio(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          </Field>
          <Field label="Session length (min)" htmlFor="wo-dur" hint="Aim for under 90">
            <input id="wo-dur" className="st-input num" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="optional" />
          </Field>
          <div className={cn('self-end pb-1', cardioOnly && 'hidden')}>
            <Checkbox checked={video} onChange={setVideo} label="Shared a form video with my coach" />
          </div>
          <div className="sm:col-span-3">
            <Field label="Notes" htmlFor="wo-notes">
              <textarea id="wo-notes" className="st-input min-h-[70px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Form cues, how it felt, coach feedback…" />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}
