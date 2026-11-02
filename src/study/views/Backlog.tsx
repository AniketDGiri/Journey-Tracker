import { useMemo, useState } from 'react';
import { Award, CalendarDays, Check, ClipboardList, Flame, RotateCcw, Swords, Undo2 } from 'lucide-react';
import type { DayKey } from '../domain/types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { BACKLOG_CATEGORIES, cleanRuns, computeBacklog, remaining, waiveBacklog, type BacklogCategory, type BacklogEntry } from '../engine/backlog';
import { ACHIEVEMENTS, evaluateAchievements } from '../engine/achievements';
import { planRevisions } from '../engine/actions';
import { formatDay, formatDayInline, shortWeekday } from '../lib/date';
import { cn } from '../lib/cn';
import { Badge, Bar, Button, Empty, Panel, Segmented } from '../components/ui';
import { DomainTag } from '../components/bits';
import { SystemTag, SystemWindow } from '../components/system';
import { weekendDays } from './RevisionPlan';

const ICONS: Record<BacklogCategory, typeof Swords> = { quest: Swords, plan: ClipboardList, revision: RotateCcw };

type Filter = 'all' | BacklogCategory;

/**
 * Everything that fell behind, by category. Nothing here is ticked by hand:
 * doing the work clears it, and the planner, quests and revision plan follow.
 */
