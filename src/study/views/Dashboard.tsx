import { useMemo } from 'react';
import { ArrowRight, Award, CalendarClock, Info, RotateCcw } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { recommend } from '../engine/recommend';
import { dailyQuests, weeklyChallenges } from '../engine/quests';
import { ACHIEVEMENTS } from '../engine/achievements';
import { addDays, diffDays, formatDay, startOfWeek } from '../lib/date';
import { Button, Panel } from '../components/ui';
import { BranchOverview, Heatmap, PlayerCard, QuestList } from '../components/progress';
import { TodayPlan } from '../components/planner';
import { CountdownCard, MotivationCard, StudyTimeCard } from '../components/journey';
import { DomainTag } from '../components/bits';
import { DOMAIN_META } from '../domain/catalog';

function NextAction() {
  const { state, derived, today } = useStore();
  const { open, navigate } = useUI();
  const rec = useMemo(() => recommend(state, derived.stats, today), [state, derived.stats, today]);
  const go = () => {
    const a = rec.action;
    if (a.type === 'revise') open({ type: 'focus' });
    else if (a.type === 'finish-session') open({ type: 'finish-session' });
    else if (a.type === 'log') open({ type: 'log', domain: a.domain, itemId: a.itemId });
    else if (a.type === 'boss') open({ type: 'boss', bossId: a.bossId });
    else navigate(a.to);
  };
  return (
    <section className="st-panel relative flex flex-col justify-between overflow-hidden p-5" aria-label="Recommended next action">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_200px_at_100%_0%,rgba(139,92,246,0.14),transparent)]" aria-hidden="true" />
      <div className="relative">
        <p className="st-label flex items-center gap-2 text-violet-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-soft shadow-glow" aria-hidden="true" /> Next action
        </p>
        <h2 className="mt-3 text-xl font-semibold leading-snug sm:text-2xl">{rec.title}</h2>
        <p className="mt-1.5 text-sm text-ink-soft">{rec.detail}</p>
      </div>
      <div className="relative mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={go}>
          {rec.cta} <ArrowRight size={14} aria-hidden="true" />
        </Button>
        {rec.action.type === 'log' && (
          <Button variant="ghost" size="sm" onClick={() => open({ type: 'start-session', domain: rec.domain, itemId: rec.action.type === 'log' ? rec.action.itemId : undefined })}>
            Start a timed session
          </Button>
        )}
        <p className="flex w-full items-start gap-1.5 text-[11px] text-ink-muted">
          <Info size={12} className="mt-px shrink-0" aria-hidden="true" /> {rec.reason}
        </p>
      </div>
    </section>
  );
}

function RevisionSummary() {
  const { derived, today } = useStore();
  const { open, navigate } = useUI();
  const q = derived.queues;
  const nextUp = q.upcoming[0];
  return (
    <Panel
      title="Revision"
      action={
        <button className="text-xs text-ink-muted hover:text-ink" onClick={() => navigate('revision')}>
          View all
        </button>
      }
    >
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Overdue', q.overdue.length, q.overdue.length ? 'text-ember-soft' : 'text-ink'],
          ['Due today', q.today.length, 'text-ink'],
          ['Weak', q.weak.length, 'text-ink'],
        ].map(([l, n, c]) => (
          <div key={l as string} className="rounded-lg border border-line bg-surface-2/40 py-3">
            <dd className={`num text-2xl font-semibold ${c}`}>{n}</dd>
            <dt className="mt-0.5 text-[11px] text-ink-muted">{l}</dt>
          </div>
        ))}
      </dl>
      <Button variant={q.overdue.length + q.today.length ? 'primary' : 'secondary'} className="mt-4 w-full" onClick={() => open({ type: 'focus' })} disabled={!(q.overdue.length + q.today.length)}>
        <RotateCcw size={14} aria-hidden="true" /> {q.overdue.length + q.today.length ? 'Start focused revision' : 'Nothing due'}
      </Button>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-muted">
        <CalendarClock size={12} aria-hidden="true" />
        {nextUp ? (
          <>
            Next: {nextUp.title} · {formatDay(nextUp.review.nextReviewAt!, today)}
          </>
        ) : (
          'No upcoming revisions this week'
        )}
      </p>
    </Panel>
  );
}

