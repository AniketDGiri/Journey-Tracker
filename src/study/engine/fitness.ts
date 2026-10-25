import type { AppState, DayKey } from '../domain/types';
import { PHASES, type ExerciseTemplate, type LoggedExercise, type Phase, type WorkoutLog } from '../domain/fitness';
import { addDays, diffDays } from '../lib/date';
import { uid } from '../lib/id';
import { ActionError, type Ctx } from './actions';

/**
 * Training engine. A phase starts on a chosen date; its "weeks" are 7-day
 * blocks from that date. Any day inside a week counts for a workout, so the
 * suggested order is guidance, not a rule.
 */

export function getPhase(id?: string): Phase | undefined {
  return PHASES.find((p) => p.id === id);
}

export interface PhaseProgress {
  phase: Phase;
  start?: DayKey;
  /** 0-based current week, clamped to the phase length. */
  week: number;
  started: boolean;
  finished: boolean;
  sessionsDone: number;
  sessionsTotal: number;
}

export function phaseProgress(state: AppState, phase: Phase, today: DayKey): PhaseProgress {
  const start = state.fitness.starts[phase.id];
  const total = phase.weeks * phase.workouts.length;
  if (!start) return { phase, week: 0, started: false, finished: false, sessionsDone: 0, sessionsTotal: total };
  const d = diffDays(start, today);
  const week = Math.max(0, Math.min(phase.weeks - 1, Math.floor(d / 7)));
  let done = 0;
  for (let w = 0; w < phase.weeks; w++) done += weekDone(state, phase, start, w).size;
  return { phase, start, week, started: d >= 0, finished: d >= phase.weeks * 7 || done >= total, sessionsDone: done, sessionsTotal: total };
}

export function weekRange(start: DayKey, week: number): [DayKey, DayKey] {
  const a = addDays(start, week * 7);
  return [a, addDays(a, 6)];
}

/** Workout ids completed in a phase week → first log for each. */
export function weekDone(state: AppState, phase: Phase, start: DayKey, week: number): Map<string, WorkoutLog> {
  const [a, b] = weekRange(start, week);
  const m = new Map<string, WorkoutLog>();
  for (const l of [...state.fitness.logs].sort((x, y) => x.date.localeCompare(y.date))) {
    if (l.phaseId === phase.id && l.date >= a && l.date <= b && !m.has(l.workoutId)) m.set(l.workoutId, l);
  }
  return m;
}

export type SlotStatus = 'done' | 'today' | 'upcoming' | 'open' | 'rest' | 'rest-active';

export interface DaySlot {
  date: DayKey;
  /** Workout id suggested for this day, or 'rest'. */
  plan: string;
  status: SlotStatus;
  /** Workouts actually logged on this date. */
  logged: WorkoutLog[];
  /** For a done workout slot: the day it was actually done. */
  doneOn?: DayKey;
}

export function weekSchedule(state: AppState, phase: Phase, start: DayKey, week: number, today: DayKey): DaySlot[] {
  const [a] = weekRange(start, week);
  const done = weekDone(state, phase, start, week);
  return phase.pattern.map((plan, i) => {
    const date = addDays(a, i);
    const logged = state.fitness.logs.filter((l) => l.phaseId === phase.id && l.date === date);
    let status: SlotStatus;
    if (plan === 'rest') status = logged.length ? 'rest-active' : 'rest';
    else if (done.has(plan)) status = 'done';
    else if (date === today) status = 'today';
    else if (date > today) status = 'upcoming';
    else status = 'open'; // passed but still doable this week
    return { date, plan, status, logged, doneOn: done.get(plan)?.date };
  });
}

/** Next workout in the suggested order that isn't done this week. */
export function nextWorkout(state: AppState, phase: Phase, start: DayKey, week: number) {
  const done = weekDone(state, phase, start, week);
  const order = phase.pattern.filter((p) => p !== 'rest');
  const id = order.find((p) => !done.has(p));
  return id ? phase.workouts.find((w) => w.id === id) : undefined;
}

/** Was yesterday a workout? Rest is recommended between consecutive sessions. */
export function trainedYesterday(state: AppState, today: DayKey): boolean {
  return state.fitness.logs.some((l) => l.date === addDays(today, -1));
}

