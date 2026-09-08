import { addDays, format } from 'date-fns'
import { key, round2 } from './days.js'
import { WEEKLY_CHALLENGES } from './config.js'

export const weekStartOf = (d) => addDays(d, -((d.getDay() + 6) % 7))

const findChallenge = (label) => WEEKLY_CHALLENGES.find((c) => c.label === label)

/** Rebuilds the "Weekly Review" week rows from the derived day rows. */
export function buildWeeks({ settings, days, weekInputs, today }) {
  const todayK = key(today)
  const first = weekStartOf(days[0].date)
  const byKey = new Map(days.map((d) => [d.key, d]))
  const lastDate = days[days.length - 1].date

  const weeks = []
  let prev = null

  for (let i = 0; ; i++) {
    const start = addDays(first, i * 7)
    if (start > lastDate) break
    const end = addDays(start, 6)
    const startK = key(start)
    const endK = key(end)
    const input = weekInputs[startK] || {}

    const inWeek = []
    for (let j = 0; j < 7; j++) {
      const d = byKey.get(key(addDays(start, j)))
      if (d) inWeek.push(d)
    }
    const req = inWeek.filter((d) => d.required)
    const past = inWeek.filter((d) => d.key <= todayK)

    const targetHours = settings.weekdayTarget * settings.reqDays
    const actual = round2(req.reduce((a, d) => a + d.actual, 0))
    const weekendBonus = round2(inWeek.filter((d) => !d.required).reduce((a, d) => a + d.actual, 0))
    const requiredDays = req.length
    const showUpDays = req.filter((d) => d.win === 1).length
    const productiveDays = req.filter((d) => d.completion >= settings.prodThreshold).length
    const consistency = requiredDays ? showUpDays / requiredDays : 0

    // "Items" = study tasks and revisions together; both are planned work.
    const tasksPlanned = inWeek.reduce((a, d) => a + d.itemsPlanned, 0)
    const tasksCompleted = inWeek.reduce((a, d) => a + d.itemsCompleted, 0)
    const plannedToDate = past.reduce((a, d) => a + d.itemsPlanned, 0)
    const completedToDate = past.reduce((a, d) => a + d.itemsCompleted, 0)

    const cutoff = endK < todayK ? endK : todayK
    const deferredIds = new Set()
    for (const d of inWeek) {
      if (d.key > cutoff) continue
      for (const t of d.picked) if (t.status === 'Deferred') deferredIds.add(t.id)
    }
    const deferred = deferredIds.size
    const plannedTaskHours = round2(inWeek.reduce((a, d) => a + d.planned, 0))
    const availableHours = settings.weekdayTarget * settings.reqDays

    const future = startK > todayK
    const executionRate = plannedToDate === 0 ? null : Math.min(1, completedToDate / plannedToDate)

    const planSizeCheck =
      plannedTaskHours === 0
        ? '— no plan yet'
        : plannedTaskHours > availableHours * 1.05
          ? `⚠️ OVERPLANNED +${(plannedTaskHours - availableHours).toFixed(1)}h`
          : plannedTaskHours < availableHours * 0.5
            ? '🟡 LIGHT WEEK'
            : '🟢 REALISTIC PLAN'

    let planScore = null
    if (!future && !(plannedTaskHours === 0 && tasksPlanned === 0)) {
      const sizing =
        plannedTaskHours === 0
          ? 0.5
          : plannedTaskHours <= availableHours
            ? 0.6 + 0.4 * Math.min(1, plannedTaskHours / availableHours)
            : Math.max(0, 1 - (plannedTaskHours / availableHours - 1))
      const exec = plannedToDate === 0 ? 0.5 : Math.min(1, completedToDate / plannedToDate)
      const deferPenalty = plannedToDate === 0 ? 1 : Math.max(0, 1 - deferred / plannedToDate)
      planScore = Math.round((0.4 * sizing + 0.4 * exec + 0.2 * deferPenalty) * 1000) / 1000
    }
    const planQuality =
      planScore === null
        ? null
        : planScore >= 0.85
          ? '🟢 Excellent Plan'
          : planScore >= 0.7
            ? '🟢 Good Plan'
            : planScore >= 0.5
              ? '🟡 Aggressive Plan'
              : '🔴 Unrealistic Plan'

    const streakReached = future ? null : Math.max(0, ...inWeek.map((d) => d.streak ?? 0))
    const baseXP = req.reduce((a, d) => a + d.xp, 0)
    const bonusXP = inWeek.filter((d) => !d.required).reduce((a, d) => a + d.xp, 0)
    const weeklyGoalXP = !future && consistency >= settings.weeklyGoal ? settings.xpWeek : 0

    // The suggested challenge reacts to last week's behaviour, never to topics.
    const suggested = !prev
      ? WEEKLY_CHALLENGES[0].label
      : prev.showUpDays <= 2
        ? WEEKLY_CHALLENGES[1].label
        : prev.showUpDays <= 4
          ? WEEKLY_CHALLENGES[0].label
          : prev.actual < prev.targetHours * 0.8
            ? WEEKLY_CHALLENGES[3].label
            : WEEKLY_CHALLENGES[5].label
    const activeChallenge = input.challenge || suggested
    const ch = findChallenge(activeChallenge)
    const challengeTarget = ch ? ch.target : 0
    let challengeResult = null
    if (!future && ch) {
      if (ch.metric === 'SHOWUP') challengeResult = showUpDays
      else if (ch.metric === 'HOURS') challengeResult = actual
      else if (ch.metric === 'PRODUCTIVE') challengeResult = productiveDays
      else if (ch.metric === 'STREAK') challengeResult = streakReached ?? 0
      else if (ch.metric === 'NOOVERPLAN')
        challengeResult = plannedTaskHours > 0 && plannedTaskHours <= availableHours ? 1 : 0
      else challengeResult = 0
    }
    const challengeDone = !future && challengeTarget > 0 && (challengeResult ?? 0) >= challengeTarget
    const challengeXP = challengeDone ? settings.xpChallenge : 0
    const totalXP = baseXP + bonusXP + weeklyGoalXP + challengeXP

    // Today joins the denominator only once its win is banked.
    const reqSoFar =
      req.filter((d) => d.key < todayK).length + (req.some((d) => d.key === todayK && d.win === 1) ? 1 : 0)
    const consSoFar = reqSoFar === 0 ? null : showUpDays / reqSoFar

    let status = null
    if (!future) {
      if (endK < todayK) {
        status =
          consistency >= settings.weeklyGoal
            ? '🏆 WEEK COMPLETE'
            : consistency >= 0.6
              ? '🟡 Decent week'
              : '🔴 Tough week'
      } else if (reqSoFar === 0) {
        status = '⚪ Week just started'
      } else {
        status =
          consSoFar >= settings.weeklyGoal
            ? '🟢 ON TRACK'
            : consSoFar >= 0.6
              ? '🟡 In progress'
              : '🔴 Behind pace'
      }
    }

    let momentum = null
    if (!future) {
      if (endK >= todayK) momentum = '⏳ week in progress'
      else if (!prev) momentum = '➡️ STEADY'
      else if (showUpDays > prev.showUpDays) momentum = '📈 BUILDING'
      else if (showUpDays < prev.showUpDays) momentum = '📉 SLOWING'
      else momentum = '➡️ STEADY'
    }

    const consecGood = future ? 0 : consistency >= settings.weeklyGoal ? (prev?.consecGood ?? 0) + 1 : 0
    const peakGood = Math.max(prev?.peakGood ?? 0, consecGood)
    const comeback = Math.max(
      prev?.comeback ?? 0,
      !future && consistency >= settings.weeklyGoal && (prev?.showUpDays ?? 99) <= 1 ? 1 : 0
    )
    const consecRealistic = future
      ? 0
      : plannedTaskHours > 0 && plannedTaskHours <= availableHours
        ? (prev?.consecRealistic ?? 0) + 1
        : 0
    const peakRealistic = Math.max(prev?.peakRealistic ?? 0, consecRealistic)

    const row = {
      start, end, startKey: startK, endKey: endK, weekNo: i + 1, future,
      label: `${format(start, 'dd MMM')} – ${format(end, 'dd MMM')}`,
      targetHours, actual, weekendBonus, requiredDays, showUpDays, productiveDays, consistency,
      tasksPlanned, tasksCompleted, deferred, executionRate,
      plannedTaskHours, availableHours, planSizeCheck, planScore, planQuality,
      streakReached, baseXP, bonusXP, weeklyGoalXP,
      suggested, activeChallenge, challengeTarget, challengeResult, challengeDone, challengeXP,
      totalXP, status, momentum,
      consecGood, peakGood, comeback, consecRealistic, peakRealistic,
      reqSoFar, consSoFar,
      wentWell: input.wentWell || '',
      didntGo: input.didntGo || '',
      missReason: input.missReason || '',
      improve: input.improve || '',
      nextGoal: input.nextGoal || '',
      reviewComplete: input.reviewComplete === true,
      userChallenge: input.challenge || '',
    }
    weeks.push(row)
    prev = row
  }

  return weeks
}
