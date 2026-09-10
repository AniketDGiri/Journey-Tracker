import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase'
import { uid } from '../utils/id'
import { DEFAULT_SETTINGS } from '../engine/config'
import { buildDays, key } from '../engine/days'
import { buildWeeks } from '../engine/weeks'
import { buildMonths, decorateGoals } from '../engine/months'
import { decorateRevisions } from '../engine/revision'
import { buildStats } from '../engine/stats'
import { DEFAULT_TIME_CONFIG } from '../utils/timeBlocks'

const AppStoreContext = createContext(null)

export const DEFAULT_CATEGORIES = ['Office', 'Personal', 'Project', 'Health', 'Finance', 'Home', 'Errands']

export const DEFAULT_SECTIONS = [
  { id: 'todo', name: 'To do' },
  { id: 'inprogress', name: 'In progress' },
  { id: 'done', name: 'Done' },
]

const EMPTY = {
  settings: DEFAULT_SETTINGS,
  personalTasks: [],
  personalSections: DEFAULT_SECTIONS,
  personalCategories: DEFAULT_CATEGORIES,
  projects: [],
  timeLog: {},
  timeConfig: DEFAULT_TIME_CONFIG,
  tasks: [],
  sessions: [],
  dayInputs: {},
  weekInputs: {},
  monthInputs: {},
  goals: [],
  revisions: [],
}

const userDocRef = (userId) => doc(db, 'users', userId, 'appData', 'main')

// Ticks over at midnight so the whole dashboard rolls onto the new day on its own.
function useToday() {
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => {
      setToday((prev) => (key(prev) === key(new Date()) ? prev : new Date()))
    }, 60_000)
    return () => clearInterval(id)
  }, [])
  return today
}