export function lastPerformance(state: AppState, exerciseId: string, before?: DayKey): (LoggedExercise & { date: DayKey }) | undefined {
  const logs = [...state.fitness.logs].filter((l) => !before || l.date < before).sort((a, b) => b.at.localeCompare(a.at));
  for (const l of logs) {
    const e = l.exercises.find((x) => x.exerciseId === exerciseId && x.sets.length);
    if (e) return { ...e, date: l.date };
  }
  return undefined;
}

/** Progressive-overload suggestion based on last time. */
export function overloadHint(t: ExerciseTemplate, last?: LoggedExercise): string {
  if (!last || !last.sets.length) return `Start light: ${t.sets} × ${t.repsMin}–${t.repsMax} with clean form`;
  const allTop = last.sets.length >= t.sets && last.sets.every((s) => s.reps >= t.repsMax);
  const top = Math.max(...last.sets.map((s) => s.weight));
  if (allTop) return top > 0 ? `All sets hit ${t.repsMax} — add weight (~${top + 2.5} kg)` : `All sets hit ${t.repsMax} — make it harder`;
  return 'Same weight, aim for +1 rep on a set';
}

export interface ExercisePoint {
  date: DayKey;
  bestWeight: number;
  bestReps: number;
  volume: number;
}

export function exerciseHistory(state: AppState, exerciseId: string): ExercisePoint[] {
  return [...state.fitness.logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((l) => {
      const e = l.exercises.find((x) => x.exerciseId === exerciseId && x.sets.length);
      if (!e) return [];
      const best = e.sets.reduce((m, s) => (s.weight > m.weight || (s.weight === m.weight && s.reps > m.reps) ? s : m), e.sets[0]);
      return [{ date: l.date, bestWeight: best.weight, bestReps: best.reps, volume: e.sets.reduce((v, s) => v + s.reps * Math.max(1, s.weight), 0) }];
    });
}

// ── Actions ──────────────────────────────────────────────────────────────

export function setPhaseStart(state: AppState, phaseId: string, date: DayKey): AppState {
  if (!getPhase(phaseId)) throw new ActionError('Unknown phase.');
  return { ...state, fitness: { ...state.fitness, activePhaseId: phaseId, starts: { ...state.fitness.starts, [phaseId]: date } } };
}

export function setActivePhase(state: AppState, phaseId: string): AppState {
  if (!getPhase(phaseId)) throw new ActionError('Unknown phase.');
  return { ...state, fitness: { ...state.fitness, activePhaseId: phaseId } };
}

export interface WorkoutInput {
  phaseId: string;
  workoutId: string;
  date: DayKey;
  durationMin?: number;
  cardioMin: number;
  formVideoShared: boolean;
  notes: string;
  exercises: LoggedExercise[];
}

export function logWorkout(state: AppState, input: WorkoutInput, ctx: Ctx): AppState {
  const phase = getPhase(input.phaseId);
  const w = phase?.workouts.find((x) => x.id === input.workoutId);
  if (!phase || !w) throw new ActionError('Unknown workout.');
  if (input.date > ctx.today) throw new ActionError('You can’t log a workout in the future.');
  const exercises = input.exercises
    .map((e) => ({ ...e, substitution: e.substitution?.trim() || undefined, sets: e.sets.filter((s) => s.reps > 0).map((s) => ({ reps: Math.round(s.reps), weight: Math.max(0, Math.round(s.weight * 4) / 4) })) }))
    .filter((e) => e.sets.length);
  if (!exercises.length) throw new ActionError('Log at least one set.');
  if (input.durationMin !== undefined && (input.durationMin < 0 || input.durationMin > 600)) throw new ActionError('Duration looks off.');
  const log: WorkoutLog = {
    id: uid('wo'),
    phaseId: phase.id,
    workoutId: w.id,
    date: input.date,
    at: ctx.now,
    durationMin: input.durationMin || undefined,
    cardioMin: Math.max(0, Math.round(input.cardioMin)),
    formVideoShared: input.formVideoShared,
    notes: input.notes.trim(),
    exercises,
  };
  const starts = state.fitness.starts[phase.id] ? state.fitness.starts : { ...state.fitness.starts, [phase.id]: input.date };
  return { ...state, fitness: { ...state.fitness, activePhaseId: state.fitness.activePhaseId ?? phase.id, starts, logs: [...state.fitness.logs, log] } };
}

export function deleteWorkoutLog(state: AppState, id: string): AppState {
  return { ...state, fitness: { ...state.fitness, logs: state.fitness.logs.filter((l) => l.id !== id) } };
}
