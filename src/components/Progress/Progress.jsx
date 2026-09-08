import { useAppStore } from '../../store/AppStore'
import { Bar, Card, Empty, Stat, hrs, pct } from '../common/ui'

export default function Progress() {
  const { stats, weeks } = useAppStore()
  const { totals, streak, level, consistency } = stats
  const past = weeks.filter((w) => !w.future)

  const maxHours = Math.max(1, ...past.map((w) => Math.max(w.actual, w.targetHours)))
  const cumulative = past.reduce((acc, w) => {
    acc.push({ ...w, cumXP: (acc[acc.length - 1]?.cumXP ?? 0) + w.totalXP })
    return acc
  }, [])
  const maxXP = Math.max(1, ...cumulative.map((w) => w.cumXP))

  return (
    <>
      <Card title="📈 Progress" subtitle="Everything the system knows, in one place.">
        <div className="stat-grid">
          <Stat label="Total study hours" value={hrs(totals.totalHours)} />
          <Stat label="Total study days" value={totals.totalDaysStudied} />
          <Stat label="Days I showed up" value={`${totals.showUpDays} / ${totals.reqElapsed}`} />
          <Stat label="Show-up rate" value={pct(totals.showUpRate)} />
          <Stat label="Current streak" value={streak.current} />
          <Stat label="Longest streak" value={streak.longest} />
          <Stat label="Level" value={`${level.level} — ${level.title}`} />
          <Stat label="Total XP" value={level.totalXP.toLocaleString()} />
          <Stat label="Achievements" value={`${stats.achUnlocked} / ${stats.achievements.length}`} />
          <Stat label="Productive days" value={totals.productiveDays} />
          <Stat label="Average weekly hours" value={hrs(totals.avgWeekly)} />
          <Stat label="Avg hours / required day" value={hrs(totals.avgPerReqDay)} />
          <Stat label="7-day consistency" value={pct(consistency.d7)} />
          <Stat label="14-day consistency" value={pct(consistency.d14)} />
          <Stat label="30-day consistency" value={pct(consistency.d30)} />
          <Stat label="Weekend bonus days" value={totals.weekendDays} />
          <Stat label="Recovery tokens" value={streak.tokensAvail} />
          <Stat label="Tasks completed" value={totals.tasksCompleted} />
          <Stat label="Tasks deferred" value={totals.tasksDeferred} />
        </div>
      </Card>

      <Card title="⏱️ Hours per week" subtitle="Bars are actual hours; the line is your weekly target." className="card-wide">
        {past.length === 0 ? (
          <Empty>No completed weeks yet.</Empty>
        ) : (
          <div className="chart">
            {past.map((w) => (
              <div className="chart-col" key={w.startKey} title={`${w.label}: ${hrs(w.actual)} of ${hrs(w.targetHours)}`}>
                <div className="chart-bar-wrap">
                  <div className="chart-target" style={{ bottom: `${(w.targetHours / maxHours) * 100}%` }} />
                  <div
                    className={`chart-bar ${w.actual >= w.targetHours ? 'chart-bar-good' : ''}`}
                    style={{ height: `${(w.actual / maxHours) * 100}%` }}
                  />
                </div>
                <span className="chart-label">{w.weekNo}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="📊 Consistency per week" className="card-wide">
        {past.length === 0 ? (
          <Empty>No completed weeks yet.</Empty>
        ) : (
          <div className="week-bars">
            {past.map((w) => (
              <div className="week-bar-row" key={w.startKey}>
                <span className="week-bar-label">{w.label}</span>
                <Bar value={w.consistency} tone={w.consistency >= 0.8 ? 'success' : 'accent'} />
                <span className="week-bar-pct">{pct(w.consistency)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="✨ Cumulative XP" className="card-wide">
        {cumulative.length === 0 ? (
          <Empty>No XP yet.</Empty>
        ) : (
          <div className="chart">
            {cumulative.map((w) => (
              <div className="chart-col" key={w.startKey} title={`${w.label}: ${w.cumXP.toLocaleString()} XP`}>
                <div className="chart-bar-wrap">
                  <div className="chart-bar chart-bar-xp" style={{ height: `${(w.cumXP / maxXP) * 100}%` }} />
                </div>
                <span className="chart-label">{w.weekNo}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
