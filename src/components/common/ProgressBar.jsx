export default function ProgressBar({ value, color = '#6366f1', height = 8 }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="progress-track" style={{ height }}>
      <div
        className="progress-fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}