export function Backlog() {
  const { state, today, derived } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const backlog = useMemo(() => computeBacklog(state, today), [state, today]);
  const runs = useMemo(() => cleanRuns(state, today), [state, today]);
  const ach = useMemo(
    () => evaluateAchievements({ state, today, streak: derived.streak }).filter((a) => ACHIEVEMENTS.find((d) => d.id === a.id)?.group === 'Backlog'),
    [state, today, derived.streak],
  );
  const count = (c: BacklogCategory) => backlog.open.filter((e) => e.category === c).length;
  const shown = BACKLOG_CATEGORIES.filter((c) => filter === 'all' || c.id === filter);

  return (
    <div className="flex flex-col gap-5">
      <SystemWindow label="Backlog">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SystemTag>BACKLOG</SystemTag>
            <h2 className="mt-2 text-lg font-semibold">{backlog.open.length ? 'Settle what you owe' : 'Nothing owed'}</h2>
            <p className="mt-1 max-w-xl text-sm text-ink-soft">
              Missed quests, planned tasks and revisions land here. Just do the work — it clears itself, and the planner, quests and revision plan update with it. Tracked since{' '}
              {formatDayInline(backlog.since, today)}.
            </p>
          </div>
          <dl className="flex flex-wrap gap-6">
            <div>
              <dt className="st-label">Open</dt>
              <dd className={cn('num mt-1 text-xl font-semibold', backlog.open.length ? 'text-rose' : 'text-jade')}>{backlog.open.length}</dd>
            </div>
            <div>
              <dt className="st-label">Cleared</dt>
              <dd className="num mt-1 text-xl font-semibold text-jade">{backlog.cleared.length}</dd>
            </div>
            <div>
              <dt className="st-label" title="Days in a row with nothing falling behind">Clean days</dt>
              <dd className="num mt-1 flex items-center gap-1 text-xl font-semibold">
                <Flame size={16} className={runs.current ? 'text-ember' : 'text-ink-faint'} aria-hidden="true" />
                {runs.current}
                <span className="text-xs font-normal text-ink-muted">· best {runs.longest}</span>
              </dd>
            </div>
          </dl>
        </div>
        <div className="mt-4">
          <Segmented
            label="Backlog category"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: `All · ${backlog.open.length}` }, ...BACKLOG_CATEGORIES.map((c) => ({ value: c.id, label: `${c.label} · ${count(c.id)}` }))]}
          />
        </div>
      </SystemWindow>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          {shown.map((c) => {
            const list = backlog.open.filter((e) => e.category === c.id);
            const Icon = ICONS[c.id];
            return (
              <Panel key={c.id} title={`${c.label} · ${list.length}`}>
                <p className="mb-2 text-[11px] text-ink-muted">{c.hint}</p>
                {list.length ? (
                  <ul className="flex flex-col divide-y divide-line/60">
                    {list.map((e) => (
                      <OpenRow key={e.key} entry={e} />
                    ))}
                  </ul>
                ) : (
                  <Empty icon={<Icon size={20} />} title={`No ${c.label.toLowerCase()} behind`}>
                    {backlog.cleared.some((e) => e.category === c.id) ? 'All caught up.' : 'Keep it that way.'}
                  </Empty>
                )}
              </Panel>
            );
          })}
        </div>

        <div className="flex flex-col gap-5 lg:col-span-4">
          <Panel title="Backlog achievements">
            <ul className="flex flex-col gap-2.5">
              {ach.map((a) => {
                const def = ACHIEVEMENTS.find((d) => d.id === a.id)!;
                return (
                  <li key={a.id} className="flex items-center gap-3">
                    <Award size={16} className={cn('shrink-0', a.earned ? 'text-arc-soft' : 'text-ink-faint')} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm', a.earned ? 'text-ink' : 'text-ink-soft')}>{def.name}</p>
                      <p className="truncate text-[11px] text-ink-muted" title={def.description}>
                        {def.description}
                      </p>
                      {!a.earned && <Bar value={a.current / a.target} tone="arc" className="mt-1" label={`${def.name} progress`} />}
                    </div>
                    {a.earned ? (
                      <Check size={14} className="text-jade" aria-label="Earned" />
                    ) : (
                      <span className="num shrink-0 text-[11px] text-ink-muted">
                        {a.current}/{a.target}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
          <ClearedPanel entries={backlog.cleared.filter((e) => filter === 'all' || e.category === filter)} />
          {backlog.waived.length > 0 && <WaivedPanel entries={backlog.waived.filter((e) => filter === 'all' || e.category === filter)} />}
        </div>
      </div>
    </div>
  );
}

/** A one-line reminder of what is owed, linking to the Backlog tab. Renders nothing when the backlog is empty. */
export function BacklogNudge({ onOpen }: { onOpen?: () => void }) {
  const { state, today } = useStore();
  const { navigate } = useUI();
  const backlog = useMemo(() => computeBacklog(state, today), [state, today]);
  if (!backlog.open.length) return null;
  const parts = BACKLOG_CATEGORIES.map((c) => [c.label.toLowerCase(), backlog.open.filter((e) => e.category === c.id).length] as const).filter(([, n]) => n);
  const go = () => {
    if (onOpen) return onOpen();
    try {
      window.localStorage.setItem(BACKLOG_TAB_KEY, 'backlog');
    } catch {
      /* lands on the last tab instead */
    }
    navigate('quests');
  };
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ember/40 bg-ember/5 px-3 py-2.5 text-sm">
      <ClipboardList size={15} className="text-ember-soft" aria-hidden="true" />
      <span className="text-ink">
        <span className="num font-semibold">{backlog.open.length}</span> in your backlog · {parts.map(([l, n]) => `${n} ${l}`).join(' · ')}
      </span>
      <Button size="sm" variant="secondary" className="ml-auto" onClick={go}>
        Clear backlog
      </Button>
    </div>
  );
}

/** Same key as the Quests page's remembered tab. */
const BACKLOG_TAB_KEY = 'ascend.quests.tab';

function EntryTags({ e }: { e: BacklogEntry }) {
  return e.domain ? <DomainTag domain={e.domain} /> : e.questId === 'daily-java' ? <Badge tone="ember">Java</Badge> : null;
}

function OpenRow({ entry: e }: { entry: BacklogEntry }) {
  const { today, act } = useStore();
  const { open, navigate } = useUI();
  const left = remaining(e);
  const moveTo: DayKey | undefined = e.category === 'revision' ? weekendDays(today, 1)[0]?.[0] : undefined;

  const detail =
    e.category === 'quest'
      ? `${left} of ${e.owed} still owed${e.paid ? ` · ${e.paid} paid back` : ''}`
      : e.category === 'plan'
        ? 'Planned and not worked on'
        : 'Revision day passed';

  const act1 = () => {
    if (e.category === 'quest') {
      if (e.questId === 'daily-java') navigate('dsa');
      else if (e.domain) open({ type: 'log', domain: e.domain });
    } else if (e.category === 'plan' && e.itemId) open({ type: 'item', itemId: e.itemId });
    else open({ type: 'focus' });
  };

  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-[1_1_260px]">
        <div className="flex items-center gap-2">
          <EntryTags e={e} />
          {e.itemId ? (
            <button type="button" className="truncate text-left text-sm text-ink hover:underline" onClick={() => open({ type: 'item', itemId: e.itemId! })}>
              {e.title}
            </button>
          ) : (
            <span className="truncate text-sm text-ink">{e.title}</span>
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-muted">
          <span className="flex items-center gap-1 text-rose">
            <CalendarDays size={11} aria-hidden="true" />
            {shortWeekday(e.day)} {formatDay(e.day)}
          </span>
          <span>· {detail}</span>
        </p>
        {e.category === 'quest' && e.owed > 1 && <Bar value={e.paid / e.owed} tone="jade" className="mt-1.5 max-w-[200px]" label={`${e.title} paid back`} />}
      </div>
      <span className="flex items-center gap-1.5">
        <Button size="sm" variant="primary" onClick={act1}>
          {e.category === 'revision' ? 'Revise' : e.category === 'plan' ? 'Work on it' : 'Log'}
        </Button>
        {moveTo && (
          <Button size="sm" variant="secondary" onClick={() => act((s, ctx) => planRevisions(s, [e.itemId!], moveTo, ctx), { success: `Moved to ${shortWeekday(moveTo)} ${formatDay(moveTo)}` })}>
            Move to {shortWeekday(moveTo)}
          </Button>
        )}
        <Button size="sm" variant="ghost" title="Write it off — it leaves the backlog without counting as cleared" onClick={() => act((s, ctx) => waiveBacklog(s, [e.key], true, ctx), { success: 'Written off. You can restore it from the list.' })}>
          Write off
        </Button>
      </span>
    </li>
  );
}

function ClearedPanel({ entries }: { entries: BacklogEntry[] }) {
  const { today } = useStore();
  const { open } = useUI();
  return (
    <Panel title={`Cleared · ${entries.length}`}>
      {entries.length ? (
        <ul className="flex max-h-[420px] flex-col divide-y divide-line/60 overflow-y-auto pr-1">
          {entries.slice(0, 60).map((e) => (
            <li key={e.key} className="flex items-center gap-2 py-2 text-xs">
              <Check size={13} className="shrink-0 text-jade" aria-hidden="true" />
              <EntryTags e={e} />
              <button type="button" disabled={!e.itemId} onClick={() => e.itemId && open({ type: 'item', itemId: e.itemId })} className="min-w-0 flex-1 truncate text-left text-ink-soft enabled:hover:text-ink">
                {e.title}
              </button>
              <span className="shrink-0 text-ink-faint" title={`Fell behind ${formatDay(e.day)}`}>
                {formatDay(e.clearedOn!, today)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-muted">Nothing cleared yet. Items you catch up on show up here.</p>
      )}
    </Panel>
  );
}

function WaivedPanel({ entries }: { entries: BacklogEntry[] }) {
  const { act } = useStore();
  if (!entries.length) return null;
  return (
    <Panel title={`Written off · ${entries.length}`}>
      <ul className="flex flex-col divide-y divide-line/60">
        {entries.map((e) => (
          <li key={e.key} className="flex items-center gap-2 py-2 text-xs">
            <EntryTags e={e} />
            <span className="min-w-0 flex-1 truncate text-ink-muted">
              {e.title} · {formatDay(e.day)}
            </span>
            <Button size="sm" variant="ghost" onClick={() => act((s, ctx) => waiveBacklog(s, [e.key], false, ctx), { success: 'Back on the backlog' })}>
              <Undo2 size={12} aria-hidden="true" /> Restore
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
