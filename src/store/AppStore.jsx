import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { auth, db, googleProvider } from '../firebase'
import { uid } from '../utils/id'
import { DEFAULT_TIME_CONFIG } from '../utils/timeBlocks'
import { migrateTask } from '../utils/taskDates'

/**
 * Auth plus the Personal and Time workspaces. Study data lives in the Ascend
 * store (src/study), in its own Firestore document.
 */

const AppStoreContext = createContext(null)

export const DEFAULT_CATEGORIES = ['Office', 'Personal', 'Project', 'Health', 'Finance', 'Home', 'Errands']

export const DEFAULT_SECTIONS = [
  { id: 'todo', name: 'To do' },
  { id: 'inprogress', name: 'In progress' },
  { id: 'done', name: 'Done' },
]

const EMPTY = {
  personalTasks: [],
  personalSections: DEFAULT_SECTIONS,
  personalCategories: DEFAULT_CATEGORIES,
  projects: [],
  timeLog: {},
  timeConfig: DEFAULT_TIME_CONFIG,
}

// Only these fields are written. Anything else in the document (the retired
// study tracker's data) is left exactly as it is rather than wiped.
const FIELDS = Object.keys(EMPTY)

const fromDoc = (d) => ({
  personalTasks: (d.personalTasks ?? []).map(migrateTask),
  personalSections: d.personalSections ?? DEFAULT_SECTIONS,
  personalCategories: d.personalCategories ?? DEFAULT_CATEGORIES,
  projects: d.projects ?? [],
  timeLog: d.timeLog ?? {},
  timeConfig: { ...DEFAULT_TIME_CONFIG, ...(d.timeConfig ?? {}) },
})

/**
 * Days won in the retired study tracker, read-only. Its rule: a day was won by
 * logging at least the minimum hours (1h unless changed) or ticking that day's
 * Main Task.
 */
export function legacyWonDays(d, todayKey) {
  const minWin = Number(d.settings?.minWin) || 1
  const hours = new Map()
  for (const s of d.sessions ?? []) {
    if (s?.date) hours.set(s.date, (hours.get(s.date) ?? 0) + (Number(s.duration) || 0))
  }
  const won = new Set()
  for (const [date, h] of hours) if (h >= minWin) won.add(date)
  for (const [date, input] of Object.entries(d.dayInputs ?? {})) if (input?.mainTaskDone === true) won.add(date)
  return [...won].filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && k <= todayKey).sort()
}

const userDocRef = (userId) => doc(db, 'users', userId, 'appData', 'main')
const dayKey = (d) => format(d, 'yyyy-MM-dd')

// Ticks over at midnight so every view rolls onto the new day on its own.
function useToday() {
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => {
      setToday((prev) => (dayKey(prev) === dayKey(new Date()) ? prev : new Date()))
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
  // Not part of `data`, so it is never written back.
  const [legacyDays, setLegacyDays] = useState([])
  const today = useToday()

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const snap = await getDoc(userDocRef(u.uid))
          const d = snap.exists() ? snap.data() : {}
          setData(fromDoc(d))
          setLegacyDays(legacyWonDays(d, dayKey(new Date())))
        } catch (err) {
          console.error('Firestore load error', err)
        }
        setDataLoaded(true)
      } else {
        setData(EMPTY)
        setLegacyDays([])
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
      setDoc(userDocRef(user.uid), data, { mergeFields: FIELDS }).catch((err) =>
        console.error('Firestore save error', err)
      )
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [data, user, dataLoaded])

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

  const value = useMemo(() => {
    const personal = listOps('personalTasks')
    const projects = listOps('projects')
    return {
      user, authLoading, today, dataLoaded,
      todayKey: dayKey(today),
      legacyWonDays: legacyDays,
      signIn: () => signInWithPopup(auth, googleProvider),
      signOut: () => firebaseSignOut(auth),

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

      exportData: () => ({ ...data, exportedAt: new Date().toISOString() }),
      // Older backups also carry the retired study fields; only Personal/Time are read.
      importData: (incoming) => {
        if (!incoming) return
        setData(fromDoc(incoming))
      },
    }
  }, [user, authLoading, today, dataLoaded, data, legacyDays, patch, listOps])

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
