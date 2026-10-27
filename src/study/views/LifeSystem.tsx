import { useMemo, type ReactNode } from 'react';
import { Award, Check, Flame, TriangleAlert, X } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI, type Route } from '../store/ui';
import { useLife } from '../components/life';
import { CLEAR_AT, LIFE_GROUPS, LIFE_RANKS, LIFE_XP, type ObjectiveId } from '../engine/life';
import { totalXpForLevel } from '../engine/progression';
import { formatDay, shortWeekday } from '../lib/date';
import { cn } from '../lib/cn';
import { Badge, Bar, Button, Panel, Ring } from '../components/ui';

/** Where each objective is done, so the quest can send you straight there. */
const OBJECTIVE_ROUTE: Record<ObjectiveId, Route> = {
  train: 'workout',
  meals: 'nutrition',
  budget: 'nutrition',
  protein: 'nutrition',
  habits: 'nutrition',
  side: 'personal',
};

function SystemWindow({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <section aria-label={label} className={cn('relative rounded-xl border border-arc-soft/45 bg-surface p-5 shadow-glow-arc sm:px-6', className)}>
      <span aria-hidden="true" className="absolute -left-px -top-px h-3.5 w-3.5 rounded-tl-xl border-l-2 border-t-2 border-arc-soft" />
      <span aria-hidden="true" className="absolute -bottom-px -right-px h-3.5 w-3.5 rounded-br-xl border-b-2 border-r-2 border-arc-soft" />
      {children}
    </section>
  );
}

