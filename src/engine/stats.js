import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { isoDow, key, parse, round2 } from './days.js'
import { LEVELS, STREAK_MILESTONES } from './config.js'
import { ACHIEVEMENTS } from './achievements.js'

const pct = (n, d) => (d > 0 ? n / d : 0)

function levelFor(totalXP) {
  let idx = 0
  for (let i = 0; i < LEVELS.length; i++) if (totalXP >= LEVELS[i].xp) idx = i
  const cur = LEVELS[idx]
  const next = LEVELS[idx + 1] ?? null
  const floor = cur.xp
  const nextXP = next ? next.xp : floor
  return {
    level: cur.level,
    title: cur.title,
    floor,
    nextXP,
    toNext: Math.max(0, nextXP - totalXP),
    progress: nextXP <= floor ? 1 : Math.max(0, Math.min(1, (totalXP - floor) / (nextXP - floor))),
  }
}

function windowConsistency(days, todayK, todayRequired, todayWin, from) {
  const inWin = days.filter((d) => d.key >= from && d.key <= todayK && d.required)
  const wins = inWin.filter((d) => d.win === 1).length
  const elapsed = inWin.filter((d) => d.key < todayK).length + (todayRequired ? todayWin : 0)
  return pct(wins, Math.max(1, elapsed))
}

