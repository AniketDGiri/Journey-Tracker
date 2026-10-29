import { useMemo, useState } from 'react';
import { Eye, ExternalLink, SkipForward, Sparkles } from 'lucide-react';
import type { Domain, RecallQuality } from '../../domain/types';
import { DOMAIN_META, KIND_LABELS } from '../../domain/catalog';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/ui';
import { reviewItem, rescheduleItem } from '../../engine/actions';
import { daysOverdue, nextInterval } from '../../engine/revision';
import { addDays, formatDay } from '../../lib/date';
import { Bar, Button, Empty, Modal, Segmented } from '../ui';
import { DiffBadge, DomainTag } from '../bits';
import { weekendDays } from '../../views/RevisionPlan';

/**
 * Focused revision: one card at a time. Recall first, then reveal notes, then
 * grade honestly. The queue is frozen when the session opens so grading an
 * item doesn't reshuffle what's left.
 */
export function FocusSheet({ domain: d0 }: { domain?: Domain }) {
  const { state, act, derived, today } = useStore();
  const { close } = useUI();
  const [filter, setFilter] = useState<Domain | 'all'>(d0 ?? 'all');
  const initial = useMemo(
    () => [...derived.queues.overdue, ...derived.queues.today].map((i) => i.id),
    // Freeze on open / filter change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const queue = useMemo(
    () => initial.filter((id) => filter === 'all' || state.items.find((i) => i.id === id)?.domain === filter),
    [initial, filter, state.items],
  );
  const [done, setDone] = useState<Record<string, RecallQuality | 'skipped'>>({});
  const [revealed, setRevealed] = useState(false);
  const [xp, setXp] = useState(0);

  const remaining = queue.filter((id) => !done[id]);
  const currentId = remaining[0];
  const item = currentId ? state.items.find((i) => i.id === currentId) : undefined;
  const topic = item ? state.topics.find((t) => t.id === item.topicId) : undefined;
  const completed = queue.length - remaining.length;

  const grade = (q: RecallQuality) => {
    if (!item) return;
    const fb = act((s, ctx) => reviewItem(s, item.id, q, ctx), { silent: true });
    if (fb) {
      setXp((x) => x + fb.xp);
      setDone((d) => ({ ...d, [item.id]: q }));
      setRevealed(false);
    }
  };
  const skip = () => {
    if (!item) return;
    setDone((d) => ({ ...d, [item.id]: 'skipped' }));
    setRevealed(false);
  };
  const planned = state.settings.revisionMode !== 'auto';
  // Planned revisions move to the next weekend day after today; automatic ones to tomorrow.
  const postponeTo = planned ? (weekendDays(addDays(today, 1), 1)[0]?.[0] ?? addDays(today, 1)) : addDays(today, 1);
  const postpone = () => {
    if (!item) return;
    if (act((s, ctx) => rescheduleItem(s, item.id, postponeTo, ctx), { silent: true })) {
      setDone((d) => ({ ...d, [item.id]: 'skipped' }));
      setRevealed(false);
    }
  };

  const tally = Object.values(done).reduce<Record<string, number>>((m, q) => ({ ...m, [q]: (m[q] ?? 0) + 1 }), {});

  return (
    <Modal open onClose={close} title="Revision focus" wide>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Filter domain"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, ...(['dsa', 'hld', 'lld'] as Domain[]).map((d) => ({ value: d, label: DOMAIN_META[d].short }))]}
          />
          <span className="num ml-auto text-xs text-ink-muted">
            {completed} / {queue.length}
          </span>
        </div>
        <Bar value={queue.length ? completed / queue.length : 0} tone="arc" label="Revision progress" />

        {queue.length === 0 ? (
          <Empty icon={<Sparkles size={22} />} title="Nothing due">
            You’re all caught up. New items join the queue the day after you learn them.
          </Empty>
        ) : !item ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Sparkles size={28} className="text-violet-soft" aria-hidden="true" />
            <p className="text-lg font-semibold">Revision complete</p>
            <p className="text-sm text-ink-muted">
              {tally.success ?? 0} recalled · {tally.partial ?? 0} partial · {tally.fail ?? 0} forgotten
              {tally.skipped ? ` · ${tally.skipped} skipped` : ''}
            </p>
            {state.settings.gamification && xp > 0 && <p className="num text-sm text-violet-soft">+{xp} XP</p>}
            <p className="max-w-sm text-xs text-ink-muted">
              {planned
                ? 'Revised items go back to your completed list. Plan the forgotten ones again soon in Quests → Revision plan.'
                : 'Forgotten items come back tomorrow. That’s the system working, not a failure.'}
            </p>
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <article className="flex flex-col gap-4 rounded-xl border border-line-strong bg-surface-2/60 p-5" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <DomainTag domain={item.domain} />
              <span>{topic?.name}</span>
              <span aria-hidden="true">·</span>
              <span>{KIND_LABELS[item.kind]}</span>
              <DiffBadge difficulty={item.difficulty} />
              {daysOverdue(item, today) > 0 && <span className="text-ember-soft">{daysOverdue(item, today)}d overdue</span>}
            </div>
            <h3 className="text-xl font-semibold leading-snug">{item.title}</h3>
            {!revealed ? (
              <>
                <p className="text-sm text-ink-soft">
                  {item.kind === 'problem'
                    ? 'Without looking: what pattern applies, what is the approach, and what is its complexity?'
                    : item.kind === 'concept'
                      ? 'Explain it out loud as if to an interviewer. When would you use it, and what are the trade-offs?'
                      : 'Sketch the key components and the hardest trade-off from memory.'}
                </p>
                <Button variant="secondary" onClick={() => setRevealed(true)} className="self-start">
                  <Eye size={14} aria-hidden="true" /> Reveal my notes
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-line bg-void/40 p-3">
                {item.notes ? <pre className="whitespace-pre-wrap font-mono text-[13px] text-ink-soft">{item.notes}</pre> : <p className="text-sm text-ink-muted">No notes yet — add some after grading so future you has a reference.</p>}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-violet-soft hover:underline">
                    Open problem <ExternalLink size={11} aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {(['fail', 'partial', 'success'] as RecallQuality[]).map((q) => (
                <Button key={q} variant={q === 'success' ? 'primary' : 'secondary'} className="h-auto flex-col gap-0.5 py-2.5" onClick={() => grade(q)}>
                  <span>{q === 'fail' ? 'Forgot' : q === 'partial' ? 'Partial' : 'Recalled'}</span>
                  <span className="num text-[10px] opacity-70">{planned ? 'you plan the next one' : `next ${formatDay(addDays(today, nextInterval(item.review.stage, q, state.settings.intervals).interval), today).toLowerCase()}`}</span>
                </Button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={postpone}>
                Postpone to {planned ? `${formatDay(postponeTo, today).toLowerCase()}` : 'tomorrow'}
              </Button>
              <Button variant="ghost" size="sm" onClick={skip}>
                <SkipForward size={13} aria-hidden="true" /> Skip for now
              </Button>
            </div>
          </article>
        )}
      </div>
    </Modal>
  );
}
