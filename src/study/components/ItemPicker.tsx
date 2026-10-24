import { useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Domain, PracticeItem } from '../domain/types';
import { STATUS_LABELS } from '../domain/catalog';
import { useStore } from '../store/AppStore';
import { cn } from '../lib/cn';
import { DiffDot } from './bits';

/** Accessible search-and-pick list for practice items (listbox pattern). */
export function ItemPicker({
  domain,
  value,
  onChange,
  label = 'Find an item',
}: {
  domain?: Domain;
  value?: string;
  onChange: (id: string | undefined) => void;
  label?: string;
}) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const id = useId();
  const topicName = useMemo(() => new Map(state.topics.map((t) => [t.id, t.name])), [state.topics]);
  const selected = value ? state.items.find((i) => i.id === value) : undefined;
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.items
      .filter((i) => (!domain || i.domain === domain) && (!needle || i.title.toLowerCase().includes(needle) || (topicName.get(i.topicId) ?? '').toLowerCase().includes(needle)))
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 8);
  }, [q, state.items, domain, topicName]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-violet/40 bg-violet/5 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{selected.title}</p>
          <p className="text-xs text-ink-muted">
            {topicName.get(selected.topicId)} · {STATUS_LABELS[selected.kind][selected.status]}
          </p>
        </div>
        <button type="button" className="text-xs font-medium text-violet-soft hover:underline" onClick={() => onChange(undefined)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <input id={id} className="st-input pl-8" placeholder="Search by title or topic…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>
      <ul role="listbox" aria-label="Matching items" className="max-h-64 overflow-y-auto rounded-lg border border-line">
        {results.length === 0 && <li className="px-3 py-3 text-xs text-ink-muted">No matches. Switch to “New item” to add it.</li>}
        {results.map((it) => (
          <li key={it.id} role="option" aria-selected={false}>
            <button
              type="button"
              onClick={() => onChange(it.id)}
              className={cn('flex w-full items-center gap-3 border-b border-line/60 px-3 py-2 text-left last:border-0 hover:bg-surface-2')}
            >
              <DiffDot difficulty={it.difficulty} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{it.title}</span>
                <span className="block text-[11px] text-ink-muted">
                  {topicName.get(it.topicId)} · {STATUS_LABELS[it.kind][it.status]}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function rank(i: PracticeItem): number {
  // In-flight work first, then untouched, then learned.
  if (i.status === 'attempted' || i.status === 'unsolved') return 0;
  if (i.status === 'not-started') return 1;
  return 2;
}
