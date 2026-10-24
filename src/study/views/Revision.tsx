import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { isLearned } from '../engine/revision';
import { addDays, diffDays, formatDay, shortWeekday } from '../lib/date';
import { Button, Panel } from '../components/ui';
import { RevisionList } from './Workspace';

export function Revision() {
  const { state, derived, today } = useStore();
  const { open, navigate } = useUI();
  const q = derived.queues;
  const dueNow = q.overdue.length + q.today.length;

  const forecast = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
    const counts = days.map((d, i) =>
      state.items.filter((it) => {
        if (!isLearned(it) || !it.review.nextReviewAt) return false;
        const diff = diffDays(d, it.review.nextReviewAt);
        return i === 0 ? diff <= 0 : diff === 0;
      }).length,
    );
    return { days, counts, max: Math.max(1, ...counts) };
  }, [state.items, today]);

  const learnedCount = state.items.filter(isLearned).length;
  const recent = state.activity.filter((a) => a.type === 'review' && diffDays(a.date, today) < 30);
  const success = recent.filter((a) => a.quality === 'success').length;

  return (
    <div className="flex flex-col gap-5">
      <section className="st-panel flex flex-col gap-5 p-5 md:flex-row md:items-center">
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{dueNow ? `${dueNow} item${dueNow > 1 ? 's' : ''} ready for recall` : 'You’re caught up'}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {q.overdue.length ? `${q.overdue.length} overdue — start there. ` : ''}
            Recall first, reveal second, grade honestly. Forgetting just brings an item back sooner.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-6 text-center">
          <div>
            <dd className="num text-2xl font-semibold">{learnedCount}</dd>
            <dt className="st-label mt-1">In rotation</dt>
          </div>
          <div>
            <dd className="num text-2xl font-semibold">{recent.length ? Math.round((success / recent.length) * 100) : '—'}{recent.length ? '%' : ''}</dd>
            <dt className="st-label mt-1">Recall rate 30d</dt>
          </div>
          <div>
            <dd className="num text-2xl font-semibold">{q.upcoming.length}</dd>
            <dt className="st-label mt-1">This week</dt>
          </div>
        </dl>
        <Button variant="primary" onClick={() => open({ type: 'focus' })} disabled={!dueNow} aria-keyshortcuts="r">
          <RotateCcw size={14} aria-hidden="true" /> Start focus mode
        </Button>
      </section>

      <Panel
        title="14-day forecast"
        action={
          <button className="text-xs text-ink-muted hover:text-ink" onClick={() => navigate('settings')}>
            Schedule: {state.settings.intervals.join(' → ')} days
          </button>
        }
      >
        <div className="flex h-28 items-end gap-1.5" role="img" aria-label={`Revisions due over the next 14 days: ${forecast.counts.join(', ')}`}>
          {forecast.days.map((d, i) => (
            <div key={d} className="flex flex-1 flex-col items-center gap-1">
              <span className="num text-[10px] text-ink-muted">{forecast.counts[i] || ''}</span>
              <div
                className={`w-full rounded-t-[3px] ${i === 0 ? 'bg-violet' : 'bg-violet-deep/70'}`}
                style={{ height: `${Math.max(2, (forecast.counts[i] / forecast.max) * 72)}px` }}
                title={`${formatDay(d, today)}: ${forecast.counts[i]}`}
              />
              <span className="text-[10px] text-ink-faint">{i === 0 ? 'Now' : shortWeekday(d)[0]}</span>
            </div>
          ))}
        </div>
      </Panel>

      <RevisionList />
    </div>
  );
}
