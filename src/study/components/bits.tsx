import { useState } from 'react';
import { ChevronDown, ListChecks, Plus, X } from 'lucide-react';
import type { Difficulty, Domain, ItemKind, ItemStatus, PracticeItem, SubItem } from '../domain/types';
import { DOMAIN_META, RUBRICS, STATUS_LABELS } from '../domain/catalog';
import { Badge, Bar, Button, Checkbox, Segmented } from './ui';
import { uid } from '../lib/id';
import { cn } from '../lib/cn';
import type { TopicState } from '../engine/mastery';

export function DiffDot({ difficulty }: { difficulty?: Difficulty }) {
  if (!difficulty) return <span className="h-2 w-2 shrink-0 rounded-full border border-line-strong" aria-hidden="true" />;
  const c = { easy: 'bg-jade', medium: 'bg-ember', hard: 'bg-rose' }[difficulty];
  return <span className={cn('h-2 w-2 shrink-0 rounded-full', c)} title={difficulty} aria-label={difficulty} role="img" />;
}

export function DiffBadge({ difficulty }: { difficulty?: Difficulty }) {
  if (!difficulty) return null;
  const tone = { easy: 'jade', medium: 'ember', hard: 'rose' } as const;
  return <Badge tone={tone[difficulty]}>{difficulty[0].toUpperCase() + difficulty.slice(1)}</Badge>;
}

export function DomainTag({ domain }: { domain: Domain }) {
  const tone = { dsa: 'violet', hld: 'arc', lld: 'muted' } as const;
  return <Badge tone={tone[domain]}>{DOMAIN_META[domain].short}</Badge>;
}

export const STATUS_TONE: Record<ItemStatus, 'muted' | 'violet' | 'arc' | 'ember' | 'rose' | 'jade'> = {
  'not-started': 'muted',
  attempted: 'ember',
  unsolved: 'rose',
  'with-hints': 'violet',
  independent: 'arc',
};

export function StatusBadge({ item }: { item: Pick<PracticeItem, 'kind' | 'status'> }) {
  return <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.kind][item.status]}</Badge>;
}

export const STATUS_ORDER: ItemStatus[] = ['not-started', 'attempted', 'unsolved', 'with-hints', 'independent'];

export function StatusPicker({ kind, value, onChange }: { kind: ItemKind; value: ItemStatus; onChange: (s: ItemStatus) => void }) {
  return (
    <Segmented
      label="Outcome"
      size="sm"
      value={value}
      onChange={onChange}
      options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[kind][s] }))}
    />
  );
}

export function RubricEditor({ kind, value, onChange }: { kind: ItemKind; value: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void }) {
  if (kind !== 'design' && kind !== 'machine-coding') return null;
  const rubric = RUBRICS[kind];
  const done = rubric.filter((r) => value[r.key]).length;
  return (
    <fieldset className="rounded-lg border border-line p-3">
      <legend className="px-1 text-xs font-medium text-ink-soft">
        Rubric <span className="num text-ink-muted">({done}/{rubric.length})</span>
      </legend>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {rubric.map((r) => (
          <Checkbox key={r.key} checked={!!value[r.key]} onChange={(c) => onChange({ ...value, [r.key]: c })} label={r.label} />
        ))}
      </div>
    </fieldset>
  );
}

export const TOPIC_STATE_META: Record<TopicState, { label: string; ring: string; text: string; dot: string }> = {
  locked: { label: 'Locked', ring: 'border-line border-dashed', text: 'text-ink-faint', dot: 'bg-ink-faint/40' },
  available: { label: 'Available', ring: 'border-line-strong', text: 'text-ink-soft', dot: 'bg-ink-muted' },
  'in-progress': { label: 'In progress', ring: 'border-violet/50', text: 'text-ink', dot: 'bg-violet-soft' },
  mastered: { label: 'Mastered', ring: 'border-arc/60 shadow-glow-arc', text: 'text-ink', dot: 'bg-arc-soft' },
  'revision-due': { label: 'Revision due', ring: 'border-ember/60', text: 'text-ink', dot: 'bg-ember' },
};

