import { useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { WEEKLY_CHALLENGES, MISS_REASONS } from '../../engine/config'
import { Bar, Card, Field, Row, Stat, hrs, pct } from '../common/ui'

export default function WeeklyReview() {
  const { weeks, setWeekInput, stats } = useAppStore()
  const current = weeks.find((w) => w.startKey <= stats.today.key && w.endKey >= stats.today.key)
  const [selected, setSelected] = useState(current?.startKey ?? weeks[0]?.startKey)
  const w = weeks.find((x) => x.startKey === selected) ?? weeks[0]
  if (!w) return null

  const set = (k) => (e) =>
    setWeekInput(w.startKey, { [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <>
      <Card
        title="📊 Weekly Review"
        subtitle="Reviewing the week is what turns a streak into a system."
        actions={
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {weeks.filter((x) => !x.future).map((x) => (
              <option key={x.startKey} value={x.startKey}>
                Week {x.weekNo} · {x.label}
              </option>
            ))}
          </select>
        }
      >
        <div className="week-head">
          <span className="week-status">{w.status ?? '—'}</span>
          <span className="week-momentum">{w.momentum ?? ''}</span>
        </div>
        <Bar value={w.consSoFar ?? w.consistency} height={14} />
        <div className="stat-row">
          <Stat label="Target" value={hrs(w.targetHours)} />
          <Stat label="Actual" value={hrs(w.actual)} sub={w.weekendBonus > 0 ? `+${hrs(w.weekendBonus)} bonus` : null} />
          <Stat label="Show-up days" value={`${w.showUpDays} / ${w.requiredDays}`} />
          <Stat label="Productive days" value={w.productiveDays} />
          <Stat label="Consistency" value={pct(w.consSoFar ?? w.consistency)} />
          <Stat label="XP this week" value={w.totalXP} />
        </div>
        <Row label="Execution rate" value={pct(w.executionRate)} hint="tasks completed ÷ tasks planned so far" />
        <Row label="Plan size check" value={w.planSizeCheck} />
        <Row label="Plan quality" value={w.planQuality ?? '—'} />
        <Row label="Longest streak reached" value={w.streakReached ?? '—'} />
        <Row label="Deferred tasks" value={w.deferred} />
      </Card>

      <Card title="🎯 Weekly challenge" subtitle="Behaviour-based, never topic-based.">
        <Field label="Your challenge (leave on the suggestion if you like it)">
          <select className="input" value={w.userChallenge} onChange={set('challenge')}>
            <option value="">Suggested — {w.suggested}</option>
            {WEEKLY_CHALLENGES.map((c) => (
              <option key={c.label} value={c.label}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Row
          label={w.activeChallenge}
          value={`${w.challengeResult ?? 0} / ${w.challengeTarget}  ${w.challengeDone ? '🏆 DONE' : '—'}`}
        />
        <Bar value={w.challengeTarget ? (w.challengeResult ?? 0) / w.challengeTarget : 0} />
      </Card>

      <Card title="📝 Reflection" subtitle="Plans get resized, not people.">
        <div className="form-grid">
          <Field label="What went well" wide>
            <textarea className="input" rows={3} value={w.wentWell} onChange={set('wentWell')} />
          </Field>
          <Field label="What didn't" wide>
            <textarea className="input" rows={3} value={w.didntGo} onChange={set('didntGo')} />
          </Field>
          <Field label="Why I missed sessions">
            <select className="input" value={w.missReason} onChange={set('missReason')}>
              <option value="">—</option>
              {MISS_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="One thing to improve">
            <input className="input" value={w.improve} onChange={set('improve')} />
          </Field>
          <Field label="Most important goal next week" wide>
            <input className="input" value={w.nextGoal} onChange={set('nextGoal')} />
          </Field>
        </div>
        <label className="check-line">
          <input type="checkbox" checked={w.reviewComplete} onChange={set('reviewComplete')} />
          Review complete
        </label>
      </Card>

      <Card title="📋 All weeks" className="card-wide">
        <div className="table-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th><th>Week</th><th>Actual</th><th>Show-ups</th><th>Productive</th>
                <th>Consistency</th><th>Streak</th><th>XP</th><th>Challenge</th><th>Status</th><th>Momentum</th><th>Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {weeks.filter((x) => !x.future).map((x) => (
                <tr key={x.startKey} className={x.startKey === w.startKey ? 'row-today' : ''}>
                  <td>{x.weekNo}</td>
                  <td className="nowrap">{x.label}</td>
                  <td>{hrs(x.actual)}</td>
                  <td>{x.showUpDays}/{x.requiredDays}</td>
                  <td>{x.productiveDays}</td>
                  <td>{pct(x.consistency)}</td>
                  <td>{x.streakReached ?? '—'}</td>
                  <td>{x.totalXP}</td>
                  <td className="nowrap">{x.challengeDone ? '🏆' : '—'}</td>
                  <td className="nowrap">{x.status ?? '—'}</td>
                  <td className="nowrap">{x.momentum ?? '—'}</td>
                  <td>{x.reviewComplete ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
