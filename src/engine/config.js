// Mirrors the "⚙️ Settings" sheet. Every number the engine uses comes from here.
export const DEFAULT_SETTINGS = {
  weekdayTarget: 3,
  reqDays: 5,
  weekendRequired: 0,
  minWin: 1,
  prodThreshold: 0.8,
  xpHour: 10,
  xpWin: 25,
  xpProd: 50,
  xpPerfect: 75,
  xpWeek: 150,
  xpMonth: 500,
  xpWeekend: 25,
  xpCap: 100,
  xpCapWknd: 50,
  weeklyGoal: 0.8,
  monthlyGoal: 0.8,
  xpChallenge: 75,
  tokensOn: true,
  tokenDays: 10,
  maxTokens: 2,
  targetDate: '2027-03-01',
  startDate: '2026-08-31',
}

export const LEVELS = [
  { level: 1, xp: 0, title: '🌱 Beginner' },
  { level: 2, xp: 250, title: '📖 Learner' },
  { level: 3, xp: 500, title: '🔥 Getting Serious' },
  { level: 4, xp: 750, title: '⚡ Consistent' },
  { level: 5, xp: 1000, title: '💪 Disciplined' },
  { level: 6, xp: 1250, title: '🚀 Momentum Builder' },
  { level: 7, xp: 1500, title: '🏆 Interview Ready' },
  { level: 8, xp: 1750, title: '👑 Elite' },
  { level: 9, xp: 2100, title: '🧠 Relentless' },
  { level: 10, xp: 2500, title: '🌟 Unstoppable' },
  { level: 11, xp: 2950, title: '🛡️ Ironclad' },
  { level: 12, xp: 3450, title: '🎯 Precision' },
  { level: 13, xp: 4000, title: '⚔️ Battle Ready' },
  { level: 14, xp: 4650, title: '🧗 Summit Seeker' },
  { level: 15, xp: 5400, title: '🦾 Machine' },
  { level: 16, xp: 6250, title: '🌠 Legend' },
  { level: 17, xp: 7250, title: '🏛️ Architect' },
  { level: 18, xp: 8400, title: '🔮 Oracle' },
  { level: 19, xp: 9700, title: '🐉 Apex' },
  { level: 20, xp: 11200, title: '♾️ Immortal' },
  { level: 21, xp: 12900, title: '🌋 Force of Nature' },
  { level: 22, xp: 14800, title: '🧭 True North' },
  { level: 23, xp: 17000, title: '💎 Diamond Mind' },
  { level: 24, xp: 19500, title: '🪐 Orbit Breaker' },
  { level: 25, xp: 22500, title: '🏔️ Everest' },
]

export const MISS_REASONS = [
  "(none — didn't miss)",
  'Work',
  'Family',
  'Fatigue',
  'Poor planning',
  'Distraction',
  'Phone/social media',
  'Unexpected event',
  'Overplanning',
  'Other',
]

// Behaviour-based, never topic-based.
export const WEEKLY_CHALLENGES = [
  { label: 'Show Up 5 Times', metric: 'SHOWUP', target: 5 },
  { label: 'Show Up 4 Times', metric: 'SHOWUP', target: 4 },
  { label: 'Complete 3 Minimum Wins', metric: 'SHOWUP', target: 3 },
  { label: 'Complete 15 Study Hours', metric: 'HOURS', target: 15 },
  { label: 'Complete 10 Study Hours', metric: 'HOURS', target: 10 },
  { label: 'Achieve 4 Productive Days', metric: 'PRODUCTIVE', target: 4 },
  { label: 'Study on 3 consecutive weekdays', metric: 'STREAK', target: 3 },
  { label: 'Finish the week without overplanning', metric: 'NOOVERPLAN', target: 1 },
]

export const MONTHLY_CHALLENGES = [
  { label: 'Show up on 18 weekdays', metric: 'SHOWUP', target: 18 },
  { label: 'Complete 60 study hours', metric: 'HOURS', target: 60 },
  { label: 'Maintain 80% consistency', metric: 'CONSISTENCY', target: 0.8 },
  { label: 'Achieve 15 productive days', metric: 'PRODUCTIVE', target: 15 },
]

export const STREAK_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 50, 75, 100]