export function LifeSystem() {
  const { state, today } = useStore();
  const { navigate } = useUI();
  const life = useLife();
  const q = life.today;
  const game = state.settings.gamification;
  const nextUp = useMemo(
    () => life.achievements.filter((a) => !a.earned && a.current > 0).sort((x, y) => y.current / y.target - x.current / x.target).slice(0, 3),
    [life.achievements],
  );
  const days = life.recent.slice(0, 14).reverse();

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-muted">
        Training, nutrition and side quests level you up here. It is separate from interview-prep XP and rank, and worked out from what you log, so it can’t be gamed.
      </p>

      <div className="grid gap-5 lg:grid-cols-12">
        <SystemWindow label="Daily Quest" className="lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="num text-xs tracking-[0.18em] text-arc-soft">[ DAILY QUEST ]</p>
              <h2 className="mt-2 text-lg font-semibold">Become stronger, one day at a time</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Complete {CLEAR_AT} of {q.total} objectives before midnight to clear it. Complete all {q.total} for a perfect day.
              </p>
            </div>
            <Ring value={q.done / q.total} size={64} stroke={3} tone={q.perfect ? 'jade' : 'arc'} label={`${q.done} of ${q.total} objectives done`}>
              <span className="num text-base font-semibold">
                {q.done}/{q.total}
              </span>
            </Ring>
          </div>
          <ul className="mt-4 flex flex-col divide-y divide-line/70">
            {q.objectives.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-3">
                <span
                  className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border', o.done ? 'border-jade/60 bg-jade/15 text-jade' : 'border-line-strong text-ink-faint')}
                  aria-hidden="true"
                >
                  {o.done ? <Check size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', o.done ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>{o.label}</p>
                  <p className="num text-[11px] text-ink-muted">{o.detail}</p>
                </div>
                {!o.done && (
                  <Button size="sm" variant="secondary" onClick={() => navigate(OBJECTIVE_ROUTE[o.id])}>
                    Go
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs">
            {q.perfect ? (
              <span className="text-jade">Perfect day. Every objective complete.</span>
            ) : q.cleared ? (
              <span className="text-arc-soft">Quest cleared. {q.total - q.done} more for a perfect day.</span>
            ) : (
              <span className="flex items-center gap-1.5 text-ember-soft">
                <TriangleAlert size={13} aria-hidden="true" /> {CLEAR_AT - q.done} more to clear today, or the streak resets.
              </span>
            )}
            {game && (
              <span className="ml-auto text-ink-muted">
                Reward <span className="num text-violet-soft">+{LIFE_XP.questCleared} XP</span>, perfect <span className="num text-violet-soft">+{LIFE_XP.questPerfect} more</span>
              </span>
            )}
          </div>
        </SystemWindow>

        <SystemWindow label="Status" className="lg:col-span-5">
          <p className="num text-xs tracking-[0.18em] text-arc-soft">[ STATUS ]</p>
          <div className="mt-3 flex items-center gap-4">
            <Ring value={life.level.progress} size={72} stroke={3} tone="arc" label={`Life level ${life.level.level}`}>
              <div className="flex flex-col items-center leading-none">
                <span className="text-[9px] uppercase tracking-widest text-ink-muted">Lv</span>
                <span className="num text-xl font-semibold">{life.level.level}</span>
              </div>
            </Ring>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{life.rank.name}</p>
              <p className="text-xs text-ink-muted">{life.rank.blurb}</p>
              <p className="num mt-1 text-xs text-ink-soft">
                {life.level.intoLevel.toLocaleString()} / {life.level.forNext.toLocaleString()} XP to Lv {life.level.level + 1}
              </p>
            </div>
          </div>
          <Bar value={life.level.progress} tone="arc" className="mt-3" label="Life XP to next level" />
          {life.nextRank && <p className="mt-2 text-[11px] text-ink-muted">{life.nextRank.name} at level {life.nextRank.minLevel}.</p>}
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <div>
              <dt className="st-label">Streak</dt>
              <dd className="num mt-1 flex items-center gap-1 text-lg font-semibold">
                <Flame size={15} className={life.streak ? 'text-ember' : 'text-ink-faint'} aria-hidden="true" />
                {life.streak}
              </dd>
              <p className="num text-[11px] text-ink-muted">best {life.bestStreak}</p>
            </div>
            <div>
              <dt className="st-label">Cleared</dt>
              <dd className="num mt-1 text-lg font-semibold">{life.clearedDays}</dd>
              <p className="text-[11px] text-ink-muted">days</p>
            </div>
            <div>
              <dt className="st-label">Perfect</dt>
              <dd className="num mt-1 text-lg font-semibold text-jade">{life.perfectDays}</dd>
              <p className="text-[11px] text-ink-muted">days</p>
            </div>
          </dl>
          <p className="st-label mb-2 mt-4">XP by source · {life.xp.toLocaleString()} total</p>
          <ul className="flex flex-col gap-2">
            {life.sources.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-ink-soft">{s.label}</span>
                <Bar value={life.xp ? s.xp / life.xp : 0} tone="arc" label={`${s.label} XP share`} />
                <span className="num w-14 text-right text-xs">{s.xp.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </SystemWindow>
      </div>

      <Panel title="Last 14 days">
        <ol className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(14,minmax(0,1fr))]" aria-label="Daily Quest results for the last 14 days">
          {days.map((d) => (
            <li
              key={d.day}
              title={`${formatDay(d.day, today)}: ${d.done}/${d.total}${d.perfect ? ' · perfect' : d.cleared ? ' · cleared' : ''}`}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border px-1 py-2',
                d.perfect ? 'border-jade/50 bg-jade/10' : d.cleared ? 'border-arc-soft/50 bg-arc/10' : d.day === today ? 'border-line-strong' : 'border-line',
              )}
            >
              <span className="text-[10px] uppercase text-ink-muted">{shortWeekday(d.day)}</span>
              {d.cleared ? <Check size={14} className={d.perfect ? 'text-jade' : 'text-arc-soft'} aria-hidden="true" /> : d.day === today ? <span className="h-3.5" /> : <X size={14} className="text-ink-faint" aria-hidden="true" />}
              <span className="num text-[10px] text-ink-muted">
                {d.done}/{d.total}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-jade/60" aria-hidden="true" /> Perfect
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-arc/60" aria-hidden="true" /> Cleared ({CLEAR_AT}+)
          </span>
          <span>Personal tasks cleared before today’s update have no date, so they count for XP but not for past days.</span>
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel className="lg:col-span-7" title={`Life achievements · ${life.achievements.filter((a) => a.earned).length}/${life.achievements.length}`}>
          {nextUp.length > 0 && (
            <div className="mb-5 rounded-xl border border-arc-soft/30 bg-arc/[0.05] p-3.5">
              <p className="st-label mb-2">Closest to unlocking</p>
              <ul className="flex flex-col gap-2.5">
                {nextUp.map((a) => (
                  <li key={a.def.id} className="flex items-center gap-3">
                    <Award size={16} className="shrink-0 text-arc-soft" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">
                        {a.def.name} <span className="text-[11px] text-ink-muted">· {a.def.description}</span>
                      </p>
                      <Bar value={a.current / a.target} tone="arc" className="mt-1.5" label={`${a.def.name} progress`} />
                    </div>
                    <span className="num shrink-0 text-[11px] text-ink-soft">
                      {a.current.toLocaleString()}/{a.target.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-5">
            {LIFE_GROUPS.map((group) => {
              const list = life.achievements.filter((a) => a.def.group === group);
              return (
                <section key={group} aria-label={group}>
                  <p className="st-label mb-2">
                    {group} <span className="num text-ink-faint">· {list.filter((a) => a.earned).length}/{list.length}</span>
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {list.map((a) => (
                      <li key={a.def.id} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5', a.earned ? 'border-arc-soft/35 bg-arc/[0.05]' : 'border-line')}>
                        <Award size={16} className={a.earned ? 'text-arc-soft' : 'text-ink-faint'} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm', a.earned ? 'text-ink' : 'text-ink-soft')}>{a.def.name}</p>
                          <p className="truncate text-[11px] text-ink-muted" title={a.def.description}>
                            {a.def.description}
                          </p>
                          {!a.earned && <Bar value={a.current / a.target} tone="muted" className="mt-1.5" label={`${a.def.name} progress`} />}
                        </div>
                        {a.earned ? (
                          <Badge tone="arc">+{LIFE_XP.achievement * (a.def.reward ?? 1)}</Badge>
                        ) : (
                          <span className="num text-[11px] text-ink-muted">
                            {a.current.toLocaleString()}/{a.target.toLocaleString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </Panel>

        <div className="flex flex-col gap-5 lg:col-span-5">
          <Panel title="Hunter ranks">
            <ol className="flex flex-col gap-2">
              {LIFE_RANKS.map((r) => {
                const reached = life.level.level >= r.minLevel;
                const current = life.rank.name === r.name;
                return (
                  <li key={r.name} className={cn('flex items-center gap-3 rounded-lg px-3 py-2', current && 'bg-arc/10 ring-1 ring-arc-soft/40')}>
                    <span className={cn('h-2 w-2 rounded-full', reached ? 'bg-arc-soft' : 'bg-surface-3')} aria-hidden="true" />
                    <span className={cn('w-40 text-sm font-medium', reached ? 'text-ink' : 'text-ink-faint')}>{r.name}</span>
                    <span className="flex-1 truncate text-xs text-ink-muted">{r.blurb}</span>
                    <span className="num text-[11px] text-ink-muted">
                      Lv {r.minLevel} · {totalXpForLevel(r.minLevel).toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>
          <Panel title="How Life XP is earned">
            <ul className="flex flex-col gap-1.5 text-xs text-ink-soft">
              <li>
                Workout logged <span className="num text-violet-soft">+{LIFE_XP.workout}</span>, form video <span className="num text-violet-soft">+{LIFE_XP.formVideo}</span>, 15+ min cardio{' '}
                <span className="num text-violet-soft">+{LIFE_XP.cardio}</span>
              </li>
              <li>
                Every meal logged <span className="num text-violet-soft">+{LIFE_XP.mealsLogged}</span>, within budget <span className="num text-violet-soft">+{LIFE_XP.withinBudget}</span>, protein hit{' '}
                <span className="num text-violet-soft">+{LIFE_XP.proteinHit}</span>
              </li>
              <li>
                All habits <span className="num text-violet-soft">+{LIFE_XP.allHabits}</span>, all supplements <span className="num text-violet-soft">+{LIFE_XP.allSupplements}</span>, weigh-in{' '}
                <span className="num text-violet-soft">+{LIFE_XP.weighIn}</span>
              </li>
              <li>Side quest cleared: its rank reward (S +100 … E +10)</li>
              <li>
                Daily Quest cleared <span className="num text-violet-soft">+{LIFE_XP.questCleared}</span>, perfect <span className="num text-violet-soft">+{LIFE_XP.questPerfect}</span>, achievements{' '}
                <span className="num text-violet-soft">+{LIFE_XP.achievement}</span> and up
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
