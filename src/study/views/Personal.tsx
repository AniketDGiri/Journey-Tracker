import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarPlus, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { cn } from '../lib/cn';
import { Bar, Button, Empty, Panel, Segmented } from '../components/ui';
import { SystemTag, SystemWindow } from '../components/system';
import { SubtaskList, subtaskCount } from '../components/subtasks';
import {
  RANKS,
  RANK_TONE,
  clearedXp,
  rankOf,
  rewardOf,
  sectionLabel,
  sectionPatch,
  type PersonalProject,
  type PersonalSection,
  type PersonalTask,
  type Rank,
} from '../engine/sidequests';
// The Personal data and its Dates / Projects screens are the original JS app.
import { useAppStore as useLegacyStore } from '../../store/AppStore';
import { PRIORITY, EFFORT, CategorySelect as LegacyCategorySelect } from '../../components/Personal/TaskTable';
import PersonalDates from '../../components/Personal/PersonalDates';
import Projects from '../../components/Personal/Projects';
import { dueDay, isOverdue, rangeLabel, spansDays } from '../../utils/taskDates';
import { calendarLink } from '../../utils/googleCalendar';
import { QUADRANTS, summariseDay, summariseRange } from '../../utils/timeBlocks';

// Types for the untyped JS boundary.
interface LegacyStore {
  personalTasks: PersonalTask[];
  personalSections: PersonalSection[];
  projects: PersonalProject[];
  timeLog: Record<string, unknown>;
  timeConfig: { startHour: number; endHour: number; interval: number };
  todayKey: string;
  addPersonalTask: (t: Omit<PersonalTask, 'id'>) => void;
  updatePersonalTask: (id: string, patch: Partial<PersonalTask>) => void;
  removePersonalTask: (id: string) => void;
  addPersonalSection: (name: string) => void;
}
const useLegacy = useLegacyStore as unknown as () => LegacyStore;
const CategorySelect = LegacyCategorySelect as unknown as (p: { value?: string; onChange: (v: string) => void; className?: string }) => ReactNode;

type View = 'log' | 'board' | 'calendar' | 'dungeons' | 'status';

const field = 'h-10 rounded-lg border border-line-strong bg-surface-2 px-2.5 font-sans text-sm font-normal text-ink focus:border-violet focus:outline-none';
const label = 'flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted';

