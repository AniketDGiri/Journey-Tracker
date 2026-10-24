import { useState } from 'react';
import type { Domain } from '../../domain/types';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/ui';
import { deleteTopic, upsertTopic } from '../../engine/actions';
import { Button, Checkbox, Field, Modal } from '../ui';

export function TopicSheet({ domain, topicId }: { domain: Domain; topicId?: string }) {
  const { state, act } = useStore();
  const { close } = useUI();
  const topic = topicId ? state.topics.find((t) => t.id === topicId) : undefined;
  const others = state.topics.filter((t) => t.domain === domain && t.id !== topicId);
  const [name, setName] = useState(topic?.name ?? '');
  const [tier, setTier] = useState(String(topic?.tier ?? 0));
  const [target, setTarget] = useState(String(topic?.target ?? 3));
  const [description, setDescription] = useState(topic?.description ?? '');
  const [prereqs, setPrereqs] = useState<string[]>(topic?.prerequisites ?? []);
  const [confirm, setConfirm] = useState(false);
  const itemCount = topic ? state.items.filter((i) => i.topicId === topic.id).length : 0;

  const save = () => {
    const ok = act((s) => upsertTopic(s, { id: topic?.id, domain, name, tier: Number(tier) || 0, target: Number(target) || 1, prerequisites: prereqs, description: description.trim() || undefined }), {
      success: topic ? 'Topic updated' : 'Topic added',
    });
    if (ok) close();
  };

  return (
    <Modal
      open
      onClose={close}
      title={topic ? `Edit ${topic.name}` : 'New topic'}
      footer={
        confirm ? (
          <>
            <p className="mr-auto self-center text-xs text-rose">Delete topic and its {itemCount} item(s)?</p>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep
            </Button>
            <Button variant="danger" onClick={() => act((s) => deleteTopic(s, topic!.id), { success: 'Topic deleted' }) && close()}>
              Delete
            </Button>
          </>
        ) : (
          <>
            {topic && (
              <Button variant="ghost" className="mr-auto text-rose hover:text-rose" onClick={() => setConfirm(true)}>
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={!name.trim()}>
              Save
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" htmlFor="tp-name">
          <input id="tp-name" className="st-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tree tier" htmlFor="tp-tier" hint="0 = foundations">
            <input id="tp-tier" className="st-input num" inputMode="numeric" value={tier} onChange={(e) => setTier(e.target.value.replace(/\D/g, '').slice(0, 1))} />
          </Field>
          <Field label="Target items" htmlFor="tp-target" hint="Items needed for full coverage">
            <input id="tp-target" className="st-input num" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </Field>
        </div>
        <Field label="Description" htmlFor="tp-desc">
          <input id="tp-desc" className="st-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-ink-soft">Unlocks after (prerequisites at 40% mastery)</legend>
          <div className="grid max-h-48 grid-cols-2 overflow-y-auto rounded-lg border border-line p-2">
            {others.map((t) => (
              <Checkbox key={t.id} checked={prereqs.includes(t.id)} onChange={(c) => setPrereqs((p) => (c ? [...p, t.id] : p.filter((x) => x !== t.id)))} label={t.name} />
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
