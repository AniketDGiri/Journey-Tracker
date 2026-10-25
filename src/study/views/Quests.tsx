import { useMemo, useState } from 'react';
import { Award, ChevronLeft, ChevronRight, Crown, Lock } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { availableDailyQuests, dailyQuests, missions, weeklyChallenges } from '../engine/quests';
import { setQuestPlan } from '../engine/actions';
import { bossStatuses } from '../engine/bosses';
import { ACHIEVEMENTS, evaluateAchievements } from '../engine/achievements';
import { RANKS, totalXpForLevel } from '../engine/progression';
import { addDays, formatDay, startOfWeek } from '../lib/date';
import { cn } from '../lib/cn';
import { Badge, Bar, Button, Panel } from '../components/ui';
import { QuestList } from '../components/progress';
import { Planner } from '../components/planner';
import { DomainTag } from '../components/bits';

/** Daily quests for any day, with a checklist to pick which ones to take on. */
function DailyPlanner() {
  const { state, today, act } = useStore();
  const [day, setDay] = useState(today);
  const [editing, setEditing] = useState(false);
  const isPast = day < today;
  const planning = !isPast && (editing || day > today);
  const available = useMemo(() => availableDailyQuests(state, day), [state, day]);
  const chosen = useMemo(() => dailyQuests(state, day), [state, day]);
  const picked = new Set(chosen.map((q) => q.id));
  const hasPlan = !!state.questPlan?.[day];

  const save = (ids: string[] | null) => act((s) => setQuestPlan(s, day, ids), { silent: true });
  const toggle = (id: string) => save(available.filter((q) => (q.id === id ? !picked.has(id) : picked.has(q.id))).map((q) => q.id));
  const go = (to: string) => {
    setDay(to);
    setEditing(false);
  };

  return (
    <Panel className="lg:col-span-6" title="Daily quests">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => go(addDays(day, -1))} aria-label="Previous day">
          <ChevronLeft size={14} />
        </Button>
        <span className="min-w-[7rem] text-center text-sm font-medium">{formatDay(day, today)}</span>
        <Button size="sm" variant="ghost" onClick={() => go(addDays(day, 1))} aria-label="Next day">
          <ChevronRight size={14} />
        </Button>
        <input
          type="date"
          value={day}
          onChange={(e) => e.target.value && go(e.target.value)}
          aria-label="Pick a date"
          className="rounded-md border border-line bg-surface-2 px-2 py-1 text-xs text-ink-soft"
        />
        {day !== today && (
          <Button size="sm" variant="ghost" onClick={() => go(today)}>
            Today
          </Button>
        )}
      </div>

      {planning ? (
        <>
          <p className="mb-2 text-xs text-ink-muted">Tick the quests you want to take on {day === today ? 'today' : formatDay(day, today).toLowerCase()}.</p>
          <ul className="flex flex-col divide-y divide-line">
            {available.map((q) => (
              <li key={q.id}>
                <label className="flex cursor-pointer items-center gap-3 py-3">
                  <input type="checkbox" checked={picked.has(q.id)} onChange={() => toggle(q.id)} className="h-4 w-4 accent-violet" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {q.domain && <DomainTag domain={q.domain} />}
                      <span className="truncate text-sm">{q.title}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">{q.detail}</p>
                  </div>
                  {state.settings.gamification && <span className="num text-[11px] text-violet-soft">+{q.reward}</span>}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
        </>
      ) : (
        <>
          {chosen.length ? <QuestList quests={chosen} /> : <p className="text-xs text-ink-muted">No quests chosen for this day.</p>}
          {!isPast && (
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => setEditing(true)}>
              Choose quests
            </Button>
          )}
        </>
      )}
      <p className="mt-3 text-[11px] text-ink-muted">Quests complete from what you log — they can’t be ticked off directly. Picks you make here are what shows on your dashboard.</p>
    </Panel>
  );
}

export function Quests() {
  const { state, today, derived } = useStore();
  const { open } = useUI();
  const weekly = useMemo(() => weeklyChallenges(state, today), [state, today]);
  const mission = useMemo(() => missions(state, derived.stats).slice(0, 8), [state, derived.stats]);
  const bosses = useMemo(() => bossStatuses(state, derived.stats), [state, derived.stats]);
  const ach = useMemo(() => evaluateAchievements({ state, today, streak: derived.streak }), [state, today, derived.streak]);
  const ledger = useMemo(() => [...state.xp].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 40), [state.xp]);
  const weekEnd = addDays(startOfWeek(today), 6);

  const planner = (
    <Panel className="lg:col-span-12" title="Planner — what you committed to and what you achieved" id="planner">
      <Planner />
    </Panel>
  );
  if (!state.settings.gamification) return <div className="grid gap-4">{planner}</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {planner}
      <DailyPlanner />
      <Panel className="lg:col-span-6" title={`Weekly challenges · ends ${formatDay(weekEnd, today)}`}>
        <QuestList quests={weekly} />
      </Panel>

      <Panel className="lg:col-span-12" title="Boss battles">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {bosses.map((b) => (
            <button
              key={b.boss.id}
              onClick={() => open({ type: 'boss', bossId: b.boss.id })}
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors',
                b.defeated ? 'border-arc/40 bg-arc/[0.06]' : b.unlocked ? 'border-violet/50 bg-violet/[0.06] hover:bg-violet/10' : 'border-dashed border-line hover:border-line-strong',
              )}
            >
              <span className="flex items-center gap-2">
                {b.unlocked ? <Crown size={14} className={b.defeated ? 'text-arc-soft' : 'text-violet-soft'} aria-hidden="true" /> : <Lock size={14} className="text-ink-faint" aria-hidden="true" />}
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
      </Panel>

      <Panel className="lg:col-span-7" title="Missions">
        {mission.length ? <QuestList quests={mission} /> : <p className="text-xs text-ink-muted">Start any topic to receive its missions.</p>}
      </Panel>

      <Panel className="lg:col-span-5" title="Ranks">
        <ol className="flex flex-col gap-2">
          {RANKS.map((r) => {
            const reached = derived.level.level >= r.minLevel;
            const current = derived.level.rank.name === r.name;
            return (
              <li key={r.name} className={cn('flex items-center gap-3 rounded-lg px-3 py-2', current && 'bg-violet/10 ring-1 ring-violet/40')}>
                <span className={cn('h-2 w-2 rounded-full', reached ? 'bg-violet-soft' : 'bg-surface-3')} aria-hidden="true" />
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

      <Panel className="lg:col-span-7" title={`Achievements · ${ach.filter((a) => a.earned).length}/${ach.length}`}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ach.map((a) => {
            const def = ACHIEVEMENTS.find((d) => d.id === a.id)!;
            return (
              <li key={a.id} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5', a.earned ? 'border-violet/30 bg-violet/[0.05]' : 'border-line')}>
                <Award size={16} className={a.earned ? 'text-violet-soft' : 'text-ink-faint'} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', a.earned ? 'text-ink' : 'text-ink-soft')}>{def.name}</p>
                  <p className="truncate text-[11px] text-ink-muted">{def.description}</p>
                  {!a.earned && <Bar value={a.current / a.target} tone="muted" className="mt-1.5" label={`${def.name} progress`} />}
                </div>
                {a.earned ? <Badge tone="violet">{formatDay(state.achievements[a.id] ?? today, today)}</Badge> : <span className="num text-[11px] text-ink-muted">{a.current}/{a.target}</span>}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel className="lg:col-span-5" title="XP ledger">
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
  );
}
