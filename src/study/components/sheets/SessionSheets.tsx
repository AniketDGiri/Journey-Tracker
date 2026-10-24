import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Domain, ItemStatus, SessionOutcome } from '../../domain/types';
import { DOMAIN_META } from '../../domain/catalog';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/ui';
import { finishSession, sessionElapsedMs, startSession, cancelSession, type FinishSessionInput } from '../../engine/actions';
import { formatDay } from '../../lib/date';
import { Button, Checkbox, Confidence, Field, Modal, Segmented } from '../ui';
import { ItemPicker } from '../ItemPicker';
import { StatusPicker } from '../bits';

export function StartSessionSheet({ domain: d0, itemId: i0 }: { domain?: Domain; itemId?: string }) {
  const { state, act } = useStore();
  const { close, open } = useUI();
  const [domain, setDomain] = useState<Domain>(d0 ?? 'dsa');
  const [itemId, setItemId] = useState<string | undefined>(i0);
  const [topicId, setTopicId] = useState('');
  const topics = state.topics.filter((t) => t.domain === domain);
  const item = itemId ? state.items.find((i) => i.id === itemId) : undefined;

  const start = () => {
    if (act((s, ctx) => startSession(s, { domain, itemId, topicId: item?.topicId ?? (topicId || undefined) }, ctx), { success: 'Session started — focus on outcomes, not minutes.' })) close();
  };

  return (
    <Modal
      open
      onClose={close}
      title="Start a study session"
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={() => open({ type: 'finish-session', manual: { domain, itemId, topicId: topicId || undefined } })}>
            Log a past session instead
          </Button>
          <Button variant="primary" onClick={start} disabled={!!state.activeSession}>
            Start timer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Segmented
          label="Domain"
          value={domain}
          onChange={(d) => {
            setDomain(d);
            setItemId(undefined);
            setTopicId('');
          }}
          options={(['dsa', 'hld', 'lld'] as Domain[]).map((x) => ({ value: x, label: DOMAIN_META[x].label }))}
        />
        <ItemPicker domain={domain} value={itemId} onChange={setItemId} label="Link to an item (optional)" />
        {!item && (
          <Field label="…or a topic (optional)" htmlFor="ss-topic">
            <select id="ss-topic" className="st-input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">No specific topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <p className="text-xs text-ink-muted">The timer is optional and keeps running across refreshes. You can pause it from the top bar.</p>
      </div>
    </Modal>
  );
}

const OUTCOMES: { value: SessionOutcome; label: string }[] = [
  { value: 'learned', label: 'Learned new' },
  { value: 'practiced', label: 'Practised' },
  { value: 'solved', label: 'Solved' },
  { value: 'revised', label: 'Revised' },
];

export function FinishSessionSheet({ manual }: { manual?: { domain: Domain; itemId?: string; topicId?: string } }) {
  const { state, act, today } = useStore();
  const { close } = useUI();
  const active = manual ? undefined : state.activeSession;
  const initialMin = active ? Math.max(1, Math.round(sessionElapsedMs(active, Date.now()) / 60000)) : 30;
  const [domain, setDomain] = useState<Domain>(active?.domain ?? manual?.domain ?? 'dsa');
  const [date, setDate] = useState(today);
  const [itemId, setItemId] = useState<string | undefined>(active?.itemId ?? manual?.itemId);
  const item = itemId ? state.items.find((i) => i.id === itemId) : undefined;
  const [duration, setDuration] = useState(String(initialMin));
  const [outcome, setOutcome] = useState<SessionOutcome>('practiced');
  const [confidence, setConfidence] = useState(0);
  const [hints, setHints] = useState(false);
  const [notes, setNotes] = useState('');
  const [itemStatus, setItemStatus] = useState<ItemStatus | undefined>(item?.status);
  const [summary, setSummary] = useState<null | { minutes: number; xp: number; item?: string; status?: string; next?: string }>(null);

  const xpPreview = useMemo(() => (Number(duration) >= state.settings.minSessionMinutes ? state.settings.xp.sessionComplete : 0), [duration, state.settings]);

  const finish = () => {
    const input: FinishSessionInput = {
      domain,
      itemId,
      topicId: item?.topicId ?? active?.topicId ?? manual?.topicId,
      durationMin: Number(duration),
      outcome,
      confidence,
      hintsUsed: hints,
      notes,
      itemStatus: item ? (hints && itemStatus === 'independent' ? 'with-hints' : itemStatus) : undefined,
      date: active ? undefined : date,
    };
    let after: typeof state | undefined;
    const fb = act(
      (s, ctx) => {
        const r = finishSession(s, input, ctx);
        after = r.state;
        return r.state;
      },
      { silent: true },
    );
    if (fb && after) {
      const it = itemId ? after.items.find((i) => i.id === itemId) : undefined;
      setSummary({
        minutes: Number(duration),
        xp: fb.xp,
        item: it?.title,
        status: it?.status,
        next: it?.review.nextReviewAt,
      });
    }
  };

  if (summary) {
    return (
      <Modal open onClose={close} title="Session complete" footer={<Button variant="primary" onClick={close}>Done</Button>}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <CheckCircle2 size={36} className="text-arc-soft" aria-hidden="true" />
          <p className="text-lg font-semibold">
            {summary.minutes} minute{summary.minutes === 1 ? '' : 's'} of {DOMAIN_META[domain].label}
          </p>
          {!active && date !== today && <p className="-mt-2 text-xs text-ink-muted">Logged on {formatDay(date)}</p>}
          <dl className="grid w-full grid-cols-2 gap-3 text-left text-sm">
            {summary.item && (
              <div className="col-span-2 rounded-lg border border-line p-3">
                <dt className="st-label">Worked on</dt>
                <dd className="mt-1">{summary.item}</dd>
              </div>
            )}
            {summary.next && (
              <div className="rounded-lg border border-line p-3">
                <dt className="st-label">Next revision</dt>
                <dd className="num mt-1">{formatDay(summary.next)}</dd>
              </div>
            )}
            {state.settings.gamification && (
              <div className="rounded-lg border border-line p-3">
                <dt className="st-label">XP earned</dt>
                <dd className="num mt-1 text-violet-soft">+{summary.xp}</dd>
              </div>
            )}
          </dl>
          {summary.minutes < state.settings.minSessionMinutes && (
            <p className="text-xs text-ink-muted">Sessions shorter than {state.settings.minSessionMinutes} minutes are logged but don’t earn session XP.</p>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={close}
      title={active ? 'Finish session' : 'Log a past session'}
      wide
      footer={
        <>
          {active && (
            <Button
              variant="ghost"
              className="mr-auto text-rose hover:text-rose"
              onClick={() => {
                if (act((s) => cancelSession(s), { success: 'Session discarded' })) close();
              }}
            >
              Discard
            </Button>
          )}
          {state.settings.gamification && <span className="self-center text-xs text-ink-muted">Session XP: <span className="num text-violet-soft">+{xpPreview}</span></span>}
          <Button variant="primary" onClick={finish} disabled={!(Number(duration) > 0)}>
            Save session
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {!active && (
          <div className="flex flex-wrap items-end gap-4">
            <Segmented
              label="Domain"
              value={domain}
              onChange={(d) => {
                setDomain(d);
                setItemId(undefined);
              }}
              options={(['dsa', 'hld', 'lld'] as Domain[]).map((x) => ({ value: x, label: DOMAIN_META[x].short }))}
            />
            <Field label="Date" htmlFor="fs-date">
              <input id="fs-date" type="date" className="st-input num w-44" max={today} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </Field>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Field label="Duration (min)" htmlFor="fs-dur">
            <input id="fs-dur" className="st-input num" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </Field>
          <Field label="What did you achieve?">
            <Segmented label="Session outcome" size="sm" value={outcome} onChange={setOutcome} options={OUTCOMES} />
          </Field>
        </div>
        <ItemPicker domain={domain} value={itemId} onChange={(v) => { setItemId(v); setItemStatus(state.items.find((i) => i.id === v)?.status); }} label="Linked item (optional)" />
        {item && (
          <Field label="Update item outcome">
            <StatusPicker kind={item.kind} value={itemStatus ?? item.status} onChange={setItemStatus} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Confidence">
            <Confidence value={confidence} onChange={setConfidence} />
          </Field>
          <div className="self-end">
            <Checkbox checked={hints} onChange={setHints} label="I needed hints or a reference" />
          </div>
        </div>
        <Field label="Notes" htmlFor="fs-notes" hint={item ? 'Appended to the item’s notes with today’s date.' : undefined}>
          <textarea id="fs-notes" className="st-input min-h-[90px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Key insight, mistake to avoid, what to revisit…" />
        </Field>
      </div>
    </Modal>
  );
}
