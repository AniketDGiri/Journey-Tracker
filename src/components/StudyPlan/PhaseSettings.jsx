export default function PhaseSettings({ phases, onChange, onClose }) {
  const update = (id, field, value) => {
    onChange(
      phases.map((p) => (p.id === id ? { ...p, [field]: value || null } : p))
    )
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h4>Phase dates</h4>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>
      {phases.map((phase) => (
        <div className="settings-row" key={phase.id}>
          <span className="phase-dot" style={{ background: phase.color }} />
          <span className="settings-phase-name">{phase.name}</span>
          <label>
            Start
            <input
              type="date"
              value={phase.startDate || ''}
              onChange={(e) => update(phase.id, 'startDate', e.target.value)}
            />
          </label>
          <label>
            End
            <input
              type="date"
              value={phase.endDate || ''}
              onChange={(e) => update(phase.id, 'endDate', e.target.value)}
            />
          </label>
        </div>
      ))}
    </div>
  )
}
