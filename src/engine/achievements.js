// Mirrors the "🏆 Achievements" sheet. Each entry reads one field off the
// computed stats object; nothing here can ever be lost once unlocked.
export const ACHIEVEMENTS = [
  { id: 'first-step',    icon: '🌱',  name: 'FIRST STEP',          req: 'Log your first study session',                          field: 'totalHours',        target: 0.1,  xp: 25 },
  { id: 'showing-up',    icon: '🔥',  name: 'SHOWING UP',          req: '5 successful study days',                               field: 'showUpDays',        target: 5,    xp: 50 },
  { id: 'one-week',      icon: '⚡',  name: 'ONE WEEK',            req: '7-day weekday streak',                                  field: 'longestStreak',     target: 7,    xp: 75 },
  { id: 'consistent',    icon: '💪',  name: 'CONSISTENT',          req: '14-day weekday streak',                                 field: 'longestStreak',     target: 14,   xp: 150 },
  { id: 'habit-builder', icon: '🏆',  name: 'HABIT BUILDER',       req: '30-day weekday streak',                                 field: 'longestStreak',     target: 30,   xp: 300 },
  { id: 'disciplined',   icon: '👑',  name: 'DISCIPLINED',         req: '50-day weekday streak',                                 field: 'longestStreak',     target: 50,   xp: 500 },
  { id: 'centurion',     icon: '🐉',  name: 'CENTURION',           req: '100-day weekday streak',                                field: 'longestStreak',     target: 100,  xp: 1000 },
  { id: 'momentum',      icon: '🚀',  name: 'MOMENTUM',            req: '80% consistency for 4 straight weeks',                  field: 'bestGoodWeekRun',   target: 4,    xp: 250 },
  { id: 'hours-50',      icon: '📚',  name: '50 HOURS',            req: '50 total study hours',                                  field: 'totalHours',        target: 50,   xp: 100 },
  { id: 'hours-100',     icon: '⏱️', name: '100 HOURS',           req: '100 total study hours',                                 field: 'totalHours',        target: 100,  xp: 200 },
  { id: 'hours-250',     icon: '⏱️', name: '250 HOURS',           req: '250 total study hours',                                 field: 'totalHours',        target: 250,  xp: 400 },
  { id: 'hours-500',     icon: '⏱️', name: '500 HOURS',           req: '500 total study hours',                                 field: 'totalHours',        target: 500,  xp: 800 },
  { id: 'planner',       icon: '🎯',  name: 'PLANNER',             req: 'Complete 4 weekly reviews',                             field: 'reviewsDone',       target: 4,    xp: 100 },
  { id: 'comeback',      icon: '🔄',  name: 'COMEBACK',            req: 'Come back after a lost week',                           field: 'comebacks',         target: 1,    xp: 200 },
  { id: 'realistic',     icon: '🧠',  name: 'REALISTIC PLANNER',   req: 'Planned hours ≤ available hours, 4 weeks running',      field: 'bestRealisticRun',  target: 4,    xp: 150 },
  { id: 'month-master',  icon: '🏅',  name: 'MONTH MASTER',        req: '≥80% consistency in a calendar month',                  field: 'bestMonthCons',     target: 0.8,  xp: 300 },
  { id: 'phoenix',       icon: '🐦',  name: 'PHOENIX',             req: 'Return from a long break and win 3 required days in a row', field: 'phoenix',       target: 1,    xp: 400 },
  { id: 'weekend',       icon: '🌙',  name: 'WEEKEND WARRIOR',     req: '5 voluntary weekend sessions',                          field: 'weekendDays',       target: 5,    xp: 75 },
  { id: 'century',       icon: '🎖️', name: 'CENTURY OF SHOW-UPS', req: 'Show up on 100 required weekdays',                      field: 'showUpDays',        target: 100,  xp: 500 },
  { id: 'small-wins',    icon: '🧘',  name: 'SMALL WINS COUNT',    req: '3 days you showed up even when the day was small',      field: 'smallWinDays',      target: 3,    xp: 50 },
]

export const PHOENIX_NOTE =
  '🐦 PHOENIX unlocks when you miss 5+ required days in a row, come back, and win 3 required days in a row. Coming back matters more than never falling off.'
