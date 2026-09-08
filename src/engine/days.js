import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export const key = (d) => format(d, 'yyyy-MM-dd')
export const parse = (s) => parseISO(s)
// ISO weekday: Mon = 1 … Sun = 7
export const isoDow = (d) => ((d.getDay() + 6) % 7) + 1

export function dayRange(settings, today) {
  const start = parse(settings.startDate)
  const target = parse(settings.targetDate)
  const last = addDays(target, 34)
  const minLast = addDays(today, 28)
  const end = last > minLast ? last : minLast
  const n = differenceInCalendarDays(end, start) + 1
  return Array.from({ length: n }, (_, i) => addDays(start, i))
}

function sumBy(list, fn) {
  return list.reduce((a, x) => a + (fn(x) || 0), 0)
}

/**
 * Rebuilds the "📅 Daily Planner" sheet: one derived row per calendar day.
 * The streak, miss-run and phoenix columns are recurrences, so this must stay
 * a single ordered pass.
 */
export function buildDays({ settings, sessions, tasks, revisions = [], dayInputs, today }) {
  const todayK = key(today)

  const sessionsByDate = new Map()
  for (const s of sessions) {
    if (!s.date) continue
    if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, [])
    sessionsByDate.get(s.date).push(s)
  }
  const taskById = new Map(tasks.map((t) => [t.id, t]))
  const revisionById = new Map(revisions.map((r) => [r.id, r]))

  const rows = []
  let prevStreak = 0
  let cumHours = 0
  let cumWins = 0
  let peakStreak = 0
  let missRun = 0
  let maxMissRun = 0
  let phoenixEver = 0
  let tokensUsed = 0

  for (const date of dayRange(settings, today)) {
    const k = key(date)
    const input = dayInputs[k] || {}
    const future = k > todayK
    const required = isoDow(date) <= settings.reqDays
    const target = required ? settings.weekdayTarget : settings.weekendRequired

    const daySessions = sessionsByDate.get(k) || []
    // Each day owns its own picked list, so pulling a task forward never rewrites
    // the fact that an earlier day had planned it.
    const doneIds = new Set(input.doneIds || [])
    const picked = (input.taskIds || []).map((id) => taskById.get(id)).filter(Boolean)
    const revisionDoneIds = new Set(input.revisionDoneIds || [])
    const pickedRevisions = (input.revisionIds || []).map((id) => revisionById.get(id)).filter(Boolean)

    const actual = future ? 0 : round2(sumBy(daySessions, (s) => s.duration))
    const tasksPlanned = picked.length
    const tasksCompleted = picked.filter((t) => doneIds.has(t.id)).length
    const revisionsPlanned = pickedRevisions.length
    const revisionsDone = pickedRevisions.filter((r) => revisionDoneIds.has(r.id)).length

    // Tasks and revisions are both planned work, so they share one set of totals.
    const planned = round2(
      sumBy(picked, (t) => t.estHours) + sumBy(pickedRevisions, (r) => r.estHours)
    )
    const itemsPlanned = tasksPlanned + revisionsPlanned
    const itemsCompleted = tasksCompleted + revisionsDone

    const mainTaskDone = input.mainTaskDone === true
    const win = future ? 0 : actual >= settings.minWin || mainTaskDone ? 1 : 0
    // Completion % is always measured against the weekday target, weekends included.
    const completion = future ? null : actual / settings.weekdayTarget
    const remaining = future ? null : Math.max(0, target - actual)

    let xp = 0
    if (!future) {
      if (required) {
        xp = Math.round(
          Math.min(
            settings.xpCap,
            actual * settings.xpHour +
              (win ? settings.xpWin : 0) +
              (completion >= settings.prodThreshold ? settings.xpProd : 0) +
              (completion >= 1 ? settings.xpPerfect : 0)
          )
        )
      } else if (actual > 0) {
        xp = Math.round(Math.min(settings.xpCapWknd, settings.xpWeekend + actual * settings.xpHour))
      }
    }

    let productivity = null
    if (!future && !(!required && actual === 0)) {
      const focusVals = daySessions.map((s) => Number(s.focus)).filter((n) => n > 0)
      const focusTerm = focusVals.length
        ? sumBy(focusVals, (n) => n) / focusVals.length / 5
        : actual > 0
          ? 0.8
          : 0
      const taskTerm = itemsPlanned === 0 ? (actual > 0 ? 1 : 0) : Math.min(1, itemsCompleted / itemsPlanned)
      productivity =
        Math.round(
          (0.4 * Math.min(1, actual / settings.weekdayTarget) +
            0.2 * win +
            0.2 * (mainTaskDone ? 1 : 0) +
            0.1 * focusTerm +
            0.1 * taskTerm) *
            1000
        ) / 1000
    }

    // ── recurrences ────────────────────────────────────────────────────────
    let streak
    let protectedByToken = false
    if (future) {
      streak = null
    } else if (!required) {
      streak = prevStreak
    } else if (win) {
      streak = prevStreak + 1
    } else if (
      settings.tokensOn &&
      input.protect === true &&
      tokensUsed + 1 <= Math.min(settings.maxTokens, Math.floor(cumWins / settings.tokenDays))
    ) {
      tokensUsed += 1
      protectedByToken = true
      streak = prevStreak
    } else {
      streak = 0
    }

    cumHours = round2(cumHours + actual)
    if (required && win) cumWins += 1
    if (streak !== null) peakStreak = Math.max(peakStreak, streak)
    if (!future && required) missRun = win ? 0 : missRun + 1
    maxMissRun = Math.max(maxMissRun, missRun)
    const phoenix = streak !== null && streak >= 3 && maxMissRun >= 5 ? 1 : 0
    phoenixEver = Math.max(phoenixEver, phoenix)

    rows.push({
      date, key: k, dow: format(date, 'EEE'), future, required, target,
      planned, actual, remaining, completion,
      mainTask: input.mainTask || '', mainTaskDone, notes: input.notes || '',
      tasksPlanned, tasksCompleted, revisionsPlanned, revisionsDone,
      itemsPlanned, itemsCompleted, productivity, xp, win,
      picked, doneIds, pickedRevisions, revisionDoneIds,
      protect: input.protect === true, protectedByToken,
      streak, cumHours, cumWins, peakStreak, missRun, maxMissRun, phoenixEver,
      minWinLabel: future
        ? ''
        : win
          ? '✅ WIN'
          : k === todayK
            ? '🎯 NOT YET'
            : required
              ? '⭕ Missed'
              : '· Rest',
      status: future
        ? '⬜'
        : !required
          ? actual > 0 ? '🟩' : '▫'
          : actual === 0
            ? '🟥'
            : completion >= 1
              ? '🔥'
              : completion >= settings.prodThreshold
                ? '🟩'
                : '🟨',
    })

    if (streak !== null) prevStreak = streak
  }

  return rows
}

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100
