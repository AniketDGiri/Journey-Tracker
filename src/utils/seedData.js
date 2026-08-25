import { uid } from './id'

// Default phases for the interview-prep journey.
// Dates are editable in Settings — these are sensible starting points.
export const defaultPhases = [
  {
    id: 'phase-hld',
    name: 'HLD',
    fullName: 'High-Level Design',
    startDate: '2026-08-25',
    endDate: '2026-11-15',
    color: '#6366f1',
  },
  {
    id: 'phase-lld',
    name: 'LLD',
    fullName: 'Low-Level Design',
    startDate: '2026-11-16',
    endDate: '2027-01-15',
    color: '#0ea5e9',
  },
  {
    id: 'phase-dsa',
    name: 'DSA',
    fullName: 'Data Structures & Algorithms',
    startDate: '2027-01-16',
    endDate: null,
    color: '#22c55e',
  },
]

export const defaultStudyTasks = [
  {
    id: uid(),
    phaseId: 'phase-hld',
    title: 'Study 1 HLD topic / case study',
    frequency: 'daily',
  },
  {
    id: uid(),
    phaseId: 'phase-hld',
    title: 'Write notes / diagrams for the day',
    frequency: 'daily',
  },
  {
    id: uid(),
    phaseId: 'phase-hld',
    title: 'Do a mock HLD design problem end-to-end',
    frequency: 'weekly',
  },
  {
    id: uid(),
    phaseId: 'phase-hld',
    title: 'Review the week — what worked, what to fix',
    frequency: 'weekly',
  },
  {
    id: uid(),
    phaseId: 'phase-hld',
    title: 'Finish one major HLD topic area (e.g. caching, sharding, queues)',
    frequency: 'monthly',
  },
]

export const defaultLifeTasks = [
  {
    id: uid(),
    title: 'Check & clear priority emails',
    category: 'office',
    frequency: 'daily',
  },
  {
    id: uid(),
    title: 'Stand-up / sync with team',
    category: 'office',
    frequency: 'daily',
  },
  {
    id: uid(),
    title: 'Workout / walk',
    category: 'personal',
    frequency: 'daily',
  },
  {
    id: uid(),
    title: 'Weekly planning & review',
    category: 'personal',
    frequency: 'weekly',
  },
]
