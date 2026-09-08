import { useAppStore } from '../../store/AppStore'
import { PHOENIX_NOTE } from '../../engine/achievements'
import { Bar, Card, pct } from '../common/ui'

const fmt = (n) => (n < 1 && n > 0 ? n.toFixed(2) : Math.round(n * 100) / 100)

export default function Achievements() {
  const { stats } = useAppStore()
  const { achievements, achUnlocked } = stats
  const xp = achievements.filter((a) => a.unlocked).reduce((s, a) => s + a.xp, 0)

  return (
    <Card
      title="🏆 Achievements"
      subtitle="Everything here unlocks itself. Nothing here can ever be lost."
      actions={
        <span className="pill">
          {achUnlocked} / {achievements.length} · {xp.toLocaleString()} XP
        </span>
      }
      className="card-wide"
    >
      <div className="ach-grid">
        {achievements.map((a) => {
          const ratio = a.target > 0 ? Math.min(1, a.progress / a.target) : 0
          return (
            <div className={`ach ${a.unlocked ? 'ach-on' : ''}`} key={a.id}>
              <div className="ach-top">
                <span className="ach-icon">{a.icon}</span>
                <div className="ach-name">
                  <strong>{a.name}</strong>
                  <span className="ach-req">{a.req}</span>
                </div>
                <span className="ach-xp">+{a.xp}</span>
              </div>
              <Bar value={ratio} tone={a.unlocked ? 'success' : 'accent'} />
              <div className="ach-foot">
                <span>
                  {a.target <= 1 && a.target > 0 && a.field !== 'comebacks' && a.field !== 'phoenix'
                    ? `${pct(a.progress)} / ${pct(a.target)}`
                    : `${fmt(a.progress)} / ${fmt(a.target)}`}
                </span>
                <span>{a.unlocked ? (a.unlockedOn ? `🏆 ${a.unlockedOn}` : '🏆 UNLOCKED') : '🔒 Locked'}</span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="note note-quiet">{PHOENIX_NOTE}</p>
    </Card>
  )
}
