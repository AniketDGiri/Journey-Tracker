import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { uid } from '../../utils/id';

/** A checklist step inside a personal task. */
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export const makeSubtask = (title: string): Subtask => ({ id: uid(), title: title.trim(), done: false });

/** "2/3" for a task with subtasks, empty otherwise. */
export function subtaskCount(list?: Subtask[]): string {
  return list?.length ? `${list.filter((s) => s.done).length}/${list.length}` : '';
}

/** Editable checklist: tick, rename, remove and add steps. Every change hands back the whole list. */
export function SubtaskList({ value = [], onChange, label = 'Subtasks' }: { value?: Subtask[]; onChange: (list: Subtask[]) => void; label?: string }) {
  const [draft, setDraft] = useState('');
  const set = (id: string, patch: Partial<Subtask>) => onChange(value.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onChange([...value, makeSubtask(draft)]);
    setDraft('');
  };
  const done = value.filter((s) => s.done).length;
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
        {label}
        {value.length > 0 && (
          <span className={cn('num normal-case tracking-normal', done === value.length ? 'text-jade' : 'text-ink-soft')}>
            {done}/{value.length}
          </span>
        )}
      </p>
      {value.length > 0 && (
        <ul className="flex flex-col gap-1">
          {value.map((s) => (
            <li key={s.id} className="group flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.done}
                onChange={(e) => set(s.id, { done: e.target.checked })}
                aria-label={`${s.done ? 'Reopen' : 'Complete'} “${s.title}”`}
                className="h-4 w-4 shrink-0 cursor-pointer accent-violet"
              />
              <input
                value={s.title}
                onChange={(e) => set(s.id, { title: e.target.value })}
                onBlur={(e) => !e.target.value.trim() && onChange(value.filter((x) => x.id !== s.id))}
                aria-label="Subtask"
                className={cn(
                  'min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-line focus:border-violet focus:outline-none',
                  s.done ? 'text-ink-muted line-through' : 'text-ink',
                )}
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.id !== s.id))}
                aria-label={`Remove “${s.title}”`}
                className="grid h-6 w-6 place-items-center rounded text-ink-faint opacity-0 hover:bg-surface-3 hover:text-ink focus:opacity-100 group-hover:opacity-100"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a subtask…"
          aria-label="New subtask"
          className="h-8 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface-2 px-2.5 text-sm text-ink focus:border-violet focus:outline-none"
        />
        <button type="submit" disabled={!draft.trim()} className="grid h-8 w-8 place-items-center rounded-lg border border-line-strong text-ink-muted hover:text-ink disabled:opacity-40" aria-label="Add subtask">
          <Plus size={14} />
        </button>
      </form>
    </div>
  );
}
