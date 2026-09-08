import { useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { MONTHLY_CHALLENGES } from '../../engine/config'
import { Bar, Card, Empty, hrs, pct } from '../common/ui'

const BLANK = { month: '', goal: '', category: '', target: 1, completed: 0, notes: '' }

export default function MonthlyGoals() {
  const { months, setMonthInput, goals, addGoal, updateGoal, removeGoal, stats } = useAppStore()
  const [draft, setDraft] = useState({ ...BLANK, month: stats.today.key.slice(0, 7) })

  const submit = (e) => {
    e.preventDefault()
    if (!draft.goal.trim()) return
    addGoal({ ...draft, goal: draft.goal.trim(), target: Number(draft.target) || 0, completed: Number(draft.completed) || 0 })
    setDraft({ ...BLANK, month: draft.month })
  }
  const set = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.value }))

  return (
    <>
      <Card title="🗓️ Monthly Goals" subtitle="A month pays out on consistency, or on the challenge you chose." className="card-wide">
        <div className="table-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Month</th><th>Hours</th><th>Bonus</th><th>Show-ups</th><th>Rate</th>
                <th>Productive</th><th>Avg/day</th><th>Streak</th><th>XP</th>
                <th className="th-wide">Challenge</th><th>Result</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {months.filter((m) => !m.future).map((m) => (
                <tr key={m.monthKey} className={m.monthKey === stats.today.key.slice(0, 7) ? 'row-today' : ''}>
                  <td className="nowrap cell-strong">{m.label}</td>
                  <td>{hrs(m.studyHours)}</td>
                  <td>{hrs(m.weekendBonus)}</td>
                  <td>{m.showUpDays}/{m.requiredDays}</td>
                  <td>{pct(m.showUpRate)}</td>
                  <td>{m.productiveDays}</td>
                  <td>{hrs(m.avgDaily)}</td>
                  <td>{m.longestStreak}</td>
                  <td>{m.xp + m.monthlyXP}</td>
                  <td>
                    <select className="cell-input" value={m.challenge} onChange={(e) => setMonthInput(m.monthKey, { challenge: e.target.value })}>
                      <option value="">—</option>
                      {MONTHLY_CHALLENGES.map((c) => <option key={c.label}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="nowrap">
                    {m.challengeTarget
                      ? `${m.challengeResult?.toFixed?.(m.challengeResult < 1 ? 2 : 0) ?? 0} / ${m.challengeTarget}`
                      : '—'}
                  </td>
                  <td className="nowrap">{m.status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="🎯 Personal goals" subtitle="Anything you want to move this month — not just study hours." className="card-wide">
        <form className="add-form" onSubmit={submit}>
          <input className="input" type="month" value={draft.month} onChange={set('month')} />
          <input className="input input-grow" placeholder="Goal…" value={draft.goal} onChange={set('goal')} />
          <input className="input" placeholder="Category" value={draft.category} onChange={set('category')} />
          <input className="input input-num" type="number" min="0" value={draft.target} onChange={set('target')} title="Target" />
          <button className="btn btn-primary" type="submit">Add</button>
        </form>

        {goals.length === 0 ? (
          <Empty>No monthly goals yet.</Empty>
        ) : (
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr><th>Month</th><th className="th-wide">Goal</th><th>Category</th><th>Target</th><th>Done</th><th>Progress</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {goals.map((g) => (
                  <tr key={g.id}>
                    <td><input className="cell-input cell-narrow" type="month" value={g.month ?? ''} onChange={(e) => updateGoal(g.id, { month: e.target.value })} /></td>
                    <td><input className="cell-input" value={g.goal} onChange={(e) => updateGoal(g.id, { goal: e.target.value })} /></td>
                    <td><input className="cell-input cell-narrow" value={g.category ?? ''} onChange={(e) => updateGoal(g.id, { category: e.target.value })} /></td>
                    <td><input className="cell-input cell-num" type="number" min="0" value={g.target ?? 0} onChange={(e) => updateGoal(g.id, { target: Number(e.target.value) || 0 })} /></td>
                    <td><input className="cell-input cell-num" type="number" min="0" value={g.completed ?? 0} onChange={(e) => updateGoal(g.id, { completed: Number(e.target.value) || 0 })} /></td>
                    <td className="cell-bar"><Bar value={g.progress ?? 0} /></td>
                    <td className="nowrap">{g.status}</td>
                    <td><button className="btn-icon" onClick={() => removeGoal(g.id)} title="Delete goal">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
