import { useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import type { Difficulty, ItemStatus, RecallQuality } from '../../domain/types';
import { KIND_LABELS } from '../../domain/catalog';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/ui';
import { deleteItem, deriveStatus, editItem, logProgress, rescheduleItem, reviewItem, setSubItems } from '../../engine/actions';
import { itemMastery } from '../../engine/mastery';
import { isLearned, nextInterval } from '../../engine/revision';
import { grantedFor } from '../../engine/progression';
import { formatDay, addDays } from '../../lib/date';
import { Bar, Button, Confidence, Field, Modal, Segmented } from '../ui';
import { RubricEditor, StatusPicker, DomainTag, SubItemsEditor } from '../bits';

export function ItemSheet({ itemId }: { itemId: string }) {
  const { state, act, today } = useStore();
  const { close, open } = useUI();
  const item = state.items.find((i) => i.id === itemId);
  const [title, setTitle] = useState(item?.title ?? '');
  const [topicId, setTopicId] = useState(item?.topicId ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>(item?.difficulty ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [tags, setTags] = useState(item?.tags.join(', ') ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? 'not-started');
  const [confidence, setConfidence] = useState(item?.confidence ?? 0);
  const [rubric, setRubric] = useState(item?.rubric ?? {});
  const [subItems, setSubItemList] = useState(item?.subItems ?? []);
  const [nextDate, setNextDate] = useState(item?.review.nextReviewAt ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!item) {
    return (
      <Modal open onClose={close} title="Item not found">
        <p className="text-sm text-ink-muted">This item may have been deleted.</p>
      </Modal>
    );
  }

  const topics = state.topics.filter((t) => t.domain === item.domain);
  const learned = isLearned(item);
  const mastery = itemMastery(item, today);
  const xpEarned = grantedFor(state, 'outcome', item.id);

  const save = () => {
    const fb = act(
      (s, ctx) => {
        let next = editItem(
          s,
          item.id,
          {
            title: title.trim(),
            topicId,
            difficulty: difficulty || undefined,
            url: url.trim() || undefined,
            notes,
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          },
          ctx,
        );
        next = setSubItems(next, item.id, subItems, ctx);
        next = logProgress(next, item.id, { status, confidence, rubric }, ctx);
        const it = next.items.find((i) => i.id === item.id)!;
        if (nextDate && isLearned(it) && nextDate !== item.review.nextReviewAt) next = rescheduleItem(next, item.id, nextDate, ctx);
        return next;
      },
      { success: 'Saved' },
    );
    if (fb) close();
  };

  const recall = (q: RecallQuality) => {
    const fb = act((s, ctx) => reviewItem(s, item.id, q, ctx), { success: `Revision logged · ${item.title}` });
    if (fb) close();
  };

  return (
    <Modal
      open
      onClose={close}
      wide
      title={item.title}
      footer={
        confirmDelete ? (
          <>
            <p className="mr-auto self-center text-xs text-rose">Delete permanently? XP already earned stays in your history.</p>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (act((s) => deleteItem(s, item.id), { success: 'Item deleted' })) close();
              }}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto text-rose hover:text-rose" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} aria-hidden="true" /> Delete
            </Button>
            <Button variant="secondary" onClick={() => open({ type: 'start-session', domain: item.domain, itemId: item.id })}>
              Study in session
            </Button>
            <Button variant="primary" onClick={save}>
              Save changes
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          <DomainTag domain={item.domain} />
          <span>{KIND_LABELS[item.kind]}</span>
          <span aria-hidden="true">·</span>
          <span>
            Mastery <span className="num text-ink">{mastery}</span>
          </span>
          {state.settings.gamification && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                <span className="num text-ink">{xpEarned}</span> XP earned
              </span>
            </>
          )}
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-violet-soft hover:underline">
              Open link <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </div>
        <Bar value={mastery / 100} label="Item mastery" />

        {/* Revision */}
        <section aria-label="Revision" className="rounded-xl border border-line bg-surface-2/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-ink-muted">First studied</dt>
                <dd className="num mt-0.5">{item.review.firstStudiedAt ? formatDay(item.review.firstStudiedAt, today) : '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Last revised</dt>
                <dd className="num mt-0.5">{item.review.lastReviewedAt ? formatDay(item.review.lastReviewedAt, today) : '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Next revision</dt>
                <dd className="num mt-0.5">{learned && item.review.nextReviewAt ? formatDay(item.review.nextReviewAt, today) : 'Not scheduled'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Recalls</dt>
                <dd className="num mt-0.5">
                  {item.review.successCount} ✓ · {item.review.lapseCount} ✗
                </dd>
              </div>
            </dl>
            {learned && (
              <div className="flex flex-wrap gap-2">
                {(['fail', 'partial', 'success'] as RecallQuality[]).map((q) => (
                  <Button key={q} size="sm" variant={q === 'success' ? 'primary' : 'secondary'} onClick={() => recall(q)}>
                    {q === 'fail' ? 'Forgot' : q === 'partial' ? 'Partial' : 'Recalled'}
                    <span className="num text-[10px] opacity-70">+{nextInterval(item.review.stage, q, state.settings.intervals).interval}d</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
          {learned && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Field label="Reschedule next revision" htmlFor="item-next">
                <input id="item-next" type="date" className="st-input num w-44" min={today} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
              </Field>
              <Button size="sm" variant="ghost" onClick={() => setNextDate(addDays(today, 1))}>
                Tomorrow
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNextDate(addDays(today, 7))}>
                Next week
              </Button>
            </div>
          )}
          {item.review.history.length > 0 && (
            <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Recall history">
              {item.review.history.slice(-14).map((h, i) => (
                <li
                  key={i}
                  title={`${h.date}: ${h.quality}, next in ${h.interval}d`}
                  className={`h-2.5 w-5 rounded-sm ${h.quality === 'success' ? 'bg-arc-soft' : h.quality === 'partial' ? 'bg-ember' : 'bg-rose'}`}
                >
                  <span className="sr-only">
                    {h.date}: {h.quality}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <SubItemsEditor
            value={subItems}
            onChange={(list) => {
              setSubItemList(list);
              setStatus((s) => deriveStatus(s, list));
            }}
          />
          <Field label="Outcome">
            <StatusPicker kind={item.kind} value={status} onChange={setStatus} />
          </Field>
          <RubricEditor kind={item.kind} value={rubric} onChange={setRubric} />
          <Field label="Confidence">
            <Confidence value={confidence} onChange={setConfidence} />
          </Field>
        </div>

        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <Field label="Title" htmlFor="it-title">
            <input id="it-title" className="st-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Topic" htmlFor="it-topic">
            <select id="it-topic" className="st-input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          {item.kind !== 'concept' && (
            <Field label="Difficulty">
              <Segmented label="Difficulty" size="sm" value={difficulty || 'medium'} onChange={(d) => setDifficulty(d)} options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} />
            </Field>
          )}
          <Field label="Link" htmlFor="it-url">
            <input id="it-url" className="st-input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Patterns / tags" htmlFor="it-tags" hint="Comma-separated, e.g. monotonic stack, two pointers">
            <input id="it-tags" className="st-input" value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="it-notes" hint="Key insight, approach, mistakes — shown during revision.">
              <textarea id="it-notes" className="st-input min-h-[110px] font-mono text-[13px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}
