import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import PhaseTimeline from './PhaseTimeline'
import PhaseSettings from './PhaseSettings'
import Heatmap from './Heatmap'
import TaskSection from '../common/TaskSection'
import ScheduledMini from '../common/ScheduledMini'
import Backlog from '../common/Backlog'
import { todayKey, dateKey, weekKey, monthKey, weekRangeLabel, monthLabel, daysUntil, format, endOfWeek, endOfMonth } from '../../utils/dates'
import { computeStreak, heatmapData } from '../../utils/progress'
import { parseISO } from 'date-fns'

function activePhaseId(phases) {
  const now = new Date()
  const active = phases.find((p) => {
    const start = parseISO(p.startDate)
    const end = p.endDate ? parseISO(p.endDate) : null
    return now >= start && (!end || now <= end)
  })
  return active?.id || phases[0]?.id
}

export default function StudyPlan() {
  const {
    phases,
    setPhases,
    studyTasks,
    addStudyTask,
    removeStudyTask,
    studyCompletions,
    toggleStudyCompletion,
    addStudySubtask,
    toggleStudySubtask,
    removeStudySubtask,
    scheduledTasks,
    toggleScheduledTask,
    removeScheduledTask,
    addScheduledSubtask,
    toggleScheduledSubtask,
    removeScheduledSubtask,
  } = useAppStore()

  const [showSettings, setShowSettings] = useState(false)
  const [selectedPhaseId, setSelectedPhaseId] = useState(() => activePhaseId(phases))

  const phaseTasks = useMemo(
    () => studyTasks.filter((t) => t.phaseId === selectedPhaseId),
    [studyTasks, selectedPhaseId]
  )
  const dailyTasks   = phaseTasks.filter((t) => t.frequency === 'daily')
  const weeklyTasks  = phaseTasks.filter((t) => t.frequency === 'weekly')
  const monthlyTasks = phaseTasks.filter((t) => t.frequency === 'monthly')

  const today    = todayKey()
  const weekEnd  = dateKey(endOfWeek(new Date(), { weekStartsOn: 1 }))
  const monthEnd = dateKey(endOfMonth(new Date()))

  const scheduledStudy        = scheduledTasks.filter((t) => t.category === 'study')
  const studySchedDaily       = scheduledStudy.filter((t) => t.dueDate === today)
  const studySchedWeekly      = scheduledStudy.filter((t) => t.dueDate > today && t.dueDate <= weekEnd)
  const studySchedMonthly     = scheduledStudy.filter((t) => t.dueDate > weekEnd && t.dueDate <= monthEnd)

  const streak = useMemo(
    () => computeStreak(studyTasks.filter((t) => t.frequency === 'daily'), studyCompletions),
    [studyTasks, studyCompletions]
  )
  const heatmap = useMemo(
    () => heatmapData(studyTasks.filter((t) => t.frequency === 'daily'), studyCompletions, 364),
    [studyTasks, studyCompletions]
  )

  const selectedPhase = phases.find((p) => p.id === selectedPhaseId)
  const daysLeft = selectedPhase?.endDate ? daysUntil(selectedPhase.endDate) : null

  return (
    <div className="tab-panel">
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-kicker">Current Phase</div>
          <div className="hero-title">
            Finish <strong>{selectedPhase?.name}</strong>
            {selectedPhase?.endDate && (
              <> by {new Date(selectedPhase.endDate).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}</>
            )}
          </div>
          {selectedPhase?.fullName && (
            <div className="hero-phase-label">{selectedPhase.fullName}</div>
          )}
        </div>
        {daysLeft !== null && (
          <div className="hero-countdown">
            <span className="hero-countdown-num">{Math.max(daysLeft, 0)}</span>
            <span className="hero-countdown-label">days left</span>
          </div>
        )}
        <div className="hero-streak" title="Consecutive days with all daily study tasks completed">
          🔥 <strong>{streak}</strong> day streak
        </div>
      </div>

      <div className="section-header-row">
        <h2>Phases</h2>
        <button className="link-btn" onClick={() => setShowSettings((s) => !s)}>
          {showSettings ? 'Close settings' : 'Edit phase dates'}
        </button>
      </div>

      {showSettings && (
        <PhaseSettings phases={phases} onChange={setPhases} onClose={() => setShowSettings(false)} />
      )}

      <PhaseTimeline phases={phases} />

      <div className="phase-selector">
        {phases.map((p) => (
          <button
            key={p.id}
            className={`phase-pill ${p.id === selectedPhaseId ? 'active' : ''}`}
            style={p.id === selectedPhaseId ? { borderColor: p.color, color: p.color } : {}}
            onClick={() => setSelectedPhaseId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <Backlog filter="study" />

      <div className="task-grid">
        <TaskSection
          title="Daily"
          periodLabel={`Today · ${format(new Date(), 'EEE, MMM d')}`}
          tasks={dailyTasks}
          periodKey={todayKey()}
          completions={studyCompletions}
          onToggle={toggleStudyCompletion}
          onAdd={(title) => addStudyTask({ title, frequency: 'daily', phaseId: selectedPhaseId })}
          onRemove={removeStudyTask}
          color={selectedPhase?.color}
          scheduledItems={studySchedDaily}
          onToggleScheduled={toggleScheduledTask}
          onRemoveScheduled={removeScheduledTask}
          onAddSubtask={addStudySubtask}
          onToggleSubtask={toggleStudySubtask}
          onRemoveSubtask={removeStudySubtask}
          onAddScheduledSubtask={addScheduledSubtask}
          onToggleScheduledSubtask={toggleScheduledSubtask}
          onRemoveScheduledSubtask={removeScheduledSubtask}
        />
        <TaskSection
          title="Weekly"
          periodLabel={weekRangeLabel()}
          tasks={weeklyTasks}
          periodKey={weekKey()}
          completions={studyCompletions}
          onToggle={toggleStudyCompletion}
          onAdd={(title) => addStudyTask({ title, frequency: 'weekly', phaseId: selectedPhaseId })}
          onRemove={removeStudyTask}
          color={selectedPhase?.color}
          scheduledItems={studySchedWeekly}
          onToggleScheduled={toggleScheduledTask}
          onRemoveScheduled={removeScheduledTask}
          onAddSubtask={addStudySubtask}
          onToggleSubtask={toggleStudySubtask}
          onRemoveSubtask={removeStudySubtask}
          onAddScheduledSubtask={addScheduledSubtask}
          onToggleScheduledSubtask={toggleScheduledSubtask}
          onRemoveScheduledSubtask={removeScheduledSubtask}
        />
        <TaskSection
          title="Monthly"
          periodLabel={monthLabel()}
          tasks={monthlyTasks}
          periodKey={monthKey()}
          completions={studyCompletions}
          onToggle={toggleStudyCompletion}
          onAdd={(title) => addStudyTask({ title, frequency: 'monthly', phaseId: selectedPhaseId })}
          onRemove={removeStudyTask}
          color={selectedPhase?.color}
          scheduledItems={studySchedMonthly}
          onToggleScheduled={toggleScheduledTask}
          onRemoveScheduled={removeScheduledTask}
          onAddSubtask={addStudySubtask}
          onToggleSubtask={toggleStudySubtask}
          onRemoveSubtask={removeStudySubtask}
          onAddScheduledSubtask={addScheduledSubtask}
          onToggleScheduledSubtask={toggleScheduledSubtask}
          onRemoveScheduledSubtask={removeScheduledSubtask}
        />
      </div>

      <div className="heatmap-card">
        <h3>Discipline tracker</h3>
        <p className="muted">Daily study-task completion over the last 52 weeks.</p>
        <Heatmap data={heatmap} />
      </div>

      <ScheduledMini categoryIds={['study']} accentColor="#6366f1" showBuckets={['overdue', 'upcoming']} />
    </div>
  )
}
