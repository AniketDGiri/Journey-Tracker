import { useEffect, useMemo, useState } from 'react';
import type { Difficulty, Domain, ItemKind, ItemStatus, SubItem } from '../../domain/types';
import { DOMAIN_META, KIND_LABELS } from '../../domain/catalog';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/ui';
import { addItem, deriveStatus, logProgress, outcomeTarget, setSubItems } from '../../engine/actions';
import { grantedFor } from '../../engine/progression';
import { Button, Confidence, Field, Modal, Segmented } from '../ui';
import { ItemPicker } from '../ItemPicker';
import { RubricEditor, StatusPicker, SubItemsEditor } from '../bits';

const KINDS: Record<Domain, ItemKind[]> = {
  dsa: ['problem'],
  hld: ['concept', 'design'],
  lld: ['concept', 'machine-coding'],
};

/** One sheet to record progress on an existing item or quick-add a new one. */
export function LogSheet({ domain: initialDomain, itemId: initialItem }: { domain?: Domain; itemId?: string }) {
  const { state, act } = useStore();
  const { close } = useUI();
  const preset = initialItem ? state.items.find((i) => i.id === initialItem) : undefined;
  const startDomain = preset?.domain ?? initialDomain ?? 'dsa';
  const hasItems = (d: Domain) => state.items.some((i) => i.domain === d);
  // Nothing to pick from yet → start on "New item".
  const [mode, setMode] = useState<'existing' | 'new'>(preset || hasItems(startDomain) ? 'existing' : 'new');
  const [domain, setDomain] = useState<Domain>(startDomain);
  const [itemId, setItemId] = useState<string | undefined>(preset?.id);
  const item = itemId ? state.items.find((i) => i.id === itemId) : undefined;

  // New-item fields
  const domainTopics = useMemo(() => state.topics.filter((t) => t.domain === domain).sort((a, b) => a.tier - b.tier), [state.topics, domain]);
  const [topicId, setTopicId] = useState(domainTopics[0]?.id ?? '');
  const [kind, setKind] = useState<ItemKind>(KINDS[domain][0]);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [url, setUrl] = useState('');

  // Outcome fields
  const [status, setStatus] = useState<ItemStatus>(preset?.status === 'not-started' || !preset ? 'independent' : preset.status);
  const [confidence, setConfidence] = useState(preset?.confidence ?? 0);
  const [minutes, setMinutes] = useState('');
  const [rubric, setRubric] = useState<Record<string, boolean>>(preset?.rubric ?? {});
  const [subItems, setSubItemList] = useState<SubItem[]>(preset?.subItems ?? []);

  const onSubItems = (list: SubItem[]) => {
    setSubItemList(list);
    // A new item has no history, so its outcome follows the checklist exactly.
    if (mode === 'new') setStatus(list.length ? deriveStatus('not-started', list) : 'independent');
    else setStatus((s) => deriveStatus(s, list));
  };

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

  const submit = () => {
    const fb = act(
      (s, ctx) => {
        let id = itemId!;
        let next = s;
        if (mode === 'new') {
          const r = addItem(next, { topicId, kind, title, difficulty: kind === 'problem' || kind === 'design' || kind === 'machine-coding' ? difficulty : undefined, url, subItems }, ctx);
          next = r.state;
          id = r.id;
        } else {
          next = setSubItems(next, id, subItems, ctx);
        }
        return logProgress(next, id, { status, confidence: confidence || undefined, minutes: mins, solveTimeMin: (status === 'independent' || status === 'with-hints') && activeKind === 'problem' ? mins || undefined : undefined, rubric, practiced: mode === 'existing' && status === item?.status && status !== 'not-started' && !mins }, ctx);
      },
      { success: mode === 'new' ? `Added “${title.trim()}”` : `${item?.title} updated` },
    );
    if (fb) close();
  };

  return (
    <Modal
      open
      onClose={close}
      title="Log progress"
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
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>
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
            <Field label="Title" htmlFor="log-title">
              <input id="log-title" className="st-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={domain === 'dsa' ? 'e.g. Longest Palindromic Substring' : 'e.g. Consistent hashing'} autoFocus />
            </Field>
            <Field label="Topic" htmlFor="log-topic">
              <select id="log-topic" className="st-input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                {domainTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
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
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
