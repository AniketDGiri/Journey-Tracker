import type { DayKey, Iso } from './types';

/** Training programmes ("phases"), kept separate from interview-prep XP and streaks. */

export interface ExerciseTemplate {
  id: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  opener?: boolean;
}

export interface WorkoutTemplate {
  id: string;
  /** Short code, e.g. FBD-1. */
  code: string;
  title: string;
  exercises: ExerciseTemplate[];
  cardioMin: number;
}

export interface Phase {
  id: string;
  name: string;
  summary: string;
  weeks: number;
  /** Suggested 7-day order: a workout id or 'rest'. */
  pattern: string[];
  workouts: WorkoutTemplate[];
  /** Coach's phase notes, kept verbatim. */
  notes: { title: string; points: string[]; important?: string }[];
  intro: string;
  restGuidance: string;
  cardioGuidance: string;
  substitutionGuidance: string;
}

export interface LoggedSet {
  reps: number;
  /** kg; 0 = bodyweight. */
  weight: number;
}

export interface LoggedExercise {
  exerciseId: string;
  name: string;
  /** Substitute actually performed, if any. */
  substitution?: string;
  sets: LoggedSet[];
}

export interface WorkoutLog {
  id: string;
  phaseId: string;
  workoutId: string;
  date: DayKey;
  at: Iso;
  durationMin?: number;
  cardioMin: number;
  formVideoShared: boolean;
  notes: string;
  exercises: LoggedExercise[];
}

/** workoutId of a session with cardio and no strength work. */
export const CARDIO_ONLY = 'cardio';

export const isCardioOnly = (l: Pick<WorkoutLog, 'workoutId'>) => l.workoutId === CARDIO_ONLY;

/** Strength sessions only: cardio-only days don't count as a workout of the phase. */
export const strengthLogs = (logs: WorkoutLog[]) => logs.filter((l) => !isCardioOnly(l));

export interface FitnessState {
  activePhaseId?: string;
  /** Start date per phase. */
  starts: Record<string, DayKey>;
  logs: WorkoutLog[];
}

const ex = (id: string, name: string, sets = 3, opener = false): ExerciseTemplate => ({ id, name, sets, repsMin: 10, repsMax: 15, opener });

export const PHASES: Phase[] = [
  {
    id: 'phase-0',
    name: 'Phase-0',
    summary: '3 full-body days a week for 2 weeks. Nail the form of the major compound movements.',
    weeks: 2,
    pattern: ['fbd-1', 'rest', 'fbd-2', 'rest', 'fbd-3', 'rest', 'rest'],
    workouts: [
      {
        id: 'fbd-1',
        code: 'FBD-1',
        title: 'Full Body 1',
        cardioMin: 15,
        exercises: [
          ex('bench', 'Barbell Bench Press [Flat]', 4, true),
          ex('db-shoulder-press', 'Dumbbell Shoulder Press'),
          ex('cable-row', 'Seated Cable Rows'),
          ex('goblet-squat', 'Goblet Squats'),
          ex('rdl', 'Romanian Deadlifts (Barbell)'),
          ex('crunch', 'Crunches'),
        ],
      },
      {
        id: 'fbd-2',
        code: 'FBD-2',
        title: 'Full Body 2',
        cardioMin: 15,
        exercises: [
          ex('goblet-squat', 'Goblet Squats', 4, true),
          ex('rdl', 'Romanian Deadlifts (Barbell)'),
          ex('bench', 'Barbell Bench Press [Flat]'),
          ex('sa-db-row', 'Single Arm Dumbbell Rows'),
          ex('lat-pulldown', 'Lat Pulldowns [Mag-Grip Handle]'),
          ex('leg-raise', 'Leg Raises'),
        ],
      },
      {
        id: 'fbd-3',
        code: 'FBD-3',
        title: 'Full Body 3',
        cardioMin: 15,
        exercises: [
          ex('cable-row', 'Seated Cable Rows', 4, true),
          ex('lat-pulldown', 'Lat Pulldowns [Mag-Grip Handle]'),
          ex('goblet-squat', 'Goblet Squats'),
          ex('rdl', 'Romanian Deadlifts (Barbell)'),
          ex('bench', 'Barbell Bench Press [Flat]'),
          ex('russian-twist', 'Russian Twists'),
        ],
      },
    ],
    // Verbatim from the coach's "Instructions" sheet.
    notes: [
      {
        title: 'Nail down the proper exercise form of all major movements.',
        points: [
          'You will be hitting each muscle 3x a week, repeating your main compound movements.',
          'This makes sure we get a lot of practice and opportunities to master our form on our primary movements.',
          'Make sure you make full use of phase zero by sharing your exercise form videos regularly with me for feedback.',
        ],
        important: 'The more you share, the more feedback you get, the faster you learn.',
      },
      {
        title: 'Learn how to train effectively in 3 days/week.',
        points: [
          'If we train smart, 3 days is enough for meaningful progress week by week.',
          'Hence, we must know how to train effectively if 3 days is what we can manage in our schedule.',
        ],
      },
      {
        title: 'Learn how to train Full Body in one workout effectively.',
        points: [
          'Full Body (FBD) Training is a very efficient way to organise your training.',
          'FBD days are a great way to train every muscle group effectively if you just have 2-3 days/week to train.',
          'In this phase, we will learn how to train FBD style.',
        ],
      },
      {
        title: 'Workout Structure & Exercise Selection',
        points: [
          'Each training session will have 6 exercises.',
          'Every day starts with the OPENER for the day. OPENER is going to be the exercise where we are most fresh and high on energy.',
          'OPENER will determine the focus for the day, and is followed by compound movement for other muscle groups.',
          'We will not be doing any isolation work on arms/shoulders in this phase. We will focus only on the main compound movements - as they cover every muscle group effectively.',
        ],
      },
      {
        title: 'Order of workouts',
        points: [
          'You will notice that the suggested order is: FBD-1 | Rest | FBD-2 | Rest | FBD-3 | Rest | Rest',
          'Having a rest day after a good full body workout helps in optimal recovery before the next full body session.',
          'You can change the order of the workouts, just make sure to keep a rest day in between 2 consecutive FBD Sessions.',
        ],
      },
      {
        title: 'Time Duration per workout',
        points: ['Ideally, each of these workouts can be done in under 90 minutes - if you do not waste time in the gym.'],
      },
    ],
    intro: 'In this phase, we will be training 3 days/week.',
    restGuidance: 'Light activity only: swimming, yoga, long or incline walks, light cycling. No high-intensity cardio.',
    cardioGuidance: '15 minutes of any cardio after the workout (incline walk, skipping, stairs, swimming, elliptical, jogging or a sport). Can also be done at another time of day.',
    substitutionGuidance: 'Substitute only when equipment is missing or busy — not because the exercise is hard. Use the same substitute every time so progressive overload stays comparable.',
  },
];
