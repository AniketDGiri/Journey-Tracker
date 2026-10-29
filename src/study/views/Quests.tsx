import { useMemo, useState, type ReactNode } from 'react';
import { Award, Check, ChevronLeft, ChevronRight, Crown, Flame, Lock, TriangleAlert, X } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { availableDailyQuests, dailyQuests, missions, monthlyChallenges, requiredOf, weeklyChallenges, type Quest } from '../engine/quests';
import { claimQuest, setQuestPlan } from '../engine/actions';
import { bossStatuses } from '../engine/bosses';
import { ACHIEVEMENTS, ACHIEVEMENT_GROUPS, evaluateAchievements } from '../engine/achievements';
import { RANKS, totalXpForLevel } from '../engine/progression';
import { addDays, addMonths, diffDays, endOfMonth, formatDay, monthLabel, monthYear, shortWeekday, startOfMonth, startOfWeek } from '../lib/date';
import { cn } from '../lib/cn';
import { Badge, Bar, Button, Panel, Ring, Segmented } from '../components/ui';
import { QuestList } from '../components/progress';
import { Planner } from '../components/planner';
import { DomainTag } from '../components/bits';
import { PenaltyZone, SystemTag, SystemWindow } from '../components/system';
import { atStakeToday, judgeDay, penaltiesActive, penaltyLog, penaltyZone, type PenaltyEntry } from '../engine/penalties';
import { missLabel } from '../engine/missed';
import { MissBreakdownPanel, MissReasonNote, MissedDayPrompt } from '../components/missed';

type Tab = 'daily' | 'weekly' | 'monthly' | 'planner' | 'bosses' | 'achievements';

const TAB_KEY = 'ascend.quests.tab';

function readTab(): Tab {
  try {
    const t = window.localStorage.getItem(TAB_KEY) as Tab | null;
    return t && ['daily', 'weekly', 'monthly', 'planner', 'bosses', 'achievements'].includes(t) ? t : 'daily';
  } catch {
    return 'daily';
  }
}

// Counts only cover required quests; bonus quests are extra credit.
const doneOf = (qs: Quest[]) => requiredOf(qs).filter((q) => q.complete).length;
const totalOf = (qs: Quest[]) => requiredOf(qs).length;

// ── Quest objectives (System style) ─────────────────────────────────────