function RankBadge({ rank, size = 'md' }: { rank: Rank; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn('num inline-grid shrink-0 place-items-center rounded-md border font-semibold', size === 'sm' ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-[13px]', RANK_TONE[rank])}
      aria-label={`Rank ${rank}`}
      title={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

export function Personal() {
  const store = useLegacy();
  const [view, setView] = useState<View>('log');
  const questView = view === 'log' || view === 'board';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="num text-[11px] tracking-[0.2em] text-arc-soft">LIFE · SIDE QUESTS</p>
          <p className="mt-1 text-sm text-ink-muted">Life outside the study plan. Every task lives in one pool, so Calendar always shows all of them.</p>
        </div>
        <Segmented
          label="Personal views"
          value={view}
          onChange={setView}
          options={[
            { value: 'log', label: 'Quest Log' },
            { value: 'board', label: 'Gate Board' },
            { value: 'calendar', label: 'Calendar' },
            { value: 'dungeons', label: 'Dungeons' },
            { value: 'status', label: 'Status' },
          ]}
        />
      </div>

      {questView && (
        <>
          <SystemNotice store={store} />
          <AcceptQuest store={store} />
        </>
      )}
      {view === 'log' && <QuestLog store={store} />}
      {view === 'board' && <GateBoard store={store} />}
      {view === 'calendar' && (
        <div className="legacy">
          <PersonalDates />
        </div>
      )}
      {view === 'dungeons' && (
        <div className="legacy">
          <Projects />
        </div>
      )}
      {view === 'status' && <HunterStatus store={store} />}
    </div>
  );
}

// ── System notice ───────────────────────────────────────────────────────

function SystemNotice({ store }: { store: LegacyStore }) {
  const { personalTasks: tasks, personalSections: sections, todayKey: today } = store;
  const open = tasks.filter((t) => t.section !== 'done');
  const dueToday = open.filter((t) => dueDay(t) === today).length;
  const penalty = tasks.filter((t) => isOverdue(t, today)).length;
  const headline = dueToday
    ? `You have ${dueToday} side quest${dueToday > 1 ? 's' : ''} due today.`
    : open.length
      ? 'No side quests due today.'
      : 'Your quest log is clear.';
  const sub = penalty
    ? `${penalty} quest${penalty > 1 ? 's have' : ' has'} entered the penalty zone. Clear ${penalty > 1 ? 'them' : 'it'} before taking on new ones.`
    : open.length
      ? 'Nothing is overdue. Keep it that way.'
      : 'Accept a new quest below.';
  return (
    <SystemWindow label="System notice" className="flex flex-wrap items-center gap-6">
      <div className="min-w-0 flex-[1_1_320px]">
        <SystemTag>SYSTEM</SystemTag>
        <p className="mt-2 text-lg font-semibold">{headline}</p>
        <p className="mt-1 text-sm text-ink-soft">{sub}</p>
      </div>
      <dl className="flex flex-wrap gap-x-7 gap-y-3">
        {sections.map((s) => (
          <div key={s.id}>
            <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{sectionLabel(s)}</dt>
            <dd className={cn('num mt-1 text-2xl font-semibold', s.id === 'done' && 'text-jade')}>{tasks.filter((t) => t.section === s.id).length}</dd>
          </div>
        ))}
        <div>
          <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">Penalty</dt>
          <dd className={cn('num mt-1 text-2xl font-semibold', penalty ? 'text-rose' : 'text-ink-muted')}>{penalty}</dd>
        </div>
      </dl>
    </SystemWindow>
  );
}

// ── Accept a quest ──────────────────────────────────────────────────────

const BLANK = { title: '', section: 'todo', priority: 'Medium', effort: 'Medium', category: '', start: '', end: '', notes: '', projectId: '' };

function AcceptQuest({ store }: { store: LegacyStore }) {
  const { personalSections: sections, projects, addPersonalTask } = store;
  const [draft, setDraft] = useState(BLANK);
  const set = (k: keyof typeof BLANK) => (e: { target: { value: string } }) => setDraft((p) => ({ ...p, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    addPersonalTask({ ...draft, title: draft.title.trim(), projectId: draft.projectId || null, doneAt: draft.section === 'done' ? store.todayKey : null });
    setDraft({ ...BLANK, section: draft.section, start: draft.start });
  };
  const rank = rankOf(draft);
  return (
    <form onSubmit={submit} aria-label="Accept a new quest" className="st-panel flex flex-wrap items-end gap-2.5 p-4">
      <label className={cn(label, 'min-w-[220px] flex-[1_1_260px]')}>
        New quest
        <input className={cn(field, 'normal-case tracking-normal')} placeholder="e.g. Renew passport" value={draft.title} onChange={set('title')} />
      </label>
      <label className={label}>
        Gate
        <select className={field} value={draft.section} onChange={set('section')}>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Priority
        <select className={field} value={draft.priority} onChange={set('priority')}>
          {PRIORITY.map((p: string) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        Effort
        <select className={field} value={draft.effort} onChange={set('effort')}>
          {EFFORT.map((p: string) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <div className={label}>
        Category
        <CategorySelect className={field} value={draft.category} onChange={(v) => setDraft((p) => ({ ...p, category: v }))} />
      </div>
      <label className={label}>
        Dungeon
        <select className={field} value={draft.projectId} onChange={set('projectId')}>
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Starts
        <input className={cn(field, 'num')} type="datetime-local" value={draft.start} onChange={set('start')} />
      </label>
      <label className={label}>
        Ends
        <input className={cn(field, 'num')} type="datetime-local" value={draft.end} min={draft.start || undefined} onChange={set('end')} />
      </label>
      <div className="flex items-center gap-2.5">
        <RankBadge rank={rank} />
        <Button type="submit" variant="primary" className="h-11" disabled={!draft.title.trim()}>
          Accept quest
        </Button>
      </div>
    </form>
  );
}

// ── Quest Log (list) ────────────────────────────────────────────────────

function dueTone(t: PersonalTask, today: string) {
  if (isOverdue(t, today)) return 'text-rose';
  if (t.section !== 'done' && dueDay(t) === today) return 'text-ember';
  return 'text-ink-muted';
}

function sectionTone(id: string) {
  return id === 'done' ? 'text-jade' : id === 'inprogress' ? 'text-arc-soft' : 'text-ink';
}

function QuestLog({ store }: { store: LegacyStore }) {
  const { personalTasks: tasks, personalSections: sections } = store;
  return (
    <div className="flex flex-col gap-4">
      {sections.map((s) => {
        const rows = tasks.filter((t) => t.section === s.id);
        return (
          <section key={s.id} aria-label={s.name} className="st-panel px-5 pb-2 pt-1">
            <header className="flex items-baseline gap-3 border-b border-line py-3">
              <h2 className={cn('text-[13px] font-semibold uppercase tracking-[0.14em]', sectionTone(s.id))}>{sectionLabel(s)}</h2>
              {sectionLabel(s) !== s.name && <span className="text-xs text-ink-muted">{s.name}</span>}
              <span className="num ml-auto text-xs text-ink-muted">{rows.length}</span>
            </header>
            {rows.length ? (
              <ul className="flex flex-col divide-y divide-line/60">
                {rows.map((t) => (
                  <QuestRow key={t.id} task={t} store={store} />
                ))}
              </ul>
            ) : (
              <p className="py-4 text-xs text-ink-muted">No quests here.</p>
            )}
          </section>
        );
      })}
      <AddGate store={store} />
      <p className="text-xs text-ink-muted">Rank comes from priority × effort: S is a high-priority, large job; E a low-priority, quick one. Clearing a quest earns its reward as side-quest XP, kept apart from prep XP.</p>
    </div>
  );
}

function QuestRow({ task: t, store }: { task: PersonalTask; store: LegacyStore }) {
  const { personalSections: sections, projects, updatePersonalTask: update, removePersonalTask: remove, todayKey: today } = store;
  const [open, setOpen] = useState(false);
  const done = t.section === 'done';
  const overdue = isOverdue(t, today);
  const rank = rankOf(t);
  const project = projects.find((p) => p.id === t.projectId);
  const cal = calendarLink(t);
  const subs = subtaskCount(t.subtasks);
  const subsDone = !!t.subtasks?.length && t.subtasks.every((x) => x.done);
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3.5">
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => update(t.id, sectionPatch(t, e.target.checked ? 'done' : 'todo', today))}
          aria-label={`${done ? 'Reopen' : 'Clear'} “${t.title}”`}
          className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-violet"
        />
        <RankBadge rank={rank} />
        <div className="min-w-0 flex-[1_1_260px]">
          <input
            value={t.title}
            onChange={(e) => update(t.id, { title: e.target.value })}
            aria-label="Quest title"
            className={cn('w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium hover:border-line focus:border-violet focus:outline-none', done ? 'text-ink-muted line-through' : 'text-ink')}
          />
          <p className="mt-1 flex flex-wrap items-center gap-2 px-1 text-xs text-ink-muted">
            {t.category && <span className="rounded-full border border-line-strong px-2 text-ink-soft">{t.category}</span>}
            {project && <span>{project.name}</span>}
            {subs && (
              <button type="button" onClick={() => setOpen(true)} className={cn('num hover:text-ink', subsDone ? 'text-jade' : 'text-ink-soft')} title="Subtasks done">
                ☰ {subs}
              </button>
            )}
            <span className={cn('num', dueTone(t, today))}>{rangeLabel(t)}</span>
            {spansDays(t) && <span className="rounded border border-line-strong px-1.5 text-[10px]">multi-day</span>}
          </p>
        </div>
        {overdue && <span className="num rounded-md border border-rose/50 bg-rose/10 px-2.5 py-1 text-[11px] tracking-[0.08em] text-rose">PENALTY ZONE</span>}
        <span className="num min-w-[64px] text-right text-xs text-violet-soft">+{rewardOf(t)} XP</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Edit'} details of “${t.title}”`}
          className="grid h-8 w-8 place-items-center rounded-md text-ink-muted hover:bg-surface-3 hover:text-ink"
        >
          <ChevronDown size={15} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="mt-3 flex flex-wrap items-end gap-2.5 rounded-lg border border-line bg-surface-2/50 p-3 animate-rise">
          <label className={label}>
            Starts
            <input className={cn(field, 'num')} type="datetime-local" value={t.start ?? ''} onChange={(e) => update(t.id, { start: e.target.value })} />
          </label>
          <label className={label}>
            Ends
            <input className={cn(field, 'num')} type="datetime-local" value={t.end ?? ''} min={t.start || undefined} onChange={(e) => update(t.id, { end: e.target.value })} />
          </label>
          <label className={label}>
            Priority
            <select className={field} value={t.priority ?? 'Medium'} onChange={(e) => update(t.id, { priority: e.target.value })}>
              {PRIORITY.map((p: string) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Effort
            <select className={field} value={t.effort ?? 'Medium'} onChange={(e) => update(t.id, { effort: e.target.value })}>
              {EFFORT.map((p: string) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <div className={label}>
            Category
            <CategorySelect className={field} value={t.category} onChange={(v) => update(t.id, { category: v })} />
          </div>
          <label className={label}>
            Dungeon
            <select className={field} value={t.projectId ?? ''} onChange={(e) => update(t.id, { projectId: e.target.value || null })}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Gate
            <select className={field} value={t.section} onChange={(e) => update(t.id, sectionPatch(t, e.target.value, today))}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex items-center gap-1">
            {cal && (
              <a href={cal} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs text-ink-soft hover:bg-surface-3 hover:text-ink" title="Open Google Calendar with this event prefilled">
                <CalendarPlus size={14} aria-hidden="true" /> Add to Google Calendar
              </a>
            )}
            <Button variant="ghost" size="sm" className="h-10 text-rose hover:text-rose" onClick={() => remove(t.id)}>
              <Trash2 size={14} aria-hidden="true" /> Abandon
            </Button>
          </div>
          <div className="w-full max-w-xl border-t border-line pt-3">
            <SubtaskList value={t.subtasks} onChange={(list) => update(t.id, { subtasks: list })} />
          </div>
        </div>
      )}
    </li>
  );
}

function AddGate({ store, board }: { store: LegacyStore; board?: boolean }) {
  const [name, setName] = useState('');
  return (
    <form
      className={cn('flex gap-2', board && 'flex-col')}
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        store.addPersonalSection(name.trim());
        setName('');
      }}
    >
      <input className={cn(field, 'min-w-0 flex-1')} placeholder="New gate (section)…" aria-label="New section name" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit" variant="secondary" className="h-10" disabled={!name.trim()}>
        <Plus size={14} aria-hidden="true" /> Open a new gate
      </Button>
    </form>
  );
}

// ── Gate Board (kanban) ─────────────────────────────────────────────────

function GateBoard({ store }: { store: LegacyStore }) {
  const { personalTasks: tasks, personalSections: sections, projects, updatePersonalTask: update, removePersonalTask: remove, todayKey: today } = store;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex min-w-max gap-4">
        {sections.map((s) => {
          const cards = tasks.filter((t) => t.section === s.id);
          const active = s.id === 'inprogress';
          return (
            <section
              key={s.id}
              aria-label={s.name}
              onDragOver={(e) => {
                e.preventDefault();
                setOverId(s.id);
              }}
              onDragLeave={() => setOverId((p) => (p === s.id ? null : p))}
              onDrop={(e) => {
                e.preventDefault();
                const dragged = tasks.find((x) => x.id === dragId);
                if (dragged) update(dragged.id, sectionPatch(dragged, s.id, today));
                setDragId(null);
                setOverId(null);
              }}
              className={cn(
                'flex w-[280px] flex-col gap-2.5 rounded-xl border bg-surface p-3.5 transition-colors',
                overId === s.id ? 'border-violet bg-violet/5' : active ? 'border-arc-soft/45 shadow-glow-arc' : 'border-line',
              )}
            >
              <header className="flex items-center gap-2.5 border-b border-line px-0.5 pb-2.5">
                <span aria-hidden="true" className={cn('h-2 w-2 rotate-45 rounded-[2px]', s.id === 'done' ? 'bg-jade' : active ? 'bg-arc-soft' : 'bg-ink-soft')} />
                <h2 className={cn('text-xs font-semibold uppercase tracking-[0.16em]', sectionTone(s.id))}>{sectionLabel(s)}</h2>
                {sectionLabel(s) !== s.name && <span className="text-xs text-ink-muted">{s.name}</span>}
                <span className="num ml-auto text-xs text-ink-muted">{cards.length}</span>
              </header>
              {cards.map((t) => {
                const done = t.section === 'done';
                const overdue = isOverdue(t, today);
                const project = projects.find((p) => p.id === t.projectId);
                const cal = calendarLink(t);
                return (
                  <article
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn('flex cursor-grab flex-col gap-2.5 rounded-lg border border-line-strong bg-surface-2 p-3 active:cursor-grabbing', dragId === t.id && 'opacity-50')}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={(e) => update(t.id, sectionPatch(t, e.target.checked ? 'done' : 'todo', today))}
                        aria-label={`${done ? 'Reopen' : 'Clear'} “${t.title}”`}
                        className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer accent-violet"
                      />
                      <RankBadge rank={rankOf(t)} size="sm" />
                      <p className={cn('min-w-0 flex-1 pt-1 text-sm font-medium leading-snug', done ? 'text-ink-muted line-through' : 'text-ink')}>{t.title}</p>
                      <button type="button" onClick={() => remove(t.id)} aria-label={`Abandon “${t.title}”`} className="rounded-md p-1.5 text-ink-faint hover:bg-surface-3 hover:text-rose">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                      {t.category && <span className="rounded-full border border-line-strong px-2 text-ink-soft">{t.category}</span>}
                      {project && <span className="truncate">{project.name}</span>}
                      <span className={cn('num', dueTone(t, today))}>{rangeLabel(t)}</span>
                      <span className="num ml-auto text-violet-soft">+{rewardOf(t)} XP</span>
                    </div>
                    {overdue && <p className="num rounded-md bg-rose/10 px-2 py-1.5 text-[11px] tracking-[0.06em] text-rose">PENALTY ZONE</p>}
                    <div className="flex items-center gap-2">
                      <select
                        value={t.section}
                        onChange={(e) => update(t.id, sectionPatch(t, e.target.value, today))}
                        aria-label={`Move “${t.title}” to another gate`}
                        className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-xs text-ink-soft focus:border-violet focus:outline-none"
                      >
                        {sections.map((x) => (
                          <option key={x.id} value={x.id}>
                            Move to {x.name}
                          </option>
                        ))}
                      </select>
                      {cal && (
                        <a href={cal} target="_blank" rel="noreferrer" aria-label="Add to Google Calendar" title="Add to Google Calendar" className="grid h-8 w-8 place-items-center rounded-md text-ink-muted hover:bg-surface-3 hover:text-ink">
                          <CalendarPlus size={14} />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
              {cards.length === 0 && <p className="py-3 text-center text-xs text-ink-muted">Nothing here yet</p>}
            </section>
          );
        })}
        <div className="w-[220px] shrink-0 self-start rounded-xl border border-dashed border-line-strong p-3.5">
          <AddGate store={store} board />
        </div>
      </div>
    </div>
  );
}

// ── Hunter Status (dashboard) ───────────────────────────────────────────

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
] as const;

const pct = (v: number) => `${Math.round(v * 100)}%`;

function HunterStatus({ store }: { store: LegacyStore }) {
  const { timeLog, timeConfig, personalTasks: tasks, personalSections: sections, todayKey: today } = store;
  const [range, setRange] = useState<'7' | '30' | '90'>('7');
  const days = Number(range);

  const dateKeys = useMemo(() => {
    const end = parseISO(today);
    return Array.from({ length: days }, (_, i) => format(addDays(end, -i), 'yyyy-MM-dd'));
  }, [days, today]);
  const sum = useMemo(() => summariseRange(timeLog, timeConfig, dateKeys), [timeLog, timeConfig, dateKeys]);
  const daily = useMemo(
    () => [...dateKeys].reverse().map((k) => ({ key: k, label: format(parseISO(k), 'dd MMM'), ...summariseDay(timeLog[k], timeConfig) })),
    [dateKeys, timeLog, timeConfig],
  );
  const maxHours = Math.max(1, ...daily.map((d) => d.trackedHours));
  const happy = daily.filter((d) => d.happy === 'yes' && d.trackedSlots > 0);
  const unhappy = daily.filter((d) => d.happy === 'no' && d.trackedSlots > 0);
  const avgQ2 = (list: typeof daily) => (list.length ? list.reduce((a, d) => a + d.pct.q2, 0) / list.length : null);

  const overdue = tasks.filter((t) => isOverdue(t, today)).length;
  const cleared = tasks.filter((t) => t.section === 'done').length;
  const byRank = RANKS.map((r) => ({ r, n: tasks.filter((t) => rankOf(t) === r).length }));
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      const c = t.category?.trim() || 'Uncategorised';
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [tasks]);

  const stats = [
    { key: 'PRESENCE', value: `${sum.daysTracked} / ${days}`, label: 'Days tracked' },
    { key: 'STAMINA', value: `${sum.trackedHours}h`, label: 'Hours tracked' },
    { key: 'FOCUS', value: pct(sum.important.yes), label: 'Important work' },
    { key: 'PRESSURE', value: pct(sum.urgent.yes), label: 'Urgent work' },
    { key: 'MORALE', value: sum.happyAnswered ? pct(sum.happyRate) : '—', label: sum.happyAnswered ? `Good days · ${sum.happyAnswered} answered` : 'Good days · not answered yet' },
  ];
  const QUAD_TONE: Record<string, string> = { q1: 'text-ember', q2: 'text-jade', q3: 'text-arc-soft', q4: 'text-ink-soft' };

  return (
    <div className="flex flex-col gap-5">
      <SystemWindow label="Status window">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <SystemTag>STATUS</SystemTag>
            <p className="mt-2 text-xl font-semibold">Where your time actually goes</p>
          </div>
          <Segmented label="Range" size="sm" value={range} onChange={setRange} options={[...RANGES]} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <div key={s.key}>
              <dt className="num text-xs tracking-[0.14em] text-arc-soft">{s.key}</dt>
              <dd className="mt-1.5">
                <span className="num block text-2xl font-semibold">{s.value}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{s.label}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[11px] text-ink-muted">From the Time tab's log of each half-hour.</p>
      </SystemWindow>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Mana allocation · Eisenhower split">
          {sum.trackedSlots === 0 ? (
            <Empty title="Nothing tracked in this range yet" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {QUADRANTS.map((q: { id: string; label: string; short: string }) => (
                  <div key={q.id} className={cn('flex flex-col gap-1 rounded-lg border p-3.5', q.id === 'q2' ? 'border-jade/50 bg-jade/5' : 'border-line-strong bg-surface-2')}>
                    <span className={cn('num text-2xl font-semibold', QUAD_TONE[q.id])}>{pct(sum.pct[q.id])}</span>
                    <span className="text-sm font-medium">{q.label}</span>
                    <span className="text-xs text-ink-muted">
                      {q.short} · {sum.hours[q.id]}h
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                Grow <strong className="text-ink">Important, not urgent</strong>: it is the work that stops things becoming urgent later.
              </p>
            </>
          )}
        </Panel>

        <Panel title="Does deliberate time make better days?">
          {happy.length === 0 && unhappy.length === 0 ? (
            <Empty title="Not enough answers yet">Answer the daily happiness question in Time a few times to see this.</Empty>
          ) : (
            <div className="flex flex-col gap-3.5">
              {[
                { l: 'Good days', v: avgQ2(happy), n: happy.length, tone: 'jade' as const },
                { l: 'Bad days', v: avgQ2(unhappy), n: unhappy.length, tone: 'muted' as const },
              ].map((r) => (
                <div key={r.l} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-ink-soft">{r.l}</span>
                  <Bar value={r.v ?? 0} tone={r.tone} label={`${r.l} share of important work`} />
                  <span className="num w-11 text-right text-sm">{r.n ? pct(r.v ?? 0) : '—'}</span>
                </div>
              ))}
              <p className="text-xs text-ink-muted">
                Average share of the day on important-but-not-urgent work, split by how you rated the day ({happy.length} good, {unhappy.length} bad).
              </p>
            </div>
          )}
          <p className="st-label mb-2 mt-5">Biggest time sinks</p>
          {sum.topTasks.length === 0 ? (
            <p className="text-xs text-ink-muted">Nothing tracked yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {sum.topTasks.map((k: { task: string; hours: number }) => (
                <li key={k.task} className="flex items-center gap-3 text-sm">
                  <span className="w-36 truncate text-ink-soft">{k.task}</span>
                  <Bar value={k.hours / sum.topTasks[0].hours} label={`${k.task} hours`} />
                  <span className="num w-12 text-right">{k.hours}h</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Hours tracked per day">
          {sum.daysTracked === 0 ? (
            <Empty title="Nothing tracked yet" />
          ) : (
            <>
              <div className="flex h-40 items-end gap-1.5 border-b border-line" role="img" aria-label={`Hours tracked per day: ${daily.map((d) => `${d.label} ${d.trackedHours}h`).join(', ')}`}>
                {daily.map((d) => (
                  <div key={d.key} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.trackedHours}h`}>
                    <div className={cn('rounded-t-[3px]', d.happy === 'yes' ? 'bg-jade' : 'bg-violet-deep')} style={{ height: `${(d.trackedHours / maxHours) * 100}%`, minHeight: d.trackedHours ? 3 : 0 }} />
                  </div>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] bg-jade" /> Rated a good day
              </p>
            </>
          )}
        </Panel>

        <Panel title="Quest record">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-muted">Total</dt>
              <dd className="num mt-1 text-2xl font-semibold">{tasks.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Cleared</dt>
              <dd className="num mt-1 text-2xl font-semibold text-jade">{cleared}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Penalty</dt>
              <dd className={cn('num mt-1 text-2xl font-semibold', overdue ? 'text-rose' : 'text-ink-muted')}>{overdue}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Side-quest XP</dt>
              <dd className="num mt-1 text-2xl font-semibold text-violet-soft">{clearedXp(tasks)}</dd>
            </div>
          </dl>
          <p className="st-label mb-2 mt-5">By gate</p>
          <ul className="flex flex-col gap-2">
            {sections.map((s) => {
              const n = tasks.filter((t) => t.section === s.id).length;
              return (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="w-28 truncate text-ink-soft">{s.name}</span>
                  <Bar value={tasks.length ? n / tasks.length : 0} tone={s.id === 'done' ? 'jade' : 'violet'} label={`${s.name} share`} />
                  <span className="num w-8 text-right">{n}</span>
                </li>
              );
            })}
          </ul>
          <p className="st-label mb-2 mt-5">By rank</p>
          <div className="flex flex-wrap gap-2">
            {byRank.map(({ r, n }) => (
              <span key={r} className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs text-ink-soft">
                <span className={cn('num font-semibold', RANK_TONE[r].split(' ')[0])}>{r}</span>
                {n}
              </span>
            ))}
          </div>
          {byCategory.length > 0 && (
            <>
              <p className="st-label mb-2 mt-5">By category</p>
              <div className="flex flex-wrap gap-2">
                {byCategory.map(([c, n]) => (
                  <span key={c} className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-soft">
                    {c} · {n}
                  </span>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
