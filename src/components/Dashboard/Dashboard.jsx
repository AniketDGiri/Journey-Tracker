import { useAppStore } from '../../store/AppStore'
import { Bar, Card, Empty, Row, Stat, hrs, pct } from '../common/ui'
import Heatmap from './Heatmap'

export default function Dashboard() {
  const { stats, settings, days } = useAppStore()
  const { today, level, streak, totals, consistency, momentum, thisWeek, recovery, countdown, messages } = stats

  return (
    <div className="dash">
      <div className="hero">
        <p className="hero-kicker">You don't need to be perfect. You need to keep showing up.</p>
        <h1 className="hero-title">{today.label}</h1>
        <p className="hero-msg">{messages.emptyState || messages.dailyMsg}</p>
        {level.levelUp && (
          <p className="hero-levelup">🎉 LEVEL UP! You reached Level {level.level} — {level.title}</p>
        )}
      </div>

      <div className="dash-grid">
        <Card title="🎯 Today" subtitle={today.status}>
          <div className="today-win">{today.winLabel}</div>
          <Bar value={today.progress} height={14} tone={today.progress >= 1 ? 'success' : 'accent'} />
          <div className="stat-row">
            <Stat label="Target" value={hrs(today.target)} />
            <Stat label="Studied" value={hrs(today.hours)} />
            <Stat label="Remaining" value={today.remaining <= 0 ? 'met' : hrs(today.remaining)} />
            <Stat label="Today's XP" value={`+${today.xp}`} />
          </div>
          <Row label="Productivity" value={`${pct(today.productivity)}  ${today.productivityLabel}`} />
          <p className="note">{messages.nextWin}</p>
        </Card>

        <Card title="🎖️ Level" subtitle={`LEVEL ${level.level} — ${level.title}`}>
          <div className="xp-line">
            {level.totalXP.toLocaleString()} / {level.nextXP.toLocaleString()} XP
          </div>
          <Bar value={level.progress} height={14} tone="violet" />
          <p className="note">
            {level.toNext > 0
              ? `${level.toNext.toLocaleString()} XP until Level ${level.level + 1}`
              : 'Highest rank reached.'}
          </p>
          <div className="stat-row">
            <Stat label="XP last 7 days" value={`+${level.xpLast7}`} />
            <Stat label="Achievements" value={`${stats.achUnlocked} / ${stats.achievements.length}`} />
          </div>
        </Card>

        <Card
          title="🔥 Days I showed up"
          subtitle="the only number that really matters"
        >
          <div className="big-number">
            {totals.showUpDays} <span className="big-number-of">/ {totals.reqElapsed}</span>
          </div>
          <Bar value={totals.showUpRate} height={14} tone="success" />
          <p className="note">{messages.showUpLine}</p>
          <div className="stat-row">
            <Stat label="Current streak" value={streak.current} sub="weekdays" />
            <Stat label="Longest streak" value={streak.longest} />
            <Stat label="Weekend bonus" value={totals.weekendDays} sub="never required" />
            <Stat label="Recovery tokens" value={`${streak.tokensAvail} of ${settings.maxTokens}`} />
          </div>
          {streak.recoveryMsg && <p className="note note-warn">{streak.recoveryMsg}</p>}
        </Card>

        <Card title="🎯 Countdown" subtitle={`Target: ${settings.targetDate}`}>
          <div className="big-number">{countdown.daysLeft.toLocaleString()} <span className="big-number-of">days</span></div>
          <div className="stat-row">
            <Stat label="Weekdays left" value={countdown.weekdaysLeft.toLocaleString()} />
            <Stat label="Weeks left" value={countdown.weeksLeft.toLocaleString()} />
            <Stat
              label="Study hours left"
              value={`${countdown.hoursLeft.toLocaleString()}h`}
              sub={`${settings.weekdayTarget.toFixed(1)}h × weekdays left`}
            />
          </div>
        </Card>

        <Card title="📆 This week" subtitle={thisWeek?.status ?? '—'}>
          {thisWeek ? (
            <>
              <Bar value={thisWeek.consSoFar ?? 0} height={14} />
              <div className="stat-row">
                <Stat label="Target" value={hrs(thisWeek.targetHours)} />
                <Stat
                  label="Completed"
                  value={hrs(thisWeek.actual)}
                  sub={thisWeek.weekendBonus > 0 ? `+${hrs(thisWeek.weekendBonus)} bonus` : null}
                />
                <Stat label="Show-up days" value={`${thisWeek.showUpDays} / ${thisWeek.requiredDays}`} />
                <Stat label="Consistency" value={pct(thisWeek.consSoFar)} />
              </div>
              <Row
                label="Weekly challenge"
                value={`${thisWeek.activeChallenge}  [${thisWeek.challengeResult ?? 0} / ${thisWeek.challengeTarget}]`}
              />
              <Row label="Plan size" value={thisWeek.planSizeCheck} />
              <Row label="Plan quality" value={thisWeek.planQuality ?? '—'} />
              <p className="note">{messages.execNote}</p>
            </>
          ) : (
            <Empty>This week is outside the tracker range.</Empty>
          )}
        </Card>

        <Card title="🔄 Recovery & next win" subtitle={recovery.head}>
          <p className="note">{recovery.line1}</p>
          <p className="note">{recovery.line2}</p>
          <p className="note note-quiet">{recovery.line3}</p>
        </Card>

        <Card title="📈 Momentum" subtitle={momentum.label}>
          <p className="note">{momentum.note}</p>
          <div className="cons-list">
            {[
              ['7-day', consistency.d7],
              ['14-day', consistency.d14],
              ['30-day', consistency.d30],
            ].map(([label, v]) => (
              <div className="cons-row" key={label}>
                <span className="cons-label">{label}</span>
                <Bar value={v} />
                <span className="cons-pct">{pct(v)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="🏆 Next achievement">
          <Row label="Closest unlock" value={stats.nextAch ? `${stats.nextAch.icon} ${stats.nextAch.name} — ${stats.nextAch.req}` : '🏆 Everything unlocked'} />
          <Row label="Next streak milestone" value={streak.nextMilestoneTxt} />
          <Row label="Unlocked so far" value={`${stats.achUnlocked} / ${stats.achievements.length}`} />
        </Card>
      </div>

      <Card
        title="📅 Consistency heatmap"
        subtitle="8 weeks back, 4 weeks ahead"
        className="card-wide"
      >
        <Heatmap days={days} today={stats.today.key} />
      </Card>
    </div>
  )
}
