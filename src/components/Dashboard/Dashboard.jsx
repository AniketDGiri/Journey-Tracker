import { useMemo } from 'react'
import { useAppStore } from '../../store/AppStore'
import {
  todayKey, dateKey, weekKey, monthKey,
  weekRangeLabel, monthLabel,
  lastNDays, format, parseISO,
  differenceInCalendarDays,
} from '../../utils/dates'
import { computeStreak } from '../../utils/progress'

// ─── Reusable primitives ───────────────────────────────────────────────────

function StatTile({ icon, label, value, sub, color = 'var(--accent)', alert = false }) {
  return (
    <div className={`dash-stat${alert ? ' dash-stat-alert' : ''}`}>
      <div className="dash-stat-icon">{icon}</div>
      <div className="dash-stat-value" style={{ color }}>{value}</div>
      <div className="dash-stat-label">{label}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">{title}</span>
        {subtitle && <span className="dash-card-subtitle">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function Dashboard() {
  const {
    phases, studyTasks, studyCompletions,
    lifeTasks, lifeCompletions, scheduledTasks,
  } = useAppStore()

  const now   = new Date()
  const today = todayKey()
  const weekK = weekKey()
  const monthK = monthKey()

  // ── Streak ──────────────────────────────────────────────────────────────
  const streak = useMemo(
    () => computeStreak(studyTasks.filter(t => t.frequency === 'daily'), studyCompletions),
    [studyTasks, studyCompletions]
  )

  // ── Today's tasks (study + life daily) ──────────────────────────────────
  const dailyStudy = useMemo(() => studyTasks.filter(t => t.frequency === 'daily'), [studyTasks])
  const dailyLife  = useMemo(() => lifeTasks.filter(t => t.frequency === 'daily'),  [lifeTasks])

  const todayStudyDone = dailyStudy.filter(t => studyCompletions[t.id]?.[today]).length
  const todayLifeDone  = dailyLife.filter(t => lifeCompletions[t.id]?.[today]).length
  const todayTotal     = dailyStudy.length + dailyLife.length
  const todayDone      = todayStudyDone + todayLifeDone
  const todayPct       = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0

  // ── Active phase ─────────────────────────────────────────────────────────
  const activePhase = useMemo(() =>
    phases.find(p => {
      const start = parseISO(p.startDate)
      const end   = p.endDate ? parseISO(p.endDate) : null
      return now >= start && (!end || now <= end)
    }) || phases[0],
    [phases]
  )

  const phaseRatio = useMemo(() => {
    if (!activePhase?.endDate) return activePhase ? 1 : 0
    const start = parseISO(activePhase.startDate)
    const end   = parseISO(activePhase.endDate)
    if (now < start) return 0
    if (now > end)   return 1
    const total   = differenceInCalendarDays(end, start) || 1
    const elapsed = differenceInCalendarDays(now, start)
    return Math.max(0, Math.min(1, elapsed / total))
  }, [activePhase])

  const daysToEnd = activePhase?.endDate
    ? Math.max(0, differenceInCalendarDays(parseISO(activePhase.endDate), now))
    : null

  // ── Scheduled today / overdue ────────────────────────────────────────────
  const scheduledToday = scheduledTasks.filter(t => t.dueDate === today && !t.done).length
  const overdueCount   = scheduledTasks.filter(t => !t.done && t.dueDate < today).length

  // ── 7-day activity chart data ────────────────────────────────────────────
  const last7 = useMemo(() =>
    lastNDays(7).map(day => {
      const key  = dateKey(day)
      const done = dailyStudy.filter(t => studyCompletions[t.id]?.[key]).length
      const ratio = dailyStudy.length > 0 ? done / dailyStudy.length : null
      return {
        key, day,
        label:     format(day, 'EEE'),
        dateLabel: format(day, 'MMM d'),
        ratio, done,
        total:   dailyStudy.length,
        isToday: key === today,
      }
    }),
    [studyTasks, studyCompletions]
  )

  // ── Phase card ratios ─────────────────────────────────────────────────────
  const phaseRows = useMemo(() =>
    phases.map(phase => {
      const start   = parseISO(phase.startDate)
      const end     = phase.endDate ? parseISO(phase.endDate) : null
      const isActive = now >= start && (!end || now <= end)
      const isDone   = end && now > end
      let ratio = 0
      if (end) {
        if (now > end)        ratio = 1
        else if (now >= start) ratio = differenceInCalendarDays(now, start) / (differenceInCalendarDays(end, start) || 1)
      } else {
        ratio = isActive ? 1 : 0
      }
      const daysLeft = end ? differenceInCalendarDays(end, now) : null
      return { ...phase, isActive, isDone, ratio: Math.max(0, Math.min(1, ratio)), daysLeft }
    }),
    [phases]
  )

  // ── Study breakdown ───────────────────────────────────────────────────────
  const weeklyStudy   = studyTasks.filter(t => t.frequency === 'weekly')
  const monthlyStudy  = studyTasks.filter(t => t.frequency === 'monthly')
  const weeklyStudyDone  = weeklyStudy.filter(t => studyCompletions[t.id]?.[weekK]).length
  const monthlyStudyDone = monthlyStudy.filter(t => studyCompletions[t.id]?.[monthK]).length

  // ── Life breakdown ────────────────────────────────────────────────────────
  const lifeBreakdown = ['office', 'personal'].map(cat => {
    const color  = cat === 'office' ? '#0ea5e9' : '#22c55e'
    const icon   = cat === 'office' ? '🏢' : '🏠'
    const daily  = lifeTasks.filter(t => t.category === cat && t.frequency === 'daily')
    const weekly = lifeTasks.filter(t => t.category === cat && t.frequency === 'weekly')
    return {
      cat, color, icon,
      dailyDone:  daily.filter(t => lifeCompletions[t.id]?.[today]).length,
      dailyTotal: daily.length,
      weeklyDone: weekly.filter(t => lifeCompletions[t.id]?.[weekK]).length,
      weeklyTotal: weekly.length,
    }
  })

  // ── Upcoming / overdue tasks ──────────────────────────────────────────────
  const upcoming = useMemo(() =>
    scheduledTasks
      .filter(t => !t.done)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6),
    [scheduledTasks]
  )

  // ── Recent completions insight (last 7 days avg vs previous 7 days avg) ───
  const recentAvg = last7.reduce((s, d) => s + (d.ratio ?? 0), 0) / 7
  const prev7 = useMemo(() =>
    lastNDays(14).slice(0, 7).map(day => {
      const key  = dateKey(day)
      const done = dailyStudy.filter(t => studyCompletions[t.id]?.[key]).length
      return dailyStudy.length > 0 ? done / dailyStudy.length : 0
    }),
    [studyTasks, studyCompletions]
  )
  const prevAvg = prev7.reduce((s, v) => s + v, 0) / 7
  const trend   = recentAvg > prevAvg + 0.05 ? 'up' : recentAvg < prevAvg - 0.05 ? 'down' : 'steady'
  const trendLabel = trend === 'up' ? '↑ Improving' : trend === 'down' ? '↓ Declining' : '→ Steady'
  const trendColor = trend === 'up' ? 'var(--success)' : trend === 'down' ? '#ef4444' : 'var(--text-muted)'

  return (
    <div className="tab-panel">

      {/* ── Greeting ─────────────────────────────────────────────────── */}
      <div className="dash-greeting">
        <div>
          <div className="dash-greeting-date">
            {format(now, 'EEEE, MMMM d, yyyy')}
          </div>
          <div className="dash-greeting-title">Progress Dashboard</div>
        </div>
        <div className="dash-greeting-pill">
          {todayDone === todayTotal && todayTotal > 0
            ? '🎉 All daily tasks complete!'
            : `${todayTotal - todayDone} daily task${todayTotal - todayDone !== 1 ? 's' : ''} remaining`}
        </div>
      </div>

      {/* ── KPI tiles ────────────────────────────────────────────────── */}
      <div className="dash-stats">
        <StatTile
          icon="✅"
          label="Today's Completion"
          value={`${todayPct}%`}
          sub={`${todayDone} of ${todayTotal} tasks done`}
          color={todayPct === 100 ? 'var(--success)' : 'var(--accent)'}
        />
        <StatTile
          icon="🔥"
          label="Current Streak"
          value={`${streak}d`}
          sub={streak >= 7 ? 'On fire! 🔥' : streak > 0 ? 'Keep it going!' : 'Start today!'}
          color="#f97316"
        />
        <StatTile
          icon="📍"
          label={activePhase?.name ?? 'Phase'}
          value={`${Math.round(phaseRatio * 100)}%`}
          sub={daysToEnd !== null ? `${daysToEnd} days left` : 'ongoing'}
          color={activePhase?.color ?? 'var(--accent)'}
        />
        <StatTile
          icon={overdueCount > 0 ? '⚠️' : '📅'}
          label="Scheduled"
          value={scheduledToday}
          sub={overdueCount > 0 ? `${overdueCount} overdue` : 'due today'}
          color={overdueCount > 0 ? '#ef4444' : 'var(--accent)'}
          alert={overdueCount > 0}
        />
      </div>

      {/* ── Row 2: activity chart + phase overview ────────────────────── */}
      <div className="dash-main-grid">

        {/* 7-day bar chart */}
        <Card title="7-Day Study Activity" subtitle={`Trend: `}>
          <div className="dash-trend-badge" style={{ color: trendColor }}>
            {trendLabel} vs prior week
          </div>
          <div className="dash-bar-chart">
            {last7.map(d => (
              <div key={d.key} className="dash-bar-col">
                <div className="dash-bar-pct">
                  {d.ratio !== null ? `${Math.round(d.ratio * 100)}%` : ''}
                </div>
                <div className="dash-bar-track">
                  <div
                    className="dash-bar-fill"
                    style={{
                      height: `${Math.round((d.ratio ?? 0) * 100)}%`,
                      background: d.isToday
                        ? 'var(--accent)'
                        : (activePhase?.color ?? 'var(--accent)'),
                      opacity: d.isToday ? 1 : 0.72,
                    }}
                    title={`${d.dateLabel}: ${d.done}/${d.total}`}
                  />
                </div>
                <div className={`dash-bar-label${d.isToday ? ' dash-bar-today' : ''}`}>
                  {d.label}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Phase progress */}
        <Card title="All Phases">
          <div className="dash-phase-list">
            {phaseRows.map(p => (
              <div key={p.id} className={`dash-phase-row${p.isActive ? ' dash-phase-active' : ''}`}>
                <div className="dash-phase-top">
                  <span className="dash-phase-dot" style={{ background: p.color }} />
                  <span className="dash-phase-name">{p.name}</span>
                  {p.isActive && <span className="dash-badge dash-badge-active">Active</span>}
                  {p.isDone  && <span className="dash-badge dash-badge-done">Done</span>}
                  {!p.isActive && !p.isDone && <span className="dash-badge">Upcoming</span>}
                  <span className="dash-phase-pct">{Math.round(p.ratio * 100)}%</span>
                </div>
                <div className="progress-track" style={{ height: '5px' }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.round(p.ratio * 100)}%`, background: p.color }}
                  />
                </div>
                {p.isActive && p.daysLeft !== null && (
                  <div className="dash-phase-days">{p.daysLeft} days left</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 3: study breakdown + life breakdown + upcoming ────────── */}
      <div className="dash-secondary-grid">

        {/* Study task breakdown */}
        <Card title="Study Tasks" subtitle="Current period">
          <div className="dash-breakdown">
            {[
              {
                label: 'Daily',
                sub: 'Today',
                done: todayStudyDone,
                total: dailyStudy.length,
                color: activePhase?.color ?? 'var(--accent)',
              },
              {
                label: 'Weekly',
                sub: weekRangeLabel(),
                done: weeklyStudyDone,
                total: weeklyStudy.length,
                color: activePhase?.color ?? 'var(--accent)',
              },
              {
                label: 'Monthly',
                sub: monthLabel(),
                done: monthlyStudyDone,
                total: monthlyStudy.length,
                color: activePhase?.color ?? 'var(--accent)',
              },
            ].map(row => (
              <div key={row.label} className="dash-breakdown-row">
                <div className="dash-breakdown-meta">
                  <span className="dash-breakdown-label">{row.label}</span>
                  <span className="dash-breakdown-sub">{row.sub}</span>
                </div>
                <div className="progress-track" style={{ height: '7px', flex: 1 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: row.total ? `${(row.done / row.total) * 100}%` : '0%',
                      background: row.color,
                    }}
                  />
                </div>
                <span className={`dash-breakdown-count${row.done === row.total && row.total > 0 ? ' all-done' : ''}`}>
                  {row.done}/{row.total}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Life tasks breakdown */}
        <Card title="Life Tasks" subtitle="Current period">
          <div className="dash-breakdown">
            {lifeBreakdown.map(cat => (
              <div key={cat.cat}>
                <div className="dash-breakdown-cat">{cat.icon} {cat.cat.charAt(0).toUpperCase() + cat.cat.slice(1)}</div>
                {[
                  { label: 'Daily', done: cat.dailyDone,  total: cat.dailyTotal  },
                  { label: 'Weekly', done: cat.weeklyDone, total: cat.weeklyTotal },
                ].map(row => (
                  <div key={row.label} className="dash-breakdown-row">
                    <span className="dash-breakdown-label">{row.label}</span>
                    <div className="progress-track" style={{ height: '7px', flex: 1 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: row.total ? `${(row.done / row.total) * 100}%` : '0%',
                          background: cat.color,
                        }}
                      />
                    </div>
                    <span className={`dash-breakdown-count${row.done === row.total && row.total > 0 ? ' all-done' : ''}`}>
                      {row.done}/{row.total}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming / overdue scheduled tasks */}
        <Card title="Scheduled Tasks" subtitle={`${scheduledTasks.filter(t => !t.done).length} pending`}>
          {upcoming.length === 0 ? (
            <p className="dash-empty">No pending scheduled tasks.</p>
          ) : (
            <ul className="dash-upcoming">
              {upcoming.map(task => {
                const diff = differenceInCalendarDays(parseISO(task.dueDate), now)
                const isOverdue = diff < 0
                const isToday   = diff === 0
                return (
                  <li key={task.id} className="dash-upcoming-item">
                    <div className="dash-upcoming-info">
                      <span className={`dash-upcoming-dot${isOverdue ? ' dot-overdue' : isToday ? ' dot-today' : ''}`} />
                      <span className="dash-upcoming-title">{task.title}</span>
                    </div>
                    <span
                      className="dash-upcoming-due"
                      style={{
                        color: isOverdue ? '#ef4444' : isToday ? 'var(--accent)' : 'var(--text-faint)',
                        background: isOverdue ? 'rgba(239,68,68,0.08)' : isToday ? 'var(--accent-light)' : 'var(--surface-2)',
                      }}
                    >
                      {isOverdue ? `${Math.abs(diff)}d late` : isToday ? 'Today' : `in ${diff}d`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