function WeekStrip() {
  const { state, today } = useStore();
  const ws = startOfWeek(today);
  const inWeek = state.activity.filter((a) => diffDays(ws, a.date) >= 0 && diffDays(a.date, addDays(ws, 6)) >= 0);
  const solved = new Set(inWeek.filter((a) => a.type === 'solve' || a.type === 'learn').map((a) => a.itemId)).size;
  const recalls = inWeek.filter((a) => a.type === 'review').length;
  const minutes = state.sessions.filter((s) => diffDays(ws, s.date) >= 0).reduce((m, s) => m + s.durationMin, 0);
  const quests = state.xp.filter((x) => (x.type === 'quest' || x.type === 'weekly') && diffDays(ws, x.date) >= 0).length;
  const cells = [
    ['Learned / solved', solved],
    ['Revisions', recalls],
    ['Session time', `${Math.round(minutes / 6) / 10}h`],
    ...(state.settings.gamification ? [['Quests done', quests]] : []),
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cells.map(([l, v]) => (
        <div key={l as string}>
          <dt className="st-label">{l}</dt>
          <dd className="num mt-1 text-lg font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Recent() {
  const { state, today } = useStore();
  const recentAch = Object.entries(state.achievements)
    .sort((a, b) => (a[1] < b[1] ? 1 : -1))
    .slice(0, 3)
    .map(([id, date]) => ({ def: ACHIEVEMENTS.find((a) => a.id === id), date }))
    .filter((x) => x.def);
  const recent = [...state.activity].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 5);
  const verb = { solve: 'Solved', learn: 'Learned', attempt: 'Attempted', progress: 'Progressed', review: 'Revised', session: 'Session', boss: 'Boss' } as const;
  return (
    <div className="flex flex-col gap-5">
      {state.settings.gamification && (
        <div>
          <p className="st-label mb-2">Recent achievements</p>
          {recentAch.length ? (
            <ul className="flex flex-col gap-2">
              {recentAch.map(({ def, date }) => (
                <li key={def!.id} className="flex items-center gap-2.5 text-sm">
                  <Award size={14} className="text-violet-soft" aria-hidden="true" />
                  <span className="flex-1 truncate">{def!.name}</span>
                  <span className="text-[11px] text-ink-muted">{formatDay(date, today)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">Your first achievement is one solved problem away from “First 10”.</p>
          )}
        </div>
      )}
      <div>
        <p className="st-label mb-2">Latest activity</p>
        {recent.length ? (
          <ul className="flex flex-col gap-2">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-xs">
                <DomainTag domain={a.domain} />
                <span className="text-ink-muted">{verb[a.type]}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{a.type === 'session' ? a.label.replace(/^\d+ min session · ?/, '') || `${a.minutes} min` : a.label}</span>
                <span className="text-ink-faint">{formatDay(a.date, today)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-muted">Nothing logged yet.</p>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { state, today } = useStore();
  const { navigate } = useUI();
  const quests = useMemo(() => dailyQuests(state, today), [state, today]);
  const weekly = useMemo(() => weeklyChallenges(state, today), [state, today]);
  const game = state.settings.gamification;
  const doneCount = quests.filter((q) => q.complete).length;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <PlayerCard />
      </div>
      <div className="lg:col-span-5">
        <NextAction />
      </div>
      <div className="lg:col-span-3">
        <RevisionSummary />
      </div>

      <div className="lg:col-span-4">
        <CountdownCard />
      </div>
      <div className="lg:col-span-4">
        <StudyTimeCard />
      </div>
      <div className="lg:col-span-4">
        <MotivationCard />
      </div>

      <Panel
        className="lg:col-span-7"
        title={game ? `Today’s quests · ${doneCount}/${quests.length}` : `Today’s plan · ${doneCount}/${quests.length}`}
        action={
          game && (
            <button className="text-xs text-ink-muted hover:text-ink" onClick={() => navigate('quests')}>
              Weekly & bosses
            </button>
          )
        }
      >
        <div className="mb-3 border-b border-line pb-3">
          <TodayPlan />
        </div>
        <QuestList quests={quests} compact />
        {game && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="st-label mb-1">This week</p>
            <QuestList quests={weekly.filter((w) => !w.claimed).slice(0, 2)} compact />
          </div>
        )}
      </Panel>
      <Panel className="lg:col-span-5" title="Skill tree">
        <BranchOverview />
      </Panel>

      <Panel className="lg:col-span-8" title="Consistency">
        <Heatmap weeks={20} />
        <div className="mt-5 border-t border-line pt-4">
          <WeekStrip />
        </div>
      </Panel>
      <Panel className="lg:col-span-4" title="History">
        <Recent />
      </Panel>

      {state.mode === 'real' && state.activity.length === 0 && (
        <div className="lg:col-span-12">
          <Panel title="Getting started">
            <ol className="grid gap-3 text-sm text-ink-soft sm:grid-cols-3">
              {(['dsa', 'hld', 'lld'] as const).map((d, i) => (
                <li key={d} className="rounded-lg border border-line p-3">
                  <span className="num mr-2 text-violet-soft">{i + 1}.</span>
                  Open <button className="font-medium text-ink underline underline-offset-4" onClick={() => navigate(d)}>{DOMAIN_META[d].label}</button> and log something you already know — it enters your revision cycle tomorrow.
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}
    </div>
  );
}
