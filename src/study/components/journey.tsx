import { useMemo, useState } from 'react';
import { CalendarClock, Flame, Quote as QuoteIcon, Shuffle } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { useLegacyDays } from '../store/legacy';
import { domainMastery } from '../engine/mastery';
import { fmtMin, goalStreak, minutesByDay } from '../engine/studytime';
import { cn } from '../lib/cn';
import { QUOTE_THEMES, quoteFor } from '../domain/quotes';
import { addDays, diffDays, formatDay, parseDayKey, shortWeekday, weekday } from '../lib/date';
import { Badge, Bar, Button, Panel, Ring } from './ui';

// ── Journey countdown ───────────────────────────────────────────────────

export function CountdownCard() {
  const { state, today, derived } = useStore();
  const { navigate } = useUI();
  const legacy = useLegacyDays();
  const target = state.settings.targetDate;

  const info = useMemo(() => {
    const left = diffDays(today, target);
    // The journey began at the earliest sign of work, including the earlier tracker.
    const firstActivity = state.activity.reduce<string | undefined>((m, a) => (!m || a.date < m ? a.date : m), undefined);
    const firstLegacy = [...legacy].sort()[0];
    const start = [state.createdAt.slice(0, 10), firstActivity, firstLegacy].filter((d): d is string => !!d).sort()[0];
    const span = Math.max(1, diffDays(start, target));
    const elapsed = Math.min(1, Math.max(0, diffDays(start, today) / span));
    // Mon–Fri between now and the target; weekends are bonus, as in the earlier tracker.
    let weekdays = 0;
    for (let k = addDays(today, 1), i = 0; i < left && i < 3660; k = addDays(k, 1), i++) if (weekday(k) % 6 !== 0) weekdays++;
    return { left, weeks: Math.floor(Math.max(0, left) / 7), weekdays, elapsed, start };
  }, [today, target, state.createdAt, state.activity, legacy]);

  const mastery = Math.round((domainMastery(derived.stats, 'dsa') + domainMastery(derived.stats, 'hld') + domainMastery(derived.stats, 'lld')) / 3);
  const year = parseDayKey(target).getFullYear();
  const passed = info.left < 0;

  return (
    <Panel
      title="Journey countdown"
      className="relative h-full overflow-hidden"
      action={
        <button className="text-xs text-ink-muted hover:text-ink" onClick={() => navigate('settings')}>
          Change date
        </button>
      }
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-arc/10 blur-3xl" aria-hidden="true" />
      {passed ? (
        <div className="relative">
          <p className="text-lg font-semibold">Target date passed</p>
          <p className="mt-1 text-sm text-ink-soft">
            {formatDay(target)}, {year} has gone by. Set your next milestone in Settings — the work you did still counts.
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Ring value={1 - info.elapsed} size={76} stroke={4} tone="arc" label={`${info.left} days left`}>
              <span className="num text-xl font-semibold leading-none">{info.left}</span>
              <span className="mt-0.5 text-[9px] uppercase tracking-widest text-ink-muted">days</span>
            </Ring>
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-snug">{info.left === 0 ? 'Today is the day' : `${info.left} day${info.left === 1 ? '' : 's'} to go`}</p>
              <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                <CalendarClock size={12} aria-hidden="true" /> Target · {formatDay(target)}, {year}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4">
            <div>
              <dt className="st-label">Weeks</dt>
              <dd className="num mt-1 text-lg font-semibold">{info.weeks}</dd>
            </div>
            <div>
              <dt className="st-label">Weekdays</dt>
              <dd className="num mt-1 text-lg font-semibold">{info.weekdays}</dd>
            </div>
            <div>
              <dt className="st-label">Mastery</dt>
              <dd className="num mt-1 text-lg font-semibold">{mastery}%</dd>
            </div>
          </dl>
          <div>
            <div className="mb-1.5 flex justify-between text-[11px] text-ink-muted">
              <span>Time used since {formatDay(info.start)}</span>
              <span className="num">{Math.round(info.elapsed * 100)}%</span>
            </div>
            <Bar value={info.elapsed} tone="arc" label="Share of the journey's time used" />
            <p className="mt-2 text-[11px] text-ink-muted">
              {mastery >= Math.round(info.elapsed * 100)
                ? 'Mastery is keeping pace with the calendar. Keep the chain going.'
                : 'Mastery is behind the calendar — steady daily reps close the gap faster than a big weekend.'}
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ── Daily motivation ────────────────────────────────────────────────────

export function MotivationCard() {
  const { today } = useStore();
  const [offset, setOffset] = useState(0);
  const q = quoteFor(today, offset);
  return (
    <Panel
      title="Daily motivation"
      className="relative flex h-full flex-col overflow-hidden"
      action={
        <Button variant="ghost" size="sm" onClick={() => setOffset((o) => o + 1)} aria-label="Show another quote">
          <Shuffle size={13} aria-hidden="true" /> Another
        </Button>
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_180px_at_0%_100%,rgba(139,92,246,0.12),transparent)]" aria-hidden="true" />
      <figure key={`${today}-${offset}`} className="relative flex flex-1 flex-col gap-4 animate-rise">
        <Badge tone={q.theme === 'payoff' ? 'jade' : q.theme === 'life' ? 'arc' : q.theme === 'finish' ? 'ember' : 'violet'} className="self-start">
          {QUOTE_THEMES[q.theme]}
        </Badge>
        <blockquote className="flex gap-3">
          <QuoteIcon size={20} className="mt-1 shrink-0 text-violet-soft/70" aria-hidden="true" />
          <p className="text-lg font-medium leading-relaxed text-ink sm:text-xl">{q.text}</p>
        </blockquote>
        <figcaption className="mt-auto flex items-center justify-between gap-3 text-xs text-ink-muted">
          <span>{q.by ? `— ${q.by}` : ' '}</span>
          <span>{offset === 0 ? 'Today’s pick · a new one every day' : 'Shuffled'}</span>
        </figcaption>
      </figure>
    </Panel>
  );
}

// ── Study time & goal streak ────────────────────────────────────────────

export function StudyTimeCard() {
  const { state, today } = useStore();
  const { navigate } = useUI();
  const goal = state.settings.targets.minutesPerDay;
  const streak = useMemo(() => goalStreak(state, today), [state, today]);
  const byDay = useMemo(() => minutesByDay(state), [state]);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return { d, min: byDay.get(d) ?? 0 };
  });
  const max = Math.max(goal, ...week.map((w) => w.min));
  const metThisWeek = week.filter((w) => w.min >= goal).length;
  const left = Math.max(0, goal - streak.minutesToday);

  return (
    <Panel
      title="Study time"
      className="relative flex h-full flex-col overflow-hidden"
      action={
        <button className="text-xs text-ink-muted hover:text-ink" onClick={() => navigate('sessions')}>
          Log time
        </button>
      }
    >
      <div className="pointer-events-none absolute -left-14 -top-14 h-40 w-40 rounded-full bg-jade/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-4">
          <Ring value={streak.minutesToday / goal} size={76} stroke={4} tone={streak.metToday ? 'jade' : 'violet'} label={`${fmtMin(streak.minutesToday)} of ${fmtMin(goal)} today`}>
            <span className="num text-base font-semibold leading-none">{fmtMin(streak.minutesToday)}</span>
            <span className="mt-0.5 text-[9px] text-ink-muted">of {fmtMin(goal)}</span>
          </Ring>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-lg font-semibold leading-snug">
              <Flame size={17} className={streak.current ? 'text-ember' : 'text-ink-faint'} aria-hidden="true" />
              <span className="num">{streak.current}</span> day{streak.current === 1 ? '' : 's'} at {fmtMin(goal)}+
            </p>
            <p className="text-xs text-ink-muted">
              {streak.metToday
                ? 'Goal met today — streak extended.'
                : streak.current
                  ? `${fmtMin(left)} more today keeps the streak alive.`
                  : streak.minutesToday
                    ? `${fmtMin(left)} more today starts a new streak.`
                    : `Study ${fmtMin(goal)} today to start a streak.`}
            </p>
          </div>
        </div>

        <div className="mt-auto">
          <div className="relative flex h-14 items-end gap-1.5" role="img" aria-label={`Last 7 days: goal met on ${metThisWeek}`}>
            <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-muted/40" style={{ bottom: `${(goal / max) * 100}%` }} aria-hidden="true" />
            {week.map((w) => (
              <div key={w.d} className="flex h-full flex-1 flex-col justify-end" title={`${formatDay(w.d, today)} · ${fmtMin(w.min)}`}>
                <div
                  className={cn('w-full rounded-[3px]', w.min >= goal ? 'bg-jade' : w.min > 0 ? 'bg-violet/70' : 'bg-surface-3')}
                  style={{ height: w.min ? `${(w.min / max) * 100}%` : '3px' }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5" aria-hidden="true">
            {week.map((w) => (
              <span key={w.d} className={cn('flex-1 text-center text-[9px]', w.d === today ? 'text-violet-soft' : 'text-ink-faint')}>
                {shortWeekday(w.d)[0]}
              </span>
            ))}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Goal met · 7 days</dt>
              <dd className="num">{metThisWeek}/7</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Best streak</dt>
              <dd className="num">{streak.longest}d</dd>
            </div>
          </dl>
        </div>
      </div>
    </Panel>
  );
}