export function AppStoreProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [data, setData] = useState(EMPTY)
  const today = useToday()

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const snap = await getDoc(userDocRef(u.uid))
          const d = snap.exists() ? snap.data() : {}
          setData({
            settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
            personalTasks: d.personalTasks ?? [],
            personalSections: d.personalSections ?? DEFAULT_SECTIONS,
            personalCategories: d.personalCategories ?? DEFAULT_CATEGORIES,
            projects: d.projects ?? [],
            timeLog: d.timeLog ?? {},
            timeConfig: { ...DEFAULT_TIME_CONFIG, ...(d.timeConfig ?? {}) },
            tasks: d.tasks ?? [],
            sessions: d.sessions ?? [],
            dayInputs: d.dayInputs ?? {},
            weekInputs: d.weekInputs ?? {},
            monthInputs: d.monthInputs ?? {},
            goals: d.goals ?? [],
            revisions: d.revisions ?? [],
          })
        } catch (err) {
          console.error('Firestore load error', err)
        }
        setDataLoaded(true)
      } else {
        setData(EMPTY)
        setDataLoaded(false)
      }
      setAuthLoading(false)
    })
  }, [])

  const debounceRef = useRef(null)
  useEffect(() => {
    if (!dataLoaded || !user) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDoc(userDocRef(user.uid), data).catch((err) => console.error('Firestore save error', err))
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [data, user, dataLoaded])

  // ── derived model ─────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const { settings, tasks, sessions, dayInputs, weekInputs, monthInputs, goals, revisions } = data
    const decoratedRevisions = decorateRevisions(revisions, today)
    const days = buildDays({ settings, sessions, tasks, revisions: decoratedRevisions, dayInputs, today })
    const weeks = buildWeeks({ settings, days, weekInputs, today })
    const months = buildMonths({ settings, days, monthInputs, achievements: [], today })
    const stats = buildStats({ settings, days, weeks, months, tasks, today })
    // Achievement unlock dates feed the monthly "achievements unlocked" count.
    const monthsWithAch = buildMonths({
      settings, days, monthInputs, achievements: stats.achievements, today,
    })
    return {
      days, weeks, months: monthsWithAch, stats,
      goals: decorateGoals(goals),
      revisions: decoratedRevisions,
    }
  }, [data, today])

  // ── mutations ─────────────────────────────────────────────────────────────
  const patch = useCallback((fields) => setData((p) => ({ ...p, ...fields })), [])

  const listOps = useCallback(
    (name) => ({
      add: (item) => setData((p) => ({ ...p, [name]: [...p[name], { id: uid(), ...item }] })),
      update: (id, fields) =>
        setData((p) => ({ ...p, [name]: p[name].map((x) => (x.id === id ? { ...x, ...fields } : x)) })),
      remove: (id) => setData((p) => ({ ...p, [name]: p[name].filter((x) => x.id !== id) })),
    }),
    []
  )

  const mapOps = useCallback(
    (name) => ({
      set: (k, fields) =>
        setData((p) => ({ ...p, [name]: { ...p[name], [k]: { ...(p[name][k] ?? {}), ...fields } } })),
    }),
    []
  )

  // ── day ↔ task assignment ─────────────────────────────────────────────────
  const mergeDay = (p, dayKey, fields) => ({
    ...p,
    dayInputs: { ...p.dayInputs, [dayKey]: { ...(p.dayInputs[dayKey] ?? {}), ...fields } },
  })

  const pickTask = useCallback(
    (dayKey, taskId) =>
      setData((p) => {
        const ids = p.dayInputs[dayKey]?.taskIds ?? []
        return ids.includes(taskId) ? p : mergeDay(p, dayKey, { taskIds: [...ids, taskId] })
      }),
    []
  )

  const unpickTask = useCallback(
    (dayKey, taskId) =>
      setData((p) => {
        const day = p.dayInputs[dayKey] ?? {}
        return mergeDay(p, dayKey, {
          taskIds: (day.taskIds ?? []).filter((x) => x !== taskId),
          doneIds: (day.doneIds ?? []).filter((x) => x !== taskId),
        })
      }),
    []
  )

  // Ticking a task off finishes it in the Task Bank too — leave it unticked and
  // pick it again tomorrow if it rolls over.
  const setTaskDone = useCallback(
    (dayKey, taskId, done) =>
      setData((p) => {
        const doneIds = (p.dayInputs[dayKey]?.doneIds ?? []).filter((x) => x !== taskId)
        if (done) doneIds.push(taskId)
        return {
          ...mergeDay(p, dayKey, { doneIds }),
          tasks: p.tasks.map((t) =>
            t.id !== taskId
              ? t
              : { ...t, status: done ? 'Completed' : 'In Progress', completedDate: done ? dayKey : '' }
          ),
        }
      }),
    []
  )

  const pickRevision = useCallback(
    (dayKey, revId) =>
      setData((p) => {
        const ids = p.dayInputs[dayKey]?.revisionIds ?? []
        return ids.includes(revId) ? p : mergeDay(p, dayKey, { revisionIds: [...ids, revId] })
      }),
    []
  )

  const unpickRevision = useCallback(
    (dayKey, revId) =>
      setData((p) => {
        const day = p.dayInputs[dayKey] ?? {}
        return mergeDay(p, dayKey, {
          revisionIds: (day.revisionIds ?? []).filter((x) => x !== revId),
          revisionDoneIds: (day.revisionDoneIds ?? []).filter((x) => x !== revId),
        })
      }),
    []
  )

  // Ticking a revision advances that topic's next pending review; unticking rolls
  // the most recent one back.
  const setRevisionDone = useCallback(
    (dayKey, revId, done) =>
      setData((p) => {
        const revisionDoneIds = (p.dayInputs[dayKey]?.revisionDoneIds ?? []).filter((x) => x !== revId)
        if (done) revisionDoneIds.push(revId)
        return {
          ...mergeDay(p, dayKey, { revisionDoneIds }),
          revisions: p.revisions.map((r) => {
            if (r.id !== revId) return r
            const flags = [r.r1Done === true, r.r2Done === true, r.r3Done === true]
            const i = done ? flags.indexOf(false) : flags.lastIndexOf(true)
            if (i === -1) return r
            return { ...r, [`r${i + 1}Done`]: done }
          }),
        }
      }),
    []
  )

  const value = useMemo(() => {
    const tasks = listOps('tasks')
    const sessions = listOps('sessions')
    const goals = listOps('goals')
    const revisions = listOps('revisions')
    const personal = listOps('personalTasks')
    const projects = listOps('projects')
    return {
      user, authLoading, today,
      signIn: () => signInWithPopup(auth, googleProvider),
      signOut: () => firebaseSignOut(auth),

      settings: data.settings,
      updateSettings: (fields) => patch({ settings: { ...data.settings, ...fields } }),
      resetSettings: () => patch({ settings: DEFAULT_SETTINGS }),

      tasks: data.tasks,
      addTask: tasks.add, updateTask: tasks.update, removeTask: tasks.remove,

      sessions: data.sessions,
      addSession: sessions.add, updateSession: sessions.update, removeSession: sessions.remove,

      personalTasks: data.personalTasks,
      addPersonalTask: personal.add,
      updatePersonalTask: personal.update,
      removePersonalTask: personal.remove,
      projects: data.projects,
      addProject: projects.add,
      updateProject: projects.update,
      // Deleting a project releases its tasks rather than destroying them.
      removeProject: (id) =>
        patch({
          projects: data.projects.filter((x) => x.id !== id),
          personalTasks: data.personalTasks.map((t) =>
            t.projectId === id ? { ...t, projectId: null } : t
          ),
        }),

      personalCategories: data.personalCategories,
      addPersonalCategory: (name) =>
        setData((p) =>
          p.personalCategories.includes(name)
            ? p
            : { ...p, personalCategories: [...p.personalCategories, name] }
        ),
      removePersonalCategory: (name) =>
        patch({ personalCategories: data.personalCategories.filter((c) => c !== name) }),

      personalSections: data.personalSections,
      addPersonalSection: (name) =>
        patch({ personalSections: [...data.personalSections, { id: uid(), name }] }),
      renamePersonalSection: (id, name) =>
        patch({
          personalSections: data.personalSections.map((x) => (x.id === id ? { ...x, name } : x)),
        }),
      removePersonalSection: (id) =>
        patch({
          personalSections: data.personalSections.filter((x) => x.id !== id),
          personalTasks: data.personalTasks.filter((t) => t.section !== id),
        }),

      timeLog: data.timeLog,
      timeConfig: data.timeConfig,
      setTimeSlot: (dateKey, slot, fields) =>
        setData((p) => {
          const day = p.timeLog[dateKey] ?? { slots: {}, happy: '' }
          return {
            ...p,
            timeLog: {
              ...p.timeLog,
              [dateKey]: {
                ...day,
                slots: { ...day.slots, [slot]: { ...(day.slots?.[slot] ?? {}), ...fields } },
              },
            },
          }
        }),
      setTimeDay: (dateKey, fields) =>
        setData((p) => ({
          ...p,
          timeLog: {
            ...p.timeLog,
            [dateKey]: { slots: {}, happy: '', ...(p.timeLog[dateKey] ?? {}), ...fields },
          },
        })),
      updateTimeConfig: (fields) => patch({ timeConfig: { ...data.timeConfig, ...fields } }),

      rawGoals: data.goals,
      addGoal: goals.add, updateGoal: goals.update, removeGoal: goals.remove,

      rawRevisions: data.revisions,
      addRevision: revisions.add, updateRevision: revisions.update, removeRevision: revisions.remove,

      setDayInput: mapOps('dayInputs').set,
      pickTask, unpickTask, setTaskDone,
      pickRevision, unpickRevision, setRevisionDone,
      setWeekInput: mapOps('weekInputs').set,
      setMonthInput: mapOps('monthInputs').set,

      ...derived,

      exportData: () => ({ ...data, exportedAt: new Date().toISOString() }),
      importData: (incoming) => {
        if (!incoming) return
        setData({
          settings: { ...DEFAULT_SETTINGS, ...(incoming.settings ?? {}) },
          personalTasks: incoming.personalTasks ?? [],
          personalSections: incoming.personalSections ?? DEFAULT_SECTIONS,
          personalCategories: incoming.personalCategories ?? DEFAULT_CATEGORIES,
          projects: incoming.projects ?? [],
          timeLog: incoming.timeLog ?? {},
          timeConfig: { ...DEFAULT_TIME_CONFIG, ...(incoming.timeConfig ?? {}) },
          tasks: incoming.tasks ?? [],
          sessions: incoming.sessions ?? [],
          dayInputs: incoming.dayInputs ?? {},
          weekInputs: incoming.weekInputs ?? {},
          monthInputs: incoming.monthInputs ?? {},
          goals: incoming.goals ?? [],
          revisions: incoming.revisions ?? [],
        })
      },
    }
  }, [user, authLoading, today, data, derived, patch, listOps, mapOps, pickTask, unpickTask, setTaskDone, pickRevision, unpickRevision, setRevisionDone])

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
