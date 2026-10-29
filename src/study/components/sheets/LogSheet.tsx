import { useEffect, useMemo, useState } from 'react';
import type { Difficulty, Domain, ItemKind, ItemStatus, RecallQuality, SubItem } from '../../domain/types';
import { DOMAIN_META, KIND_LABELS, STATUS_LABELS } from '../../domain/catalog';
import { formatDay } from '../../lib/date';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/ui';
import { addItem, deriveStatus, logProgress, outcomeTarget, reviewItem, setSubItems, type Ctx } from '../../engine/actions';
import { grantedFor } from '../../engine/progression';
import { Button, Confidence, Field, Modal, Segmented } from '../ui';
import { ItemPicker } from '../ItemPicker';
import { RubricEditor, StatusPicker, SubItemsEditor } from '../bits';

const KINDS: Record<Domain, ItemKind[]> = {
  dsa: ['problem', 'concept'],
  hld: ['concept', 'design'],
  lld: ['concept', 'machine-coding'],
};

/** One sheet to record progress on an existing item or quick-add a new one. */
export function LogSheet({
  domain: initialDomain,
  itemId: initialItem,
  mode: initialMode,
  topicId: initialTopic,
  date: initialDate,
}: {
  domain?: Domain;
  itemId?: string;
  mode?: 'new' | 'existing';
  topicId?: string;
  /** The day the work was done; defaults to today. */
  date?: string;
}) {
  const { state, act, today } = useStore();
  const { close } = useUI();
  const preset = initialItem ? state.items.find((i) => i.id === initialItem) : undefined;
  const startDomain = preset?.domain ?? initialDomain ?? 'dsa';
  const hasItems = (d: Domain) => state.items.some((i) => i.domain === d);
  // Nothing to pick from yet → start on "New item".
  const [mode, setMode] = useState<'existing' | 'new'>(initialMode ?? (preset || hasItems(startDomain) ? 'existing' : 'new'));
  const [domain, setDomain] = useState<Domain>(startDomain);
  const [itemId, setItemId] = useState<string | undefined>(preset?.id);
  const item = itemId ? state.items.find((i) => i.id === itemId) : undefined;

  // New-item fields
  const domainTopics = useMemo(() => state.topics.filter((t) => t.domain === domain).sort((a, b) => a.tier - b.tier), [state.topics, domain]);
  const [topicId, setTopicId] = useState(domainTopics.some((t) => t.id === initialTopic) ? initialTopic! : (domainTopics[0]?.id ?? ''));
  const [added, setAdded] = useState(0);
  const [kind, setKind] = useState<ItemKind>(KINDS[domain][0]);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [url, setUrl] = useState('');

  // Outcome fields
  // Adding to the plan starts an item as not started; quick-logging a fresh solve defaults to solved.
  const newDefault: ItemStatus = initialMode === 'new' ? 'not-started' : 'independent';
  const [status, setStatus] = useState<ItemStatus>(!preset ? newDefault : preset.status === 'not-started' ? 'independent' : preset.status);
  const [confidence, setConfidence] = useState(preset?.confidence ?? 0);
  const [minutes, setMinutes] = useState('');
  const [rubric, setRubric] = useState<Record<string, boolean>>(preset?.rubric ?? {});
  const [subItems, setSubItemList] = useState<SubItem[]>(preset?.subItems ?? []);

  // The day the work happened: lets a forgotten log still count for that day's quests.
  const [doneOn, setDoneOn] = useState(initialDate && initialDate < today ? initialDate : today);

  // Revising: an item studied earlier but never recorded, being revised now.
  const [revising, setRevising] = useState(false);
  const [studiedOn, setStudiedOn] = useState('');
  const [recall, setRecall] = useState<RecallQuality>('success');
  const isRevising = mode === 'new' && revising;
  const learned = status === 'with-hints' || status === 'independent';

  const onRevising = (on: boolean) => {
    setRevising(on);
    // Revising means it was already understood: start from "Understood with notes" rather than "Studying".
    if (on && !learned) setStatus('with-hints');
  };

  const onSubItems = (list: SubItem[]) => {
    setSubItemList(list);
    // A new item has no history, so its outcome follows the checklist exactly.
    if (mode === 'new') setStatus(list.length ? deriveStatus('not-started', list) : newDefault);
    else setStatus((s) => deriveStatus(s, list));
  };

  // DSA holds problems; its Java track holds concepts. Follow the chosen topic.
  useEffect(() => {
    if (domain !== 'dsa') return;
    setKind(state.topics.find((t) => t.id === topicId)?.track ? 'concept' : 'problem');
  }, [domain, topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!domainTopics.some((t) => t.id === topicId)) setTopicId(domainTopics[0]?.id ?? '');
    if (!KINDS[domain].includes(kind)) setKind(KINDS[domain][0]);
  }, [domain, domainTopics, topicId, kind]);

  useEffect(() => {
    if (item) {
      setStatus(item.status === 'not-started' ? (item.kind === 'design' || item.kind === 'machine-coding' ? 'attempted' : 'independent') : item.status);
      setConfidence(item.confidence);
      setRubric(item.rubric);
      setSubItemList(item.subItems ?? []);
    }
  }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeKind: ItemKind = mode === 'existing' ? item?.kind ?? 'problem' : kind;
  const mins = Number(minutes) || 0;

  // Transparent XP preview for the outcome reward.
  const preview = useMemo(() => {
    const base = mode === 'existing' ? item : undefined;
    const probe = {
      ...(base ?? { id: '__new', kind, difficulty: kind === 'problem' ? difficulty : undefined, rubric: {} }),
      status,
      rubric,
    } as Parameters<typeof outcomeTarget>[0];
    const target = Math.round(outcomeTarget(probe, state.settings.xp));
    const already = base ? grantedFor(state, 'outcome', base.id) : 0;
    return { target, gain: Math.max(0, target - already), already };
  }, [mode, item, kind, difficulty, status, rubric, state]);

  const canSubmit = mode === 'existing' ? !!item : !!title.trim() && !!topicId;

  const submit = (another = false) => {
    const fb = act(
      (s, ctx) => {
        let id = itemId!;
        let next = s;
        const on = (day: string): Ctx => ({ today: day, now: new Date(`${day}T12:00:00`).toISOString() });
        // Work done on an earlier day is recorded on that day (never in the future).
        const done: Ctx = !isRevising && doneOn && doneOn < ctx.today ? on(doneOn) : ctx;
        // A revised item's first study is recorded on the day it actually happened.
        const first: Ctx = isRevising && learned && studiedOn && studiedOn < ctx.today ? on(studiedOn) : done;
        if (mode === 'new') {
          const r = addItem(next, { topicId, kind, title, difficulty: kind === 'problem' || kind === 'design' || kind === 'machine-coding' ? difficulty : undefined, url, subItems }, first);
          next = r.state;
          id = r.id;
        } else {
          next = setSubItems(next, id, subItems, done);
        }
        next = logProgress(next, id, { status, confidence: confidence || undefined, minutes: mins, solveTimeMin: (status === 'independent' || status === 'with-hints') && activeKind === 'problem' ? mins || undefined : undefined, rubric, practiced: mode === 'existing' && status === item?.status && status !== 'not-started' && !mins }, first);
        // Today's revision: moves its schedule on from the first study instead of leaving it due tomorrow.
        if (isRevising && learned) next = reviewItem(next, id, recall, ctx);
        return next;
      },
      { success: `${mode === 'new' ? `Added “${title.trim()}”${isRevising && learned ? ' and logged today’s revision' : ''}` : `${item?.title} updated`}${!isRevising && doneOn < today ? ` for ${formatDay(doneOn, today).toLowerCase()}` : ''}` },
    );
    if (!fb) return;
    if (!another) return close();
    // Ready for the next one in the same topic.
    setAdded((n) => n + 1);
    setTitle('');
    setUrl('');
    setSubItemList([]);
    // Adding several old topics in a row keeps the revising choice, date and recall.
    setStatus(isRevising ? 'with-hints' : newDefault);
    setConfidence(0);
    setMinutes('');
    setRubric({});
    window.setTimeout(() => document.getElementById('log-title')?.focus(), 0);
  };

  return (
    <Modal
      open
      onClose={close}
      title={mode === 'new' ? 'Add item' : 'Log progress'}
      wide
      footer={
        <>
          {state.settings.gamification && (
            <p className="mr-auto self-center text-xs text-ink-muted">
              {preview.gain > 0 ? (
                <>
                  Outcome reward <span className="num text-violet-soft">+{preview.gain} XP</span>
                  {preview.already > 0 && <> (top-up; {preview.already} already earned)</>}
                </>
              ) : preview.target > 0 ? (
                'Outcome XP already earned for this item'
              ) : (
                'No outcome XP until solved or learned'
              )}
            </p>
          )}
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          {mode === 'new' && (
            <Button variant="secondary" onClick={() => submit(true)} disabled={!canSubmit}>
              Save & add another
            </Button>
          )}
          <Button variant="primary" onClick={() => submit()} disabled={!canSubmit}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Mode"
            value={mode}
            onChange={(m) => {
              setMode(m);
              if (m === 'new') setSubItemList([]);
            }}
            options={[{ value: 'existing', label: 'Existing item' }, { value: 'new', label: 'New item' }]} />
          <Segmented
            label="Domain"
            value={domain}
            onChange={(d) => {
              setDomain(d);
              setItemId(undefined);
              if (!hasItems(d)) setMode('new');
            }}
            options={(['dsa', 'hld', 'lld'] as Domain[]).map((d) => ({ value: d, label: DOMAIN_META[d].short }))}
          />
        </div>

        {mode === 'existing' ? (
          <ItemPicker domain={domain} value={itemId} onChange={setItemId} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {added > 0 && (
              <p className="text-xs text-jade sm:col-span-2" role="status">
                {added} added to {domainTopics.find((t) => t.id === topicId)?.name ?? DOMAIN_META[domain].short} — add the next one, or Save to finish.
              </p>
            )}
            <Field label="Title" htmlFor="log-title">
              <input id="log-title" className="st-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={domain === 'dsa' ? (kind === 'concept' ? 'e.g. HashMap internals' : 'e.g. Longest Palindromic Substring') : 'e.g. Consistent hashing'} autoFocus />
            </Field>
            <Field label="Topic" htmlFor="log-topic">
              <select id="log-topic" className="st-input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                {domainTopics
                  .filter((t) => !t.track)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                {[...new Set(domainTopics.filter((t) => t.track).map((t) => t.track!))].map((track) => (
                  <optgroup key={track} label={track === 'java' ? 'Java' : track}>
                    {domainTopics
                      .filter((t) => t.track === track)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            {KINDS[domain].length > 1 && (
              <Field label="Type">
                <Segmented label="Type" size="sm" value={kind} onChange={setKind} options={KINDS[domain].map((k) => ({ value: k, label: KIND_LABELS[k] }))} />
              </Field>
            )}
            {kind !== 'concept' && (
              <Field label="Difficulty">
                <Segmented label="Difficulty" size="sm" value={difficulty} onChange={setDifficulty} options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} />
              </Field>
            )}
            <Field label="Link (optional)" htmlFor="log-url">
              <input id="log-url" className="st-input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
            </Field>
          </div>
        )}

        {(mode === 'new' || item) && (
          <div className="flex flex-col gap-4 border-t border-line pt-5">
            <SubItemsEditor value={subItems} onChange={onSubItems} />
            {mode === 'new' && (
              <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-3">
                <legend className="px-1 text-xs font-medium text-ink-soft">When did you study this?</legend>
                <Segmented
                  label="When did you study this"
                  size="sm"
                  value={revising ? 'revising' : 'first'}
                  onChange={(v) => onRevising(v === 'revising')}
                  options={[
                    { value: 'first', label: 'Just now' },
                    { value: 'revising', label: 'Studied earlier, revising now' },
                  ]}
                />
                {revising && (
                  <div className="flex flex-wrap items-end gap-4">
                    <Field label="First studied (optional)" htmlFor="log-studied" hint="Leave blank if you don't remember.">
                      <input id="log-studied" type="date" className="st-input num w-44" max={today} value={studiedOn} onChange={(e) => setStudiedOn(e.target.value)} />
                    </Field>
                    <Field label="How did the recall go?">
                      <Segmented
                        label="Recall"
                        size="sm"
                        value={recall}
                        onChange={setRecall}
                        options={[
                          { value: 'success', label: 'Recalled' },
                          { value: 'partial', label: 'Partial' },
                          { value: 'fail', label: 'Forgot' },
                        ]}
                      />
                    </Field>
                  </div>
                )}
                {revising && !learned && (
                  <p className="text-xs text-ember-soft" role="status">
                    Pick “{STATUS_LABELS[kind]['with-hints']}” or higher below, or this is saved as plain progress without a revision.
                  </p>
                )}
                {revising && learned && (
                  <p className="text-xs text-ink-muted">
                    Saved as studied{studiedOn && studiedOn < today ? ` on ${formatDay(studiedOn, today)}` : ''}, with today's revision logged.{state.settings.revisionMode === 'auto' ? ' Its next revision is scheduled from today.' : ' Plan its next revision in Quests → Revision plan.'}
                  </p>
                )}
              </fieldset>
            )}
            <Field label="Outcome">
              <StatusPicker kind={activeKind} value={status} onChange={setStatus} />
            </Field>
            <RubricEditor kind={activeKind} value={rubric} onChange={setRubric} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Confidence" hint="How sure are you that you could do this again cold?">
                <Confidence value={confidence} onChange={setConfidence} />
              </Field>
              <Field label="Minutes spent (optional)" htmlFor="log-min" hint={activeKind === 'problem' ? 'Also recorded as solve time.' : undefined}>
                <input id="log-min" className="st-input num" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 25" />
              </Field>
              {!isRevising && (
                <Field label="Done on" htmlFor="log-done" hint={doneOn < today ? `Counts toward ${formatDay(doneOn, today).toLowerCase()}’s quests.` : 'Forgot to log it? Pick the day you did it.'}>
                  <input id="log-done" type="date" className="st-input num" max={today} value={doneOn} onChange={(e) => setDoneOn(e.target.value && e.target.value <= today ? e.target.value : today)} />
                </Field>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
