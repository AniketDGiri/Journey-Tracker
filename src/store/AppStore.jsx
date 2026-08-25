import { createContext, useContext, useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase'
import { defaultPhases, defaultStudyTasks, defaultLifeTasks } from '../utils/seedData'
import { uid } from '../utils/id'

const AppStoreContext = createContext(null)

function userDocRef(userId) {
  return doc(db, 'users', userId, 'appData', 'main')
}

// Immutably update the subtasks array of one task inside a task list
function patchSubtasks(tasks, taskId, updater) {
  return tasks.map((t) =>
    t.id !== taskId ? t : { ...t, subtasks: updater(t.subtasks || []) }
  )
}

export function AppStoreProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoaded, setDataLoaded]   = useState(false)

  const [phases, setPhases]                     = useState(defaultPhases)
  const [studyTasks, setStudyTasks]             = useState(defaultStudyTasks)
  const [studyCompletions, setStudyCompletions] = useState({})
  const [lifeTasks, setLifeTasks]               = useState(defaultLifeTasks)
  const [lifeCompletions, setLifeCompletions]   = useState({})
  const [scheduledTasks, setScheduledTasks]     = useState([])

  // ── Auth + initial data load ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const snap = await getDoc(userDocRef(u.uid))
          if (snap.exists()) {
            const d = snap.data()
            setPhases(d.phases                     ?? defaultPhases)
            setStudyTasks(d.studyTasks             ?? defaultStudyTasks)
            setStudyCompletions(d.studyCompletions ?? {})
            setLifeTasks(d.lifeTasks               ?? defaultLifeTasks)
            setLifeCompletions(d.lifeCompletions   ?? {})
            setScheduledTasks(d.scheduledTasks     ?? [])
          }
        } catch (err) {
          console.error('Firestore load error', err)
        }
        setDataLoaded(true)
      } else {
        setPhases(defaultPhases)
        setStudyTasks(defaultStudyTasks)
        setStudyCompletions({})
        setLifeTasks(defaultLifeTasks)
        setLifeCompletions({})
        setScheduledTasks([])
        setDataLoaded(false)
      }
      setAuthLoading(false)
    })
    return unsub
  }, [])

  // ── Debounced Firestore write on every state change ───────────────────────
  const debounceRef = useRef(null)
  useEffect(() => {
    if (!dataLoaded || !user) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDoc(userDocRef(user.uid), {
        phases, studyTasks, studyCompletions,
        lifeTasks, lifeCompletions, scheduledTasks,
      }).catch((err) => console.error('Firestore save error', err))
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [phases, studyTasks, studyCompletions, lifeTasks, lifeCompletions, scheduledTasks, user, dataLoaded])

  // ── Task mutation helpers ─────────────────────────────────────────────────
  const addTask = useCallback(
    (setter) => (task) => setter((prev) => [...prev, { id: uid(), ...task }]),
    []
  )

  const removeTask = useCallback(
    (setter, completionSetter) => (taskId) => {
      setter((prev) => prev.filter((t) => t.id !== taskId))
      completionSetter((prev) => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
    },
    []
  )

  const toggleCompletion = useCallback(
    (setter) => (taskId, periodKey) => {
      setter((prev) => {
        const taskMap = { ...(prev[taskId] || {}) }
        taskMap[periodKey] = !taskMap[periodKey]
        return { ...prev, [taskId]: taskMap }
      })
    },
    []
  )

  // ── Scheduled task mutations ──────────────────────────────────────────────
  const addScheduledTask = useCallback(
    (task) => setScheduledTasks((prev) => [...prev, { id: uid(), done: false, ...task }]),
    [setScheduledTasks]
  )
  const removeScheduledTask = useCallback(
    (taskId) => setScheduledTasks((prev) => prev.filter((t) => t.id !== taskId)),
    [setScheduledTasks]
  )
  const toggleScheduledTask = useCallback(
    (taskId) => setScheduledTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    ),
    [setScheduledTasks]
  )

  // ── Subtask mutations ─────────────────────────────────────────────────────
  const addStudySubtask = useCallback(
    (taskId, title) => setStudyTasks((p) => patchSubtasks(p, taskId, (s) => [...s, { id: uid(), title, done: false }])),
    [setStudyTasks]
  )
  const toggleStudySubtask = useCallback(
    (taskId, subId) => setStudyTasks((p) => patchSubtasks(p, taskId, (s) => s.map((x) => x.id === subId ? { ...x, done: !x.done } : x))),
    [setStudyTasks]
  )
  const removeStudySubtask = useCallback(
    (taskId, subId) => setStudyTasks((p) => patchSubtasks(p, taskId, (s) => s.filter((x) => x.id !== subId))),
    [setStudyTasks]
  )

  const addLifeSubtask = useCallback(
    (taskId, title) => setLifeTasks((p) => patchSubtasks(p, taskId, (s) => [...s, { id: uid(), title, done: false }])),
    [setLifeTasks]
  )
  const toggleLifeSubtask = useCallback(
    (taskId, subId) => setLifeTasks((p) => patchSubtasks(p, taskId, (s) => s.map((x) => x.id === subId ? { ...x, done: !x.done } : x))),
    [setLifeTasks]
  )
  const removeLifeSubtask = useCallback(
    (taskId, subId) => setLifeTasks((p) => patchSubtasks(p, taskId, (s) => s.filter((x) => x.id !== subId))),
    [setLifeTasks]
  )

  const addScheduledSubtask = useCallback(
    (taskId, title) => setScheduledTasks((p) => patchSubtasks(p, taskId, (s) => [...s, { id: uid(), title, done: false }])),
    [setScheduledTasks]
  )
  const toggleScheduledSubtask = useCallback(
    (taskId, subId) => setScheduledTasks((p) => patchSubtasks(p, taskId, (s) => s.map((x) => x.id === subId ? { ...x, done: !x.done } : x))),
    [setScheduledTasks]
  )
  const removeScheduledSubtask = useCallback(
    (taskId, subId) => setScheduledTasks((p) => patchSubtasks(p, taskId, (s) => s.filter((x) => x.id !== subId))),
    [setScheduledTasks]
  )

  // ── Auth helpers ──────────────────────────────────────────────────────────
  const signIn  = useCallback(() => signInWithPopup(auth, googleProvider), [])
  const signOut = useCallback(() => firebaseSignOut(auth), [])

  const value = useMemo(
    () => ({
      user, authLoading, signIn, signOut,

      phases, setPhases,
      studyTasks,
      addStudyTask:          addTask(setStudyTasks),
      removeStudyTask:       removeTask(setStudyTasks, setStudyCompletions),
      studyCompletions,
      toggleStudyCompletion: toggleCompletion(setStudyCompletions),
      addStudySubtask, toggleStudySubtask, removeStudySubtask,

      lifeTasks,
      addLifeTask:          addTask(setLifeTasks),
      removeLifeTask:       removeTask(setLifeTasks, setLifeCompletions),
      lifeCompletions,
      toggleLifeCompletion: toggleCompletion(setLifeCompletions),
      addLifeSubtask, toggleLifeSubtask, removeLifeSubtask,

      scheduledTasks,
      addScheduledTask,
      removeScheduledTask,
      toggleScheduledTask,
      addScheduledSubtask, toggleScheduledSubtask, removeScheduledSubtask,

      exportData: () => ({
        phases, studyTasks, studyCompletions,
        lifeTasks, lifeCompletions, scheduledTasks,
        exportedAt: new Date().toISOString(),
      }),
      importData: (data) => {
        if (!data) return
        if (data.phases)           setPhases(data.phases)
        if (data.studyTasks)       setStudyTasks(data.studyTasks)
        if (data.studyCompletions) setStudyCompletions(data.studyCompletions)
        if (data.lifeTasks)        setLifeTasks(data.lifeTasks)
        if (data.lifeCompletions)  setLifeCompletions(data.lifeCompletions)
        if (data.scheduledTasks)   setScheduledTasks(data.scheduledTasks)
      },
    }),
    [
      user, authLoading, signIn, signOut,
      phases, studyTasks, studyCompletions,
      lifeTasks, lifeCompletions,
      scheduledTasks,
      addScheduledTask, removeScheduledTask, toggleScheduledTask,
      addStudySubtask, toggleStudySubtask, removeStudySubtask,
      addLifeSubtask, toggleLifeSubtask, removeLifeSubtask,
      addScheduledSubtask, toggleScheduledSubtask, removeScheduledSubtask,
    ]
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
