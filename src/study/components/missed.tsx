import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { DayKey, MissReasonKind } from '../domain/types';
import { useStore } from '../store/AppStore';
import { MISS_REASONS, missBreakdown, missLabel, reasonsOf, setMissReason, unexplainedLifeMisses, unexplainedMisses, type MissedDay, type MissScope } from '../engine/missed';
import { formatDay, formatDayInline } from '../lib/date';
import { cn } from '../lib/cn';
import { Bar, Button, Panel } from './ui';
import { SystemTag, SystemWindow } from './system';
import { useLife } from './life';

const LATER_KEY: Record<MissScope, string> = { study: 'ascend.missed.later', life: 'ascend.missed.later.life' };

function readLater(scope: MissScope): string[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(LATER_KEY[scope]) ?? '[]');
  } catch {
    return [];
  }
}

/** Reason chips and an optional note. Saves through `onSave`. */
function ReasonForm({ initial, onSave, onCancel, saveLabel = 'Record' }: { initial?: { reason: MissReasonKind; note?: string }; onSave: (reason: MissReasonKind, note: string) => void; onCancel?: () => void; saveLabel?: string }) {
  const [reason, setReason] = useState<MissReasonKind | undefined>(initial?.reason);
  const [note, setNote] = useState(initial?.note ?? '');
  return (
    <form
      className="mt-3 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (reason) onSave(reason, note);
      }}
    >
      <div role="radiogroup" aria-label="Reason" className="flex flex-wrap gap-2">
        {MISS_REASONS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={reason === r.id}
            onClick={() => setReason(r.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              reason === r.id ? 'border-violet bg-violet/20 text-ink' : 'border-line-strong text-ink-soft hover:border-ink-muted hover:text-ink',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What happened? (optional) e.g. release deadline, late meeting"
          aria-label="Note"
          maxLength={200}
          className="st-input h-9 min-w-0 flex-[1_1_280px] text-sm"
        />
        <Button type="submit" size="sm" variant="primary" disabled={!reason}>
          {saveLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Later
          </Button>
        )}
      </div>
    </form>
  );
}

/** The System asks why the most recent unexplained failed study day went wrong. */
export function MissedDayPrompt() {
  const { state, today } = useStore();
  const misses = useMemo(() => unexplainedMisses(state, today), [state, today]);
  return <MissedPrompt scope="study" misses={misses} what="daily quest" />;
}

/** The same for the Life Daily Quest. */
export function LifeMissedDayPrompt() {
  const { state, today } = useStore();
  const life = useLife();
  const misses = useMemo(() => unexplainedLifeMisses(state, life.recent, today), [state, life.recent, today]);
  return <MissedPrompt scope="life" misses={misses} what="Daily Quest objective" />;
}

function MissedPrompt({ scope, misses, what }: { scope: MissScope; misses: MissedDay[]; what: string }) {
  const { today, act } = useStore();
  const [later, setLater] = useState(() => readLater(scope));
  const pending = misses.filter((m) => !later.includes(m.day));
  const m = pending[0];
  if (!m) return null;
  const postpone = () => {
    const next = [...later, m.day];
    setLater(next);
    try {
      window.sessionStorage.setItem(LATER_KEY[scope], JSON.stringify(next));
    } catch {
      /* not remembered */
    }
  };
  return (
    <SystemWindow label="Missed day report" tone="rose" className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SystemTag tone="rose">REPORT REQUIRED</SystemTag>
        {pending.length > 1 && <span className="num text-[11px] text-ink-muted">{pending.length - 1} more day{pending.length > 2 ? 's' : ''} to report</span>}
      </div>
      <p className="mt-2 text-base font-semibold">
        {formatDay(m.day, today)}: {m.missed} of {m.total} {what}{m.total > 1 ? 's' : ''} left unfinished. What got in the way?
      </p>
      <p className="mt-0.5 text-xs text-ink-muted">Your answer is kept with that day, so you can spot the pattern later.</p>
      <ReasonForm
        key={m.day}
        onSave={(reason, note) => act((s, ctx) => setMissReason(s, m.day, { reason, note }, ctx, scope), { success: `Reason recorded for ${formatDayInline(m.day, today)}` })}
        onCancel={postpone}
      />
    </SystemWindow>
  );
}

/** A past day's recorded reason, editable; or the form when a failed day has none. */
export function MissReasonNote({ day, failed, scope = 'study' }: { day: DayKey; failed: boolean; scope?: MissScope }) {
  const { state, today, act } = useStore();
  const [editing, setEditing] = useState(false);
  const r = reasonsOf(state, scope)[day];
  if (!r && !failed) return null;
  const save = (reason: MissReasonKind, note: string) => {
    act((s, ctx) => setMissReason(s, day, { reason, note }, ctx, scope), { silent: true });
    setEditing(false);
  };
  return (
    <div className="mt-3 rounded-lg border border-rose/30 bg-rose/5 px-3 py-2.5 text-sm">
      {r && !editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">Why it was missed</span>
          <span className="rounded-full border border-rose/50 px-2.5 py-0.5 text-xs text-ink">{missLabel(r.reason)}</span>
          {r.note && <span className="min-w-0 flex-1 text-ink-soft">{r.note}</span>}
          <button type="button" onClick={() => setEditing(true)} className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
            <Pencil size={12} aria-hidden="true" /> Edit
          </button>
        </div>
      ) : (
        <>
          <p className="text-ink-soft">{r ? 'Change the reason' : `Why were ${formatDayInline(day, today)}’s quests left unfinished?`}</p>
          <ReasonForm initial={r} onSave={save} onCancel={r ? () => setEditing(false) : undefined} saveLabel={r ? 'Save' : 'Record'} />
        </>
      )}
    </div>
  );
}

/** What got in the way over the last 30 days. */
export function MissBreakdownPanel({ scope = 'study' }: { scope?: MissScope }) {
  const { state, today } = useStore();
  const rows = useMemo(() => missBreakdown(state, today, 30, scope), [state, today, scope]);
  const recent = useMemo(
    () =>
      Object.entries(reasonsOf(state, scope))
        .filter(([d]) => d < today)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 5),
    [state, scope, today],
  );
  if (!rows.length && !recent.length) return null;
  const top = rows[0]?.count ?? 1;
  const total = rows.reduce((n, r) => n + r.count, 0);
  return (
    <Panel title="Why days were missed">
      {rows.length > 0 && (
        <>
          <p className="mb-3 text-xs text-ink-muted">
            Last 30 days · {total} missed day{total > 1 ? 's' : ''}
            {rows[0] && rows[0].count > 1 && <> · most often <span className="text-ink">{missLabel(rows[0].reason).toLowerCase()}</span></>}
          </p>
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.reason} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-xs">
                <span className="text-ink-soft">{missLabel(r.reason)}</span>
                <Bar value={r.count / top} tone="ember" label={`${missLabel(r.reason)}: ${r.count}`} />
                <span className="num text-right text-ink-muted">{r.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {recent.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-xs">
          {recent.map(([d, r]) => (
            <li key={d} className="flex gap-2">
              <span className="num w-24 shrink-0 text-ink-muted">{formatDay(d, today)}</span>
              <span className="shrink-0 text-ink">{missLabel(r.reason)}</span>
              {r.note && <span className="truncate text-ink-soft">· {r.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
