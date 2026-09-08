import { useAppStore } from '../../store/AppStore'
import { LEVELS } from '../../engine/config'
import { Card } from '../common/ui'

const GROUPS = [
  {
    title: 'Targets',
    fields: [
      ['weekdayTarget', 'Weekday study target (hours)', 'number', 'Hours you aim for on a required weekday.'],
      ['reqDays', 'Required days per week', 'number', '5 = Monday–Friday are required. Sat/Sun stay optional.'],
      ['weekendRequired', 'Weekend required hours', 'number', 'Stays 0. Weekend study is bonus, never a duty.'],
      ['minWin', 'Minimum daily win (hours)', 'number', "The 'I showed up' bar. Hit this and the day counts."],
      ['prodThreshold', 'Productive threshold', 'number', "Share of the daily target that makes a day 'productive'."],
    ],
  },
  {
    title: 'XP',
    fields: [
      ['xpHour', 'XP per study hour', 'number', 'XP for every hour logged.'],
      ['xpWin', 'XP for minimum win', 'number', 'XP for showing up at all.'],
      ['xpProd', 'XP for productive day', 'number', 'XP when the day reaches the productive threshold.'],
      ['xpPerfect', 'XP for perfect day', 'number', 'XP when the day reaches 100% of target.'],
      ['xpWeek', 'XP for weekly goal', 'number', 'XP when weekly consistency reaches the weekly goal.'],
      ['xpMonth', 'XP for monthly goal', 'number', 'XP when monthly consistency reaches the monthly goal.'],
      ['xpWeekend', 'Bonus XP for weekend study', 'number', 'Voluntary weekend study bonus. Optional, never required.'],
      ['xpChallenge', 'Weekly challenge XP', 'number', 'XP for completing the optional weekly challenge.'],
      ['xpCap', 'Daily XP cap (weekdays)', 'number', 'Anti-gaming: a 10-hour day cannot buy four days off.'],
      ['xpCapWknd', 'Weekend bonus XP cap', 'number', 'Max bonus XP from one weekend day.'],
    ],
  },
  {
    title: 'Goals & recovery',
    fields: [
      ['weeklyGoal', 'Weekly consistency goal', 'number', 'Weekly show-up rate that earns the weekly XP.'],
      ['monthlyGoal', 'Monthly consistency goal', 'number', 'Monthly show-up rate that earns the monthly XP.'],
      ['tokensOn', 'Recovery tokens enabled', 'checkbox', 'A token can protect your streak on one missed weekday.'],
      ['tokenDays', 'Study days to earn 1 token', 'number', 'Successful required days needed to earn one token.'],
      ['maxTokens', 'Max recovery tokens', 'number', 'Hard cap. Tokens can never become an escape hatch.'],
    ],
  },
  {
    title: 'Dates',
    fields: [
      ['targetDate', 'Target date (job switch)', 'date', 'Drives every countdown.'],
      ['startDate', 'Tracker start date', 'date', 'First day of the Daily Planner.'],
    ],
  },
]

export default function Settings() {
  const { settings, updateSettings, resetSettings, stats } = useAppStore()

  const onChange = (name, type) => (e) => {
    const raw = type === 'checkbox' ? e.target.checked : e.target.value
    updateSettings({ [name]: type === 'number' ? Number(raw) : raw })
  }

  return (
    <>
      <Card
        title="⚙️ Settings"
        subtitle="Nothing is hard-coded anywhere else — change a value here and targets, XP, levels, streak rules and the countdown all re-compute."
        actions={<button className="btn" onClick={resetSettings}>Reset to defaults</button>}
      >
        {GROUPS.map((g) => (
          <div className="settings-group" key={g.title}>
            <h3 className="settings-group-title">{g.title}</h3>
            {g.fields.map(([name, label, type, hint]) => (
              <div className="settings-row" key={name}>
                <div className="settings-label">
                  <span>{label}</span>
                  <span className="settings-hint">{hint}</span>
                </div>
                <input
                  className={`input ${type === 'checkbox' ? 'input-check' : 'input-num'}`}
                  type={type}
                  step={type === 'number' ? 'any' : undefined}
                  checked={type === 'checkbox' ? settings[name] : undefined}
                  value={type === 'checkbox' ? undefined : settings[name]}
                  onChange={onChange(name, type)}
                />
              </div>
            ))}
          </div>
        ))}
      </Card>

      <Card title="🎖️ Levels & ranks" className="card-wide">
        <div className="level-grid">
          {LEVELS.map((l) => (
            <div className={`level-chip ${l.level === stats.level.level ? 'level-now' : ''} ${stats.level.totalXP >= l.xp ? 'level-reached' : ''}`} key={l.level}>
              <span className="level-num">{l.level}</span>
              <span className="level-title">{l.title}</span>
              <span className="level-xp">{l.xp.toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
