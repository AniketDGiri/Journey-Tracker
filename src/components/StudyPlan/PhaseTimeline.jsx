import { differenceInCalendarDays, parseISO, format } from 'date-fns'
import ProgressBar from '../common/ProgressBar'

function phaseProgress(phase) {
  const start = parseISO(phase.startDate)
  const now = new Date()
  if (!phase.endDate) {
    // open-ended phase — show elapsed days only, no ratio
    return { ratio: now >= start ? 1 : 0, status: now >= start ? 'active' : 'upcoming' }
  }
  const end = parseISO(phase.endDate)
  if (now < start) return { ratio: 0, status: 'upcoming' }
  if (now > end) return { ratio: 1, status: 'done' }
  const total = differenceInCalendarDays(end, start) || 1
  const elapsed = differenceInCalendarDays(now, start)
  return { ratio: elapsed / total, status: 'active' }
}

export default function PhaseTimeline({ phases }) {
  return (
    <div className="phase-timeline">
      {phases.map((phase) => {
        const { ratio, status } = phaseProgress(phase)
        const daysLeft = phase.endDate
          ? differenceInCalendarDays(parseISO(phase.endDate), new Date())
          : null
        return (
          <div
            className={`phase-card phase-${status}`}
            key={phase.id}
            style={{ '--phase-color': phase.color }}
          >
            <div className="phase-card-top">
              <span
                className="phase-dot"
                style={{ background: phase.color, boxShadow: `0 0 0 3px ${phase.color}28` }}
              />
              <div>
                <div className="phase-name">{phase.name}</div>
                <div className="phase-fullname">{phase.fullName}</div>
              </div>
            </div>
            <ProgressBar value={ratio} color={phase.color} />
            <div className="phase-dates">
              <span>{format(parseISO(phase.startDate), 'MMM d')}</span>
              <span>{phase.endDate ? format(parseISO(phase.endDate), 'MMM d, yyyy') : 'ongoing'}</span>
            </div>
            {status === 'active' && daysLeft !== null && (
              <div className="phase-countdown">
                {daysLeft >= 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'overdue'}
              </div>
            )}
            {status === 'upcoming' && <div className="phase-tag tag-upcoming">Upcoming</div>}
            {status === 'done' && <div className="phase-tag tag-done">✓ Completed</div>}
          </div>
        )
      })}
    </div>
  )
}