/** One quest as a System objective: check, title, progress and its action or reward. */
function Objective({ q, day }: { q: Quest; day?: string }) {
  const { state, act } = useStore();
  const { open, navigate } = useUI();
  const go = () => {
    const a = q.action;
    if (!a) return;
    // Logging from a past day records the work on that day, so it counts toward that day's quests.
    if (a.type === 'log') open({ type: 'log', domain: a.domain, date: day });
    else if (a.type === 'revise') open({ type: 'focus' });
    else navigate(a.to);
  };
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-full border',
          q.claimed ? 'border-jade/60 bg-jade/15 text-jade' : q.complete ? 'border-arc-soft bg-arc/20 text-arc-soft shadow-glow-arc' : 'border-line-strong text-ink-faint',
        )}
        aria-hidden="true"
      >
        {q.complete ? <Check size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {q.domain && <DomainTag domain={q.domain} />}
          {q.bonus && <Badge tone="ember">Bonus</Badge>}
          <p className={cn('truncate text-sm', q.claimed ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>{q.title}</p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Bar value={q.progress / q.target} tone={q.complete ? 'jade' : 'arc'} className="max-w-[240px]" label={`${q.title} progress`} />
          <span className="num text-[11px] text-ink-muted">
            {q.progress}/{q.target}
          </span>
          <span className="hidden truncate text-[11px] text-ink-muted sm:inline">· {q.detail}</span>
        </div>
      </div>
      {q.claimed ? (
        <span className="text-xs text-jade">Claimed</span>
      ) : q.complete && state.settings.gamification ? (
        <Button size="sm" variant="primary" onClick={() => act((s, ctx) => claimQuest(s, q, ctx), { success: q.title })}>
          Claim +{q.reward}
        </Button>
      ) : q.complete ? (
        <span className="text-xs text-jade">Done</span>
      ) : q.action ? (
        <Button size="sm" variant="secondary" onClick={go}>
          {q.action.type === 'log' ? 'Log' : q.action.type === 'revise' ? 'Revise' : 'Go'}
        </Button>
      ) : (
        <span className="num text-[11px] text-violet-soft">+{q.reward}</span>
      )}
    </li>
  );
}

/** The System window holding one cadence's quests. */
function QuestWindow({ tag, title, subtitle, quests, extra, footer, day }: { tag: string; title: string; subtitle: string; quests: Quest[]; extra?: ReactNode; footer?: ReactNode; day?: string }) {
  const done = doneOf(quests);
  const total = totalOf(quests);
  const all = total > 0 && done === total;
  return (
    <SystemWindow label={tag}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <SystemTag>{tag}</SystemTag>
          <h2 className="mt-2 text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        </div>
        <Ring value={total ? done / total : 0} size={64} stroke={3} tone={all ? 'jade' : 'arc'} label={`${done} of ${total} complete`}>
          <span className="num text-base font-semibold">
            {done}/{total}
          </span>
        </Ring>
      </div>
      {extra}
      {quests.length ? (
        <ul className="mt-2 flex flex-col divide-y divide-line/70">
          {[...quests].sort((a, b) => Number(!!a.bonus) - Number(!!b.bonus)).map((q) => (
            <Objective key={q.ref} q={q} day={day} />
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-ink-muted">No quests here.</p>
      )}
      {footer && <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs">{footer}</div>}
    </SystemWindow>
  );
}

const PERIOD = { day: ['daily', 'today'], week: ['weekly', 'this week'], month: ['monthly', 'this month'] } as const;

function StatusLine({ quests, period }: { quests: Quest[]; period: keyof typeof PERIOD }) {
  const [kind, when] = PERIOD[period];
  const done = doneOf(quests);
  const total = totalOf(quests);
  const unclaimed = quests.filter((q) => q.complete && !q.claimed).length;
  if (total && done === total)
    return <span className="text-jade">Every {kind} quest complete.{unclaimed ? ` ${unclaimed} reward${unclaimed > 1 ? 's' : ''} waiting to be claimed.` : ''}</span>;
  return (
    <span className="flex items-center gap-1.5 text-ember-soft">
      <TriangleAlert size={13} aria-hidden="true" /> {total - done} left {when}.{unclaimed ? ` ${unclaimed} ready to claim.` : ''}
    </span>
  );
}

/** A strip of past periods: each cell is a day, week or month and how many of its quests were completed. */
function HistoryStrip({ title, cells, note }: { title: string; cells: { key: string; top: string; done: number; total: number; current?: boolean; why?: string }[]; note?: string }) {
  return (
    <Panel title={title}>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cells.length <= 8 ? cells.length : 7}, minmax(0, 1fr))` }}>
        {cells.map((c) => {
          const all = c.total > 0 && c.done === c.total;
          const some = !all && c.done > 0;
          return (
            <li
              key={c.key}
              title={`${c.top}: ${c.done}/${c.total}${c.why ? ` · ${c.why}` : ''}`}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2',
                all ? 'border-jade bg-jade/25' : some ? 'border-arc-soft/70 bg-arc/20' : c.current ? 'border-line-strong' : 'border-line',
              )}
            >
              <span className={cn('text-[10px] uppercase', all ? 'font-semibold text-jade' : some ? 'text-arc-soft' : 'text-ink-muted')}>{c.top}</span>
              {all ? (
                <Check size={16} strokeWidth={3} className="text-jade" aria-hidden="true" />
              ) : c.current && !some ? (
                <span className="h-4" />
              ) : some ? (
                <span className="flex h-4 w-full items-center px-1" aria-hidden="true">
                  <span className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                    <span className="block h-full rounded-full bg-arc-soft" style={{ width: `${(c.done / c.total) * 100}%` }} />
                  </span>
                </span>
              ) : c.total ? (
                <X size={14} className="text-ink-faint" aria-hidden="true" />
              ) : (
                <span className="text-[10px] text-ink-faint">—</span>
              )}
              <span className={cn('num text-[10px]', all ? 'font-semibold text-jade' : some ? 'text-arc-soft' : 'text-ink-muted')}>{c.total ? `${c.done}/${c.total}` : ''}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-jade bg-jade/40" aria-hidden="true" /> All complete
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-arc-soft/70 bg-arc/30" aria-hidden="true" /> Some complete
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-line" aria-hidden="true" /> None
        </span>
        {note && <span>{note}</span>}
      </p>
    </Panel>
  );
}

// ── Daily ───────────────────────────────────────────────────────────────

function DailyTab() {
  const { state, today, act } = useStore();
  const [day, setDay] = useState(today);
  const [editing, setEditing] = useState(false);
  const isPast = day < today;
  const planning = !isPast && (editing || day > today);
  const available = useMemo(() => availableDailyQuests(state, day), [state, day]);
  const chosen = useMemo(() => dailyQuests(state, day), [state, day]);
  const picked = new Set(chosen.map((q) => q.id));
  const hasPlan = !!state.questPlan?.[day];
  const zone = useMemo(() => penaltyZone(state, today), [state, today]);
  const stake = useMemo(() => atStakeToday(state, today), [state, today]);
  const log = useMemo(() => penaltyLog(state, 15), [state]);
  const history = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => {
        const qs = dailyQuests(state, d);
        const why = state.missReasons?.[d];
        return { key: d, top: d === today ? 'Today' : shortWeekday(d), done: doneOf(qs), total: totalOf(qs), current: d === today, why: why && `${missLabel(why.reason)}${why.note ? `: ${why.note}` : ''}` };
      }),
    [state, today],
  );

  const save = (ids: string[] | null) => act((s) => setQuestPlan(s, day, ids), { silent: true });
  const toggle = (id: string) => save(available.filter((q) => (q.id === id ? !picked.has(id) : picked.has(q.id))).map((q) => q.id));
  const go = (to: string) => {
    setDay(to);
    setEditing(false);
  };

  const dayNav = (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button size="sm" variant="ghost" onClick={() => go(addDays(day, -1))} aria-label="Previous day">
        <ChevronLeft size={14} />
      </Button>
      <span className="min-w-[7rem] text-center text-sm font-medium">{formatDay(day, today)}</span>
      <Button size="sm" variant="ghost" onClick={() => go(addDays(day, 1))} aria-label="Next day">
        <ChevronRight size={14} />
      </Button>
      <input type="date" value={day} onChange={(e) => e.target.value && go(e.target.value)} aria-label="Pick a date" className="st-input num h-8 w-40 py-1 text-xs" />
      {day !== today && (
        <Button size="sm" variant="ghost" onClick={() => go(today)}>
          Today
        </Button>
      )}
      {!isPast && !planning && (
        <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setEditing(true)}>
          Choose quests
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {zone && (
        <PenaltyZone
          lost={zone.lost}
          recover={zone.recover}
          survived={zone.survived}
          missed={`You left ${zone.missed} daily quest${zone.missed === 1 ? '' : 's'} unfinished yesterday.`}
          what="complete every daily quest"
        />
      )}
      <MissedDayPrompt />
      {planning ? (
        <SystemWindow label="Choose daily quests">
          <SystemTag>DAILY QUEST · {formatDay(day, today).toUpperCase()}</SystemTag>
          <h2 className="mt-2 text-lg font-semibold">Choose the quests you’ll take on</h2>
          <p className="mt-1 text-sm text-ink-soft">Only the ones you tick count for {day === today ? 'today' : 'that day'} and show on your dashboard.</p>
          {dayNav}
          <ul className="mt-2 flex flex-col divide-y divide-line/70">
            {available.map((q) => (
              <li key={q.id}>
                <label className="flex cursor-pointer items-center gap-3 py-3">
                  <input type="checkbox" checked={picked.has(q.id)} onChange={() => toggle(q.id)} className="h-4 w-4 accent-violet" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {q.domain && <DomainTag domain={q.domain} />}
                      {q.bonus && <Badge tone="ember">Bonus</Badge>}
                      <span className="truncate text-sm">{q.title}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">{q.detail}</p>
                  </div>
                  {state.settings.gamification && <span className="num text-[11px] text-violet-soft">+{q.reward}</span>}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="num text-[11px] text-ink-muted">
              {picked.size} of {available.length} selected
            </span>
            <span className="ml-auto flex gap-2">
              {hasPlan && (
                <Button size="sm" variant="ghost" onClick={() => save(null)}>
                  Select all
                </Button>
              )}
              {day <= today && (
                <Button size="sm" variant="primary" onClick={() => setEditing(false)}>
                  Done
                </Button>
              )}
            </span>
          </div>
        </SystemWindow>
      ) : (
        <QuestWindow
          tag="DAILY QUEST"
          title={day === today ? 'Sharpen the blade today' : `Daily quests · ${formatDay(day, today)}`}
          subtitle="Complete them from what you log, then claim the reward. Resets at midnight."
          quests={chosen}
          day={isPast ? day : undefined}
          extra={
            <>
              {dayNav}
              {isPast && <MissReasonNote day={day} failed={judgeDay(state, day).failed && day >= state.settings.penaltiesSince} />}
            </>
          }
          footer={
            <>
              <StatusLine quests={chosen} period="day" />
              {day === today && stake && stake.missed > 0 && (
                <span className="text-rose">
                  Unfinished at midnight: <span className="num font-semibold">−{stake.xp} XP</span>
                  {stake.multiplier > 1 && ` (×${stake.multiplier} repeat)`}
                </span>
              )}
              {state.settings.gamification && (
                <span className="ml-auto text-ink-muted">
                  <span className="num text-violet-soft">+{state.settings.xp.dailyQuest} XP</span> each
                </span>
              )}
            </>
          }
        />
      )}
      <HistoryStrip title="Last 14 days" cells={history} note="Days count the quests you chose for them. Hover a missed day to see why." />
      <MissBreakdownPanel />
      {(log.length > 0 || penaltiesActive(state)) && <PenaltyLog entries={log} />}
    </div>
  );
}

/** Every penalty and recovery, so a missed day stays visible instead of quietly forgotten. */
function PenaltyLog({ entries }: { entries: PenaltyEntry[] }) {
  const { today } = useStore();
  return (
    <Panel title="Penalty log">
      {entries.length ? (
        <ul className="flex flex-col divide-y divide-line/60">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2 text-xs">
              <span className={cn('num w-12 shrink-0 font-semibold', e.amount < 0 ? 'text-rose' : e.amount > 0 ? 'text-jade' : 'text-ink-muted')}>
                {e.amount > 0 ? `+${e.amount}` : e.amount === 0 ? '0' : e.amount}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-soft" title={e.reason}>
                {e.reason}
              </span>
              <span className="shrink-0 text-ink-faint">{formatDay(e.date, today)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-muted">No penalties. Keep it that way.</p>
      )}
      <p className="mt-3 text-[11px] text-ink-muted">
        A missed daily quest costs its reward; repeats cost ×1.5, then ×2. Clear every quest the next day to win half back. Rest days and shield days are exempt, and your rank is never lost.
      </p>
    </Panel>
  );
}

// ── Weekly ──────────────────────────────────────────────────────────────

function WeeklyTab() {
  const { state, today } = useStore();
  const weekly = useMemo(() => weeklyChallenges(state, today), [state, today]);
  const ws = startOfWeek(today);
  const left = diffDays(today, addDays(ws, 6));
  const history = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => addDays(ws, (i - 7) * 7)).map((w) => {
        const qs = weeklyChallenges(state, w);
        return { key: w, top: w === ws ? 'This wk' : formatDay(w), done: doneOf(qs), total: totalOf(qs), current: w === ws };
      }),
    [state, ws],
  );
  return (
    <div className="flex flex-col gap-5">
      <QuestWindow
        tag="WEEKLY QUEST"
        title="Prove it across the week"
        subtitle={`${formatDay(ws)} – ${formatDay(addDays(ws, 6))} · ${left === 0 ? 'ends tonight' : `ends in ${left} day${left > 1 ? 's' : ''}`}. Resets Monday.`}
        quests={weekly}
        footer={
          <>
            <StatusLine quests={weekly} period="week" />
            {penaltiesActive(state) && doneOf(weekly) * 2 < totalOf(weekly) && (
              <span className="text-rose">
                Under half by Sunday: <span className="num font-semibold">−{Math.round(state.settings.xp.weeklyChallenge * 0.5)} XP</span>
              </span>
            )}
            {state.settings.gamification && (
              <span className="ml-auto text-ink-muted">
                <span className="num text-violet-soft">+{state.settings.xp.weeklyChallenge} XP</span> each
              </span>
            )}
          </>
        }
      />
      <HistoryStrip title="Last 8 weeks" cells={history} />
    </div>
  );
}

// ── Monthly ─────────────────────────────────────────────────────────────

function MonthlyTab() {
  const { state, today } = useStore();
  const monthly = useMemo(() => monthlyChallenges(state, today), [state, today]);
  const ms = startOfMonth(today);
  const left = diffDays(today, endOfMonth(today));
  const history = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => addMonths(ms, i - 5)).map((m) => {
        // A past month is judged at its last day; the current one as of today.
        const qs = monthlyChallenges(state, m === ms ? today : endOfMonth(m));
        return { key: m, top: m === ms ? 'This mo' : monthLabel(m), done: doneOf(qs), total: totalOf(qs), current: m === ms };
      }),
    [state, ms, today],
  );
  return (
    <div className="flex flex-col gap-5">
      <QuestWindow
        tag="MONTHLY QUEST"
        title="The long hunt"
        subtitle={`${monthYear(today)} · ${left === 0 ? 'ends tonight' : `${left} day${left > 1 ? 's' : ''} left`}. Sized from your daily targets in Settings.`}
        quests={monthly}
        footer={
          <>
            <StatusLine quests={monthly} period="month" />
            {penaltiesActive(state) && doneOf(monthly) * 2 < totalOf(monthly) && (
              <span className="text-rose">
                Under half by month end: <span className="num font-semibold">−{Math.round(state.settings.xp.monthlyChallenge * 0.5)} XP</span>
              </span>
            )}
            {state.settings.gamification && (
              <span className="ml-auto text-ink-muted">
                <span className="num text-violet-soft">+{state.settings.xp.monthlyChallenge} XP</span> each
              </span>
            )}
          </>
        }
      />
      <HistoryStrip title="Last 6 months" cells={history} />
    </div>
  );
}

// ── Bosses & missions ───────────────────────────────────────────────────

function BossesTab() {
  const { state, derived } = useStore();
  const { open } = useUI();
  const mission = useMemo(() => missions(state, derived.stats).slice(0, 8), [state, derived.stats]);
  const bosses = useMemo(() => bossStatuses(state, derived.stats), [state, derived.stats]);
  return (
    <div className="flex flex-col gap-5">
      <SystemWindow label="Boss battles">
        <SystemTag>BOSS BATTLES</SystemTag>
        <p className="mt-2 text-sm text-ink-soft">Timed, rubric-scored assessments. Score 80 or more to defeat one.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {bosses.map((b) => (
            <button
              key={b.boss.id}
              onClick={() => open({ type: 'boss', bossId: b.boss.id })}
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors',
                b.defeated ? 'border-jade/40 bg-jade/[0.06]' : b.unlocked ? 'border-violet/50 bg-violet/[0.06] hover:bg-violet/10' : 'border-dashed border-line hover:border-line-strong',
              )}
            >
              <span className="flex items-center gap-2">
                {b.unlocked ? <Crown size={14} className={b.defeated ? 'text-jade' : 'text-violet-soft'} aria-hidden="true" /> : <Lock size={14} className="text-ink-faint" aria-hidden="true" />}
                <span className="text-sm font-medium">{b.boss.name}</span>
                <span className="ml-auto">
                  <DomainTag domain={b.boss.domain} />
                </span>
              </span>
              <span className="line-clamp-2 text-xs text-ink-muted">{b.boss.challenge}</span>
              {b.unlocked ? (
                <span className="text-[11px] text-ink-soft">
                  {b.defeated ? `Defeated · best ${b.bestScore}` : b.attempts ? `Best ${b.bestScore} · ${b.attempts} attempt${b.attempts > 1 ? 's' : ''}` : `Ready · ${b.boss.timeLimitMin} min`}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Bar value={b.progress} tone="muted" label={`${b.boss.name} unlock progress`} />
                  <span className="num text-[11px] text-ink-muted">{Math.round(b.progress * 100)}%</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </SystemWindow>
      <Panel title="Missions · prove and master topics">
        {mission.length ? <QuestList quests={mission} /> : <p className="text-xs text-ink-muted">Start any topic to receive its missions.</p>}
      </Panel>
    </div>
  );
}

// ── Achievements, ranks & ledger ────────────────────────────────────────

function AchievementsTab() {
  const { state, today, derived } = useStore();
  const ach = useMemo(() => evaluateAchievements({ state, today, streak: derived.streak }), [state, today, derived.streak]);
  const nextUp = useMemo(
    () =>
      ach
        .filter((a) => !a.earned && a.current > 0)
        .sort((x, y) => y.current / y.target - x.current / x.target)
        .slice(0, 3)
        .map((a) => ({ a, def: ACHIEVEMENTS.find((d) => d.id === a.id)! })),
    [ach],
  );
  const ledger = useMemo(() => [...state.xp].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 40), [state.xp]);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <Panel className="lg:col-span-7" title={`Achievements · ${ach.filter((a) => a.earned).length}/${ach.length}`}>
        {nextUp.length > 0 && (
          <div className="mb-5 rounded-xl border border-arc-soft/30 bg-arc/[0.05] p-3.5">
            <p className="st-label mb-2">Closest to unlocking</p>
            <ul className="flex flex-col gap-2.5">
              {nextUp.map(({ a, def }) => (
                <li key={a.id} className="flex items-center gap-3">
                  <Award size={16} className="shrink-0 text-arc-soft" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {def.name} <span className="text-[11px] text-ink-muted">· {def.description}</span>
                    </p>
                    <Bar value={a.current / a.target} tone="arc" className="mt-1.5" label={`${def.name} progress`} />
                  </div>
                  <span className="num shrink-0 text-[11px] text-ink-soft">
                    {a.current}/{a.target}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-col gap-5">
          {ACHIEVEMENT_GROUPS.map((group) => {
            const list = ach.filter((a) => ACHIEVEMENTS.find((d) => d.id === a.id)?.group === group);
            if (!list.length) return null;
            return (
              <section key={group} aria-label={group}>
                <p className="st-label mb-2">
                  {group} <span className="num text-ink-faint">· {list.filter((a) => a.earned).length}/{list.length}</span>
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {list.map((a) => {
                    const def = ACHIEVEMENTS.find((d) => d.id === a.id)!;
                    return (
                      <li key={a.id} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5', a.earned ? 'border-arc-soft/35 bg-arc/[0.05]' : 'border-line')}>
                        <Award size={16} className={a.earned ? 'text-arc-soft' : 'text-ink-faint'} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm', a.earned ? 'text-ink' : 'text-ink-soft')}>{def.name}</p>
                          <p className="truncate text-[11px] text-ink-muted" title={def.description}>
                            {def.description}
                          </p>
                          {!a.earned && <Bar value={a.current / a.target} tone="muted" className="mt-1.5" label={`${def.name} progress`} />}
                        </div>
                        {a.earned ? (
                          <Badge tone="arc">{formatDay(state.achievements[a.id] ?? today, today)}</Badge>
                        ) : (
                          <span className="num text-[11px] text-ink-muted">
                            {a.current}/{a.target}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </Panel>

      <div className="flex flex-col gap-5 lg:col-span-5">
        <Panel title="Ranks">
          <ol className="flex flex-col gap-2">
            {RANKS.map((r) => {
              const reached = derived.level.level >= r.minLevel;
              const current = derived.level.rank.name === r.name;
              return (
                <li key={r.name} className={cn('flex items-center gap-3 rounded-lg px-3 py-2', current && 'bg-arc/10 ring-1 ring-arc-soft/40')}>
                  <span className={cn('h-2 w-2 rounded-full', reached ? 'bg-arc-soft' : 'bg-surface-3')} aria-hidden="true" />
                  <span className={cn('w-24 text-sm font-medium', reached ? 'text-ink' : 'text-ink-faint')}>{r.name}</span>
                  <span className="flex-1 truncate text-xs text-ink-muted">{r.blurb}</span>
                  <span className="num text-[11px] text-ink-muted">
                    Lv {r.minLevel} · {totalXpForLevel(r.minLevel).toLocaleString()} XP
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
        <Panel title="XP ledger">
          <p className="mb-3 text-[11px] text-ink-muted">Every point is traceable. Each source pays at most once — improving an outcome only tops up the difference.</p>
          {ledger.length ? (
            <ul className="flex max-h-[420px] flex-col divide-y divide-line/60 overflow-y-auto pr-1">
              {ledger.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2 text-xs">
                  <span className="num w-10 shrink-0 text-violet-soft">+{e.amount}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{e.reason}</span>
                  <span className="shrink-0 text-ink-faint">{formatDay(e.date, today)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">No XP yet.</p>
          )}
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => (window.location.hash = '/settings')}>
            Adjust XP rules
          </Button>
        </Panel>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export function Quests() {
  const { state, today, derived } = useStore();
  const [tab, setTabState] = useState<Tab>(readTab);
  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      window.localStorage.setItem(TAB_KEY, t);
    } catch {
      /* the tab just won't be remembered */
    }
  };
  const daily = useMemo(() => dailyQuests(state, today), [state, today]);
  const weekly = useMemo(() => weeklyChallenges(state, today), [state, today]);
  const monthly = useMemo(() => monthlyChallenges(state, today), [state, today]);
  const zone = useMemo(() => penaltyZone(state, today), [state, today]);

  const planner = (
    <Panel title="Planner — what you committed to and what you achieved" id="planner">
      <Planner />
    </Panel>
  );
  if (!state.settings.gamification) return <div className="grid gap-4">{planner}</div>;

  const { level, streak } = derived;
  const count = (qs: Quest[]) => `${doneOf(qs)}/${totalOf(qs)}`;

  return (
    <div className="flex flex-col gap-5">
      <SystemWindow label="Study status" className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex items-center gap-4">
          <Ring value={level.progress} size={64} stroke={3} tone="arc" label={`Level ${level.level}`}>
            <div className="flex flex-col items-center leading-none">
              <span className="text-[9px] uppercase tracking-widest text-ink-muted">Lv</span>
              <span className="num text-lg font-semibold">{level.level}</span>
            </div>
          </Ring>
          <div>
            <SystemTag>STUDY QUESTS</SystemTag>
            <p className="mt-1 text-lg font-semibold">{level.rank.name}</p>
            <p className="num text-xs text-ink-muted">
              {level.intoLevel.toLocaleString()} / {level.forNext.toLocaleString()} XP to Lv {level.level + 1}
            </p>
          </div>
        </div>
        <dl className="ml-auto flex flex-wrap gap-x-8 gap-y-3">
          {zone && !zone.survived && (
            <div>
              <dt className="st-label text-rose">Penalty zone</dt>
              <dd className="num mt-1 text-xl font-semibold text-rose">−{zone.lost}</dd>
            </div>
          )}
          <div>
            <dt className="st-label">Streak</dt>
            <dd className="num mt-1 flex items-center gap-1 text-xl font-semibold">
              <Flame size={16} className={streak.current ? 'text-ember' : 'text-ink-faint'} aria-hidden="true" />
              {streak.current}
            </dd>
          </div>
          {(
            [
              ['Today', daily],
              ['This week', weekly],
              ['This month', monthly],
            ] as const
          ).map(([label, qs]) => (
            <div key={label}>
              <dt className="st-label">{label}</dt>
              <dd className={cn('num mt-1 text-xl font-semibold', totalOf(qs) > 0 && doneOf(qs) === totalOf(qs) && 'text-jade')}>{count(qs)}</dd>
            </div>
          ))}
        </dl>
      </SystemWindow>

      <Segmented
        label="Quest views"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'daily', label: `Daily · ${count(daily)}` },
          { value: 'weekly', label: `Weekly · ${count(weekly)}` },
          { value: 'monthly', label: `Monthly · ${count(monthly)}` },
          { value: 'planner', label: 'Planner' },
          { value: 'bosses', label: 'Bosses & missions' },
          { value: 'achievements', label: 'Achievements' },
        ]}
      />

      {tab === 'daily' && <DailyTab />}
      {tab === 'weekly' && <WeeklyTab />}
      {tab === 'monthly' && <MonthlyTab />}
      {tab === 'planner' && planner}
      {tab === 'bosses' && <BossesTab />}
      {tab === 'achievements' && <AchievementsTab />}
    </div>
  );
}
