import { useEffect, useState } from 'react'
import { NEXT_REVIEW_PRESETS, dateIn } from '../../engine/revision'

/**
 * Asked the moment a revision is marked done: schedule the next pass, or call
 * the topic finished. Nothing is decided for you up front.
 */
export default function RevisionDoneDialog({ revision, today, onResolve, onCancel }) {
  const [date, setDate] = useState(() => dateIn(new Date(`${today}T00:00:00`), 7))

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  if (!revision) return null
  const base = new Date(`${today}T00:00:00`)

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Revision done">
        <h3 className="modal-title">Revised “{revision.topic}”</h3>
        <p className="note">
          Nice. Do you want another pass at this later, or is it done for good?
        </p>

        <div className="modal-section">
          <span className="field-label">Revise again</span>
          <div className="preset-row">
            {NEXT_REVIEW_PRESETS.map((p) => {
              const value = dateIn(base, p.days)
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`btn btn-sm ${date === value ? 'btn-primary' : ''}`}
                  onClick={() => setDate(value)}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <input
            className="input"
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn" type="button" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            type="button"
            onClick={() => onResolve({ completed: true, on: today })}
          >
            ✅ Mark complete
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!date}
            onClick={() => onResolve({ nextReview: date, completed: false, on: today })}
          >
            Set next revision
          </button>
        </div>
      </div>
    </div>
  )
}