export function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="st-label">{label}</p>
      <p className="num mt-1 text-xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

/** Checklist of steps inside an item. Ticking every step completes the item. */
export function SubItemsEditor({ value, onChange }: { value: SubItem[]; onChange: (v: SubItem[]) => void }) {
  const [draft, setDraft] = useState('');
  const done = value.filter((s) => s.done).length;
  const add = () => {
    const title = draft.trim();
    if (!title) return;
    onChange([...value, { id: uid('sub'), title, done: false }]);
    setDraft('');
  };
  return (
    <fieldset className="rounded-lg border border-line p-3">
      <legend className="px-1 text-xs font-medium text-ink-soft">
        Sub-items{' '}
        {value.length > 0 && (
          <span className="num text-ink-muted">
            ({done}/{value.length})
          </span>
        )}
      </legend>
      {value.length > 0 && (
        <>
          <Bar value={done / value.length} tone={done === value.length ? 'arc' : 'violet'} className="mb-2 mt-1" label="Sub-items completed" />
          <ul className="flex flex-col">
            {value.map((s) => (
              <li key={s.id} className="group flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Checkbox
                    checked={s.done}
                    onChange={(c) => onChange(value.map((x) => (x.id === s.id ? { ...x, done: c } : x)))}
                    label={<span className={cn(s.done && 'text-ink-muted line-through')}>{s.title}</span>}
                  />
                </div>
                <button
                  type="button"
                  className="rounded p-1 text-ink-faint opacity-60 hover:bg-surface-3 hover:text-rose group-hover:opacity-100"
                  onClick={() => onChange(value.filter((x) => x.id !== s.id))}
                  aria-label={`Remove ${s.title}`}
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-2 flex gap-2">
        <input
          className="st-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={value.length ? 'Add another step…' : 'Break it into steps, e.g. Brute force, Optimise, Edge cases'}
          aria-label="New sub-item"
        />
        <Button size="sm" variant="secondary" className="h-[38px]" onClick={add} disabled={!draft.trim()}>
          <Plus size={14} aria-hidden="true" /> Add
        </Button>
      </div>
      {value.length > 0 && <p className="mt-2 text-[11px] text-ink-muted">Tick every step and the item is marked completed — that earns its XP and schedules its first revision.</p>}
    </fieldset>
  );
}

/** Compact "2/5" marker for lists; with `onToggle` it becomes a dropdown trigger. */
export function SubItemCount({
  item,
  expanded,
  onToggle,
  controls,
}: {
  item: Pick<PracticeItem, 'subItems' | 'title'>;
  expanded?: boolean;
  onToggle?: () => void;
  /** id of the region the toggle shows and hides. */
  controls?: string;
}) {
  const list = item.subItems ?? [];
  if (!list.length) return null;
  const done = list.filter((s) => s.done).length;
  const tone = done === list.length ? 'text-arc-soft' : 'text-ink-muted';
  const body = (
    <>
      <ListChecks size={11} aria-hidden="true" />
      {done}/{list.length}
    </>
  );
  if (!onToggle) {
    return (
      <span className={cn('num inline-flex items-center gap-1 text-[11px]', tone)} title={`${done} of ${list.length} sub-items done`}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!!expanded}
      aria-controls={controls}
      aria-label={`${expanded ? 'Hide' : 'Show'} sub-items of ${item.title}: ${done} of ${list.length} done`}
      className={cn(
        'num inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] transition-colors',
        expanded ? 'border-violet/50 bg-violet/10 text-violet-soft' : cn('border-line-strong hover:border-violet/50 hover:text-ink', tone),
      )}
    >
      {body}
      <ChevronDown size={11} aria-hidden="true" className={cn('transition-transform', expanded && 'rotate-180')} />
    </button>
  );
}
