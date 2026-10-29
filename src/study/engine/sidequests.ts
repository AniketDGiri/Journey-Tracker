import type { Subtask } from '../components/subtasks';
/**
 * Personal tasks shown as Solo Leveling side quests. The tasks themselves live in
 * the original Personal store; this only derives ranks and rewards from them, so
 * nothing new is stored and prep XP and streaks are untouched.
 */

export interface PersonalTask {
  id: string;
  title: string;
  section: string;
  priority?: string;
  effort?: string;
  category?: string;
  projectId?: string | null;
  start?: string;
  end?: string;
  notes?: string;
  /** Day the task was moved to Done; null once reopened. Absent on tasks cleared before it was tracked. */
  doneAt?: string | null;
  /** Checklist steps inside the task. */
  subtasks?: Subtask[];
}

/** The patch that moves a task between sections, stamping or clearing the day it was cleared. */
export function sectionPatch(task: PersonalTask, section: string, today: string): Partial<PersonalTask> {
  if (section === 'done') return { section, doneAt: task.section === 'done' ? (task.doneAt ?? null) : today };
  return { section, doneAt: null };
}

export interface PersonalSection {
  id: string;
  name: string;
}

export interface PersonalProject {
  id: string;
  name: string;
  status?: string;
}

export type Rank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export const RANKS: Rank[] = ['S', 'A', 'B', 'C', 'D', 'E'];

/** Priority × effort: S is a high-priority, large job; E a low-priority, quick one. */
const RANK_TABLE: Record<string, Record<string, Rank>> = {
  High: { Large: 'S', Medium: 'A', Small: 'B' },
  Medium: { Large: 'B', Medium: 'C', Small: 'D' },
  Low: { Large: 'D', Medium: 'D', Small: 'E' },
};

export const RANK_REWARD: Record<Rank, number> = { S: 100, A: 60, B: 40, C: 25, D: 15, E: 10 };

/** Text colour per rank; each also differs in lightness, and the letter carries the meaning. */
export const RANK_TONE: Record<Rank, string> = {
  S: 'text-ember border-ember/60',
  A: 'text-rose border-rose/60',
  B: 'text-arc-soft border-arc-soft/60',
  C: 'text-jade border-jade/60',
  D: 'text-ink-soft border-line-strong',
  E: 'text-ink-muted border-line-strong',
};

export function rankOf(task: Pick<PersonalTask, 'priority' | 'effort'>): Rank {
  return RANK_TABLE[task.priority ?? 'Medium']?.[task.effort ?? 'Medium'] ?? 'C';
}

export const rewardOf = (task: Pick<PersonalTask, 'priority' | 'effort'>) => RANK_REWARD[rankOf(task)];

/** Solo Leveling names for the default sections; custom sections keep their own name. */
export const SECTION_LABEL: Record<string, string> = { todo: 'Accepted', inprogress: 'In combat', done: 'Cleared' };

export const sectionLabel = (s: PersonalSection) => SECTION_LABEL[s.id] ?? s.name;

/** Side-quest XP: the rewards of every cleared quest, derived each time. */
export const clearedXp = (tasks: PersonalTask[]) => tasks.filter((t) => t.section === 'done').reduce((n, t) => n + rewardOf(t), 0);
