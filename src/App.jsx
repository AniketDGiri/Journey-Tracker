import { useState } from 'react'
import { AppStoreProvider, useAppStore } from './store/AppStore'
import AuthGate from './components/Auth/AuthGate'
import Dashboard from './components/Dashboard/Dashboard'
import Planner from './components/Planner/Planner'
import TaskBank from './components/TaskBank/TaskBank'
import StudyLog from './components/StudyLog/StudyLog'
import WeeklyReview from './components/Weekly/WeeklyReview'
import MonthlyGoals from './components/Monthly/MonthlyGoals'
import Revision from './components/Revision/Revision'
import Progress from './components/Progress/Progress'
import Achievements from './components/Achievements/Achievements'
import Settings from './components/Settings/Settings'
import Personal from './components/Personal/Personal'
import ExportImport from './components/common/ExportImport'
import { useLocalStorage } from './hooks/useLocalStorage'
import './App.css'

const TABS = [
  { id: 'dashboard', label: '🏠 Dashboard', Component: Dashboard },
  { id: 'planner', label: '📅 Planner', Component: Planner },
  { id: 'tasks', label: '✅ Task Bank', Component: TaskBank },
  { id: 'log', label: '⏱️ Study Log', Component: StudyLog },
  { id: 'weekly', label: '📊 Weekly', Component: WeeklyReview },
  { id: 'monthly', label: '🗓️ Monthly', Component: MonthlyGoals },
  { id: 'revision', label: '🔄 Revision', Component: Revision },
  { id: 'progress', label: '📈 Progress', Component: Progress },
  { id: 'achievements', label: '🏆 Achievements', Component: Achievements },
  { id: 'settings', label: '⚙️ Settings', Component: Settings },
]

const WORKSPACES = [
  { id: 'study', label: '🎯 System Design' },
  { id: 'personal', label: '🏠 Personal' },
]

function AppInner() {
  const [workspace, setWorkspace] = useState('study')
  const [tab, setTab] = useState('dashboard')
  const [theme, setTheme] = useLocalStorage('jt.theme', 'light')
  const { user, signOut, stats } = useAppStore()
  const Active = TABS.find((t) => t.id === tab).Component
  const isStudy = workspace === 'study'

  return (
    <div className="app" data-theme={theme}>
      <header className="app-header">
        <div className="app-title">
          <span className="app-logo">🧭</span>
          <span>Journey Tracker</span>
        </div>
        <div className="workspace-switch">
          {WORKSPACES.map((w) => (
            <button
              key={w.id}
              className={`workspace-btn ${workspace === w.id ? 'active' : ''}`}
              onClick={() => setWorkspace(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>
        {isStudy && (
          <nav className="tab-nav">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
        <div className="header-actions">
          {isStudy && (
            <span className="header-level" title={`${stats.level.totalXP.toLocaleString()} XP`}>
              L{stats.level.level} · 🔥{stats.streak.current}
            </span>
          )}
          <ExportImport />
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {user && (
            <div className="user-menu">
              {user.photoURL && (
                <img src={user.photoURL} alt={user.displayName ?? 'User'} className="user-avatar" title={user.displayName ?? user.email} />
              )}
              <button className="icon-btn" onClick={signOut} title="Sign out">↩</button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">{isStudy ? <Active /> : <Personal />}</main>

      <footer className="app-footer">
        {isStudy
          ? 'Consistency beats intensity. A single huge day is capped; a chain of ordinary days is not.'
          : 'Life outside the study plan still needs a list.'}
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AppStoreProvider>
      <AuthGate>
        <AppInner />
      </AuthGate>
    </AppStoreProvider>
  )
}