export function buildStats({ settings, days, weeks, months, tasks, today }) {
  const todayK = key(today)
  const byKey = new Map(days.map((d) => [d.key, d]))
  const past = days.filter((d) => !d.future)
  const last = past[past.length - 1] ?? null

  const todayRow = byKey.get(todayK) ?? null
  const todayRequired = todayRow ? todayRow.required : isoDow(today) <= settings.reqDays
  const todayWin = todayRow ? todayRow.win : 0
  const todayHours = todayRow ? todayRow.actual : 0
  const todayTarget = todayRequired ? settings.weekdayTarget : settings.weekendRequired
  const todayRemaining = Math.max(0, todayTarget - todayHours)
  const todayProgress = Math.min(3, todayHours / settings.weekdayTarget)
  const todayXP = todayRow ? todayRow.xp : 0
  const todayProd = todayRow?.productivity ?? 0

  // ── totals ────────────────────────────────────────────────────────────────
  const totalHours = round2(past.reduce((a, d) => a + d.actual, 0))
  const totalDaysStudied = past.filter((d) => d.actual > 0).length
  const showUpDays = past.filter((d) => d.required && d.win === 1).length
  const reqElapsed = past.filter((d) => d.required && d.key < todayK).length + (todayRequired ? todayWin : 0)
  const showUpRate = pct(showUpDays, reqElapsed)
  const weekendDays = past.filter((d) => !d.required && d.actual > 0).length
  const smallWinDays = past.filter((d) => d.required && d.win === 1 && d.actual < 0.5).length
  const productiveDays = past.filter((d) => d.required && d.completion >= settings.prodThreshold).length

  // ── streak ────────────────────────────────────────────────────────────────
  const prevRow = todayRow ? byKey.get(key(addDays(today, -1))) : null
  const curStreak = todayRow
    ? todayWin === 1
      ? todayRow.streak ?? 0
      : prevRow?.streak ?? 0
    : last?.streak ?? 0
  const longestStreak = last ? last.peakStreak : 0
  const streakBroken = curStreak === 0 && showUpDays > 0

  const tokensEarned = Math.floor(showUpDays / settings.tokenDays)
  const tokensUsed = past.filter((d) => d.protectedByToken).length
  const tokensAvail = settings.tokensOn
    ? Math.max(0, Math.min(settings.maxTokens, tokensEarned - tokensUsed))
    : 0

  // ── XP ledger ─────────────────────────────────────────────────────────────
  const xpDaily = past.filter((d) => d.required).reduce((a, d) => a + d.xp, 0)
  const xpWeekend = past.filter((d) => !d.required).reduce((a, d) => a + d.xp, 0)
  const xpWeekTotal = weeks.reduce((a, w) => a + w.weeklyGoalXP, 0)
  const xpChallengeTotal = weeks.reduce((a, w) => a + w.challengeXP, 0)
  const xpMonthTotal = months.reduce((a, m) => a + m.monthlyXP, 0)

  // ── achievements ──────────────────────────────────────────────────────────
  const lastWeek = weeks.filter((w) => !w.future).slice(-1)[0] ?? null
  const ctx = {
    totalHours,
    showUpDays,
    longestStreak,
    weekendDays,
    smallWinDays,
    bestGoodWeekRun: lastWeek?.peakGood ?? 0,
    bestRealisticRun: lastWeek?.peakRealistic ?? 0,
    comebacks: lastWeek?.comeback ?? 0,
    reviewsDone: weeks.filter((w) => w.reviewComplete).length,
    bestMonthCons: Math.max(0, ...months.filter((m) => !m.future).map((m) => m.showUpRate)),
    phoenix: last?.phoenixEver ?? 0,
  }
  // Cumulative fields can be traced back to the exact day they crossed the line.
  const CUMULATIVE = { totalHours: 'cumHours', showUpDays: 'cumWins', longestStreak: 'peakStreak' }
  const achievements = ACHIEVEMENTS.map((a) => {
    const progress = ctx[a.field] ?? 0
    const unlocked = progress >= a.target
    let unlockedOn = null
    if (unlocked && CUMULATIVE[a.field]) {
      const col = CUMULATIVE[a.field]
      unlockedOn = past.find((d) => d[col] >= a.target)?.key ?? null
    }
    return { ...a, progress, unlocked, unlockedOn }
  })
  const xpAch = achievements.filter((a) => a.unlocked).reduce((s, a) => s + a.xp, 0)
  const achUnlocked = achievements.filter((a) => a.unlocked).length
  const nextAch = achievements.find((a) => !a.unlocked) ?? null

  const totalXP = xpDaily + xpWeekend + xpWeekTotal + xpChallengeTotal + xpMonthTotal + xpAch
  const lvl = levelFor(totalXP)
  const xpLast7 = past
    .filter((d) => d.key >= key(addDays(today, -6)))
    .reduce((a, d) => a + d.xp, 0)
  const levelUp = lvl.level > 1 && totalXP - xpLast7 < lvl.floor

  // ── consistency & momentum ────────────────────────────────────────────────
  const cons7 = windowConsistency(days, todayK, todayRequired, todayWin, key(addDays(today, -6)))
  const cons14 = windowConsistency(days, todayK, todayRequired, todayWin, key(addDays(today, -13)))
  const cons30 = windowConsistency(days, todayK, todayRequired, todayWin, key(addDays(today, -29)))

  const inRange = (d, from, to) => d.key >= from && d.key <= to
  const last7From = key(addDays(today, -6))
  const last7Wins = past.filter((d) => d.required && d.win === 1 && inRange(d, last7From, todayK)).length
  const last7Req = past.filter((d) => d.required && inRange(d, last7From, todayK)).length
  const prev7Wins = past.filter(
    (d) => d.required && d.win === 1 && inRange(d, key(addDays(today, -13)), key(addDays(today, -7)))
  ).length

  const momentum =
    totalHours === 0
      ? '🌱 START HERE'
      : last7Wins > prev7Wins
        ? '📈 BUILDING MOMENTUM'
        : last7Wins < prev7Wins
          ? '📉 LOSING MOMENTUM'
          : '➡️ STEADY'
  const momentumNote =
    totalHours === 0
      ? 'Nothing logged yet. One session starts everything.'
      : `You've studied on ${last7Wins} of the last ${last7Req} required days. ` +
        (last7Wins > prev7Wins
          ? 'That is more than the week before. Keep going.'
          : last7Wins < prev7Wins
            ? "Slightly fewer than the week before — don't redesign the plan, just win today."
            : 'Same as the week before. Steady is exactly the point.')

  // ── this week / recovery ──────────────────────────────────────────────────
  const thisWeek = weeks.find((w) => w.startKey <= todayK && w.endKey >= todayK) ?? null
  const missedThisWeek = thisWeek
    ? days.filter(
        (d) => d.required && d.win === 0 && d.key >= thisWeek.startKey && d.key < todayK
      ).length
    : 0
  const weekBehind = thisWeek
    ? Math.max(0, thisWeek.reqSoFar * settings.weekdayTarget - thisWeek.actual)
    : 0
  const reqDaysLeft = thisWeek
    ? days.filter((d) => d.required && d.key > todayK && d.key <= thisWeek.endKey).length
    : 0
  const recoveryOn = missedThisWeek >= 1 && weekBehind > settings.weekdayTarget

  const recovery = {
    on: recoveryOn,
    head: recoveryOn
      ? '🔄 RECOVERY MODE'
      : (thisWeek?.consistency ?? 0) >= settings.weeklyGoal
        ? '🟢 WEEK ON TRACK'
        : '🟢 KEEP GOING',
    line1: recoveryOn
      ? `You are ${weekBehind.toFixed(1)}h behind this week.`
      : `This week: ${thisWeek?.showUpDays ?? 0} of ${thisWeek?.requiredDays ?? 0} required days done.`,
    // The recommended target never inflates to "make up" lost hours.
    line2:
      reqDaysLeft === 0
        ? 'No required days left this week — next week starts clean.'
        : `Remaining required weekdays: ${reqDaysLeft}    Recommended daily target: ${settings.weekdayTarget.toFixed(1)}h`,
    line3: "Don't chase the lost hours. Protect the next study session.",
  }

  const nextMilestone = STREAK_MILESTONES.find((m) => m > curStreak) ?? null
  const nextMilestoneTxt = nextMilestone
    ? `${Math.max(0, nextMilestone - curStreak)} more study days → ${nextMilestone}-Day Streak`
    : '🏆 Every streak milestone unlocked'

  // ── countdown ─────────────────────────────────────────────────────────────
  const target = parse(settings.targetDate)
  const daysLeft = Math.max(0, differenceInCalendarDays(target, today))
  let weekdaysLeft = 0
  for (let i = 1; i <= daysLeft; i++) if (isoDow(addDays(today, i)) <= 5) weekdaysLeft++
  const hoursLeft = weekdaysLeft * settings.weekdayTarget

  // ── messages ──────────────────────────────────────────────────────────────
  const taskCount = tasks.length
  const emptyState =
    totalHours === 0 && taskCount === 0
      ? '👋 Welcome. Your task list is empty — add your first task in the Task Bank.'
      : totalHours === 0
        ? '👋 Welcome. Nothing logged yet — your only goal today is to show up.'
        : ''

  let dailyMsg
  if (totalHours === 0) dailyMsg = '🎯 Your only goal today: show up.'
  else if (todayProgress >= 1) dailyMsg = '🚀 Excellent day. Keep the momentum.'
  else if (todayWin === 1)
    dailyMsg =
      curStreak >= 14
        ? '⚡ This is becoming a routine.'
        : curStreak >= 7
          ? "🔥 You're building a habit."
          : "🔥 You showed up. That's the win."
  else if (todayHours > 0) dailyMsg = '🟡 You made progress. Finish your Minimum Win if you can.'
  else if (!todayRequired) dailyMsg = '🌤️ Weekend. Rest is allowed — anything today is a bonus.'
  else if (last7Wins < prev7Wins) dailyMsg = "💡 Don't redesign your entire plan. Just win today."
  else dailyMsg = '🌱 Reset. Tomorrow is a new opportunity — but today is still open.'

  const execRate = thisWeek?.executionRate ?? null
  const execNote =
    execRate === null
      ? 'Add a few tasks with planned dates to track your execution rate.'
      : execRate >= 0.8
        ? 'Your plan matches your reality. That is the goal.'
        : execRate >= 0.5
          ? 'Solid, but you are planning a little more than you execute.'
          : 'Your planning may be too ambitious — try planning fewer tasks, not working more hours.'

  return {
    today: {
      key: todayK,
      label: format(today, 'EEEE, dd MMM yyyy'),
      required: todayRequired,
      target: todayTarget,
      hours: todayHours,
      remaining: todayRemaining,
      progress: todayProgress,
      xp: todayXP,
      win: todayWin === 1,
      winLabel: todayWin === 1 ? '✅ ACHIEVED' : '🎯 NOT YET',
      productivity: todayProd,
      productivityLabel:
        todayProd >= 0.9 ? '🟢 Excellent'
        : todayProd >= 0.7 ? '🟡 Decent'
        : todayProd > 0 ? '🟠 Light day'
        : !todayRequired ? '🌤️ Optional day'
        : '⚪ Not started yet',
      status:
        todayWin === 1
          ? todayProgress >= 1 ? '🟢 COMPLETE' : '🟢 ON TRACK'
          : todayHours > 0 ? '🟡 IN PROGRESS'
          : todayRequired ? '⚪ NOT STARTED' : '🌤️ REST DAY (optional)',
    },
    level: { ...lvl, totalXP, xpLast7, levelUp },
    xp: { daily: xpDaily, weekend: xpWeekend, week: xpWeekTotal, challenge: xpChallengeTotal, month: xpMonthTotal, achievements: xpAch, total: totalXP },
    totals: { totalHours, totalDaysStudied, showUpDays, reqElapsed, showUpRate, weekendDays, productiveDays,
      avgPerReqDay: reqElapsed ? round2(totalHours / reqElapsed) : 0,
      avgWeekly: round2(totalHours / Math.max(1, weeks.filter((w) => w.startKey <= todayK).length)),
      tasksCompleted: tasks.filter((t) => t.status === 'Completed').length,
      tasksDeferred: tasks.filter((t) => t.status === 'Deferred').length },
    streak: { current: curStreak, longest: longestStreak, broken: streakBroken,
      recoveryMsg: streakBroken ? "Yesterday didn't go as planned.  Your next goal is simply: SHOW UP TODAY." : '',
      tokensEarned, tokensUsed, tokensAvail, nextMilestone, nextMilestoneTxt },
    consistency: { d7: cons7, d14: cons14, d30: cons30 },
    momentum: { label: momentum, note: momentumNote, last7Wins, last7Req, prev7Wins },
    thisWeek,
    recovery,
    countdown: { daysLeft, weekdaysLeft, weeksLeft: Math.floor(daysLeft / 7), hoursLeft },
    achievements, achUnlocked, nextAch,
    messages: {
      emptyState,
      dailyMsg,
      execNote,
      nextWin: todayWin === 1
        ? "🔥 BACK IN MOTION — today's win is banked."
        : `🎯 NEXT WIN: complete today's Minimum Win (${settings.minWin.toFixed(1)}h)`,
      showUpLine:
        totalHours === 0
          ? 'Your first show-up is one session away.'
          : reqElapsed === 0
            ? 'Nothing counted against you yet — today is still open.'
            : `You showed up ${showUpDays} times out of ${reqElapsed}.`,
    },
  }
}
