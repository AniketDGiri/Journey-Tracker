import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { key, round2 } from './days.js'
import { MONTHLY_CHALLENGES } from './config.js'

const findChallenge = (label) => MONTHLY_CHALLENGES.find((c) => c.label === label)

/** Rebuilds the "Monthly Goals" month rows from the derived day rows. */
export function buildMonths({ settings, days, monthInputs, achievements, today }) {
  const todayK = key(today)
  const first = startOfMonth(days[0].date)
  const lastDate = days[days.length - 1].date

  const months = []
  for (let i = 0; ; i++) {
    const start = addMonths(first, i)
    if (start > lastDate) break
    const end = endOfMonth(start)
    const startK = key(start)
    const endK = key(end)
    const monthKey = format(start, 'yyyy-MM')
    const input = monthInputs[monthKey] || {}

    const inMonth = days.filter((d) => d.key >= startK && d.key <= endK)
    const req = inMonth.filter((d) => d.required)
    const future = startK > todayK

    const studyHours = round2(req.reduce((a, d) => a + d.actual, 0))
    const weekendBonus = round2(inMonth.filter((d) => !d.required).reduce((a, d) => a + d.actual, 0))
    const showUpDays = req.filter((d) => d.win === 1).length
    const requiredDays = req.length
    const showUpRate = requiredDays ? showUpDays / requiredDays : 0
    const productiveDays = req.filter((d) => d.completion >= settings.prodThreshold).length
    const tasksCompleted = inMonth.reduce((a, d) => a + d.tasksCompleted, 0)
    const avgDaily = requiredDays ? round2(studyHours / requiredDays) : 0
    const longestStreak = future ? 0 : Math.max(0, ...inMonth.map((d) => d.streak ?? 0))
    const xp = inMonth.reduce((a, d) => a + d.xp, 0)

    const ch = findChallenge(input.challenge)
    const challengeTarget = ch ? ch.target : 0
    let challengeResult = null
    if (!future && ch) {
      if (ch.metric === 'SHOWUP') challengeResult = showUpDays
      else if (ch.metric === 'HOURS') challengeResult = studyHours
      else if (ch.metric === 'CONSISTENCY') challengeResult = showUpRate
      else if (ch.metric === 'PRODUCTIVE') challengeResult = productiveDays
      else challengeResult = 0
    }
    // The month pays out on consistency OR on the chosen challenge.
    const monthlyXP =
      !future && (showUpRate >= settings.monthlyGoal || (challengeTarget > 0 && (challengeResult ?? 0) >= challengeTarget))
        ? settings.xpMonth
        : 0

    const unlockedThisMonth = achievements.filter(
      (a) => a.unlockedOn && a.unlockedOn >= startK && a.unlockedOn <= endK
    ).length

    const reqSoFar =
      req.filter((d) => d.key < todayK).length + (req.some((d) => d.key === todayK && d.win === 1) ? 1 : 0)
    const rateSoFar = reqSoFar === 0 ? null : showUpDays / reqSoFar

    let status = null
    if (!future) {
      if (endK < todayK) {
        status =
          showUpRate >= settings.monthlyGoal
            ? '🏆 MONTH COMPLETE'
            : showUpRate >= 0.6
              ? '🟡 Decent month'
              : '🔴 Tough month'
      } else if (reqSoFar === 0) {
        status = '⚪ Just started'
      } else {
        status =
          rateSoFar >= settings.monthlyGoal
            ? '🟢 ON TRACK'
            : rateSoFar >= 0.6
              ? '🟡 In progress'
              : '🔴 Behind pace'
      }
    }

    months.push({
      start, end, monthKey, future,
      label: format(start, 'MMM yyyy'),
      studyHours, weekendBonus, showUpDays, requiredDays, showUpRate, productiveDays,
      tasksCompleted, avgDaily, longestStreak, xp,
      challenge: input.challenge || '', challengeTarget, challengeResult,
      monthlyXP, unlockedThisMonth, status, reqSoFar, rateSoFar,
    })
  }

  return months
}

/** The free-form monthly goal list (month, goal, category, target, completed). */
export function decorateGoals(goals) {
  return goals.map((g) => {
    const target = Number(g.target) || 0
    const progress = !g.goal || target === 0 ? null : Math.min(1, (Number(g.completed) || 0) / target)
    const status =
      progress === null ? '—' : progress >= 1 ? '✅ Done' : progress >= 0.5 ? '🟡 On track' : '🔴 Behind'
    return { ...g, progress, status }
  })
}
