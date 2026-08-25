import { useState } from 'react'
import { AppStoreProvider, useAppStore } from './store/AppStore'
import AuthGate from './components/Auth/AuthGate'
import StudyPlan from './components/StudyPlan/StudyPlan'
import LifeTasks from './components/LifeTasks/LifeTasks'
import Schedule from './components/Schedule/Schedule'
import Dashboard from './components/Dashboard/Dashboard'
import ExportImport from './components/common/ExportImport'
import { useLocalStorage } from './hooks/useLocalStorage'
import './App.css'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'study',     label: 'Study Plan' },
  { id: 'life',      label: 'Life Tasks' },
  { id: 'schedule',  label: 'Schedule' },
]

function AppInner() {
  const [tab, setTab]     = useState('dashboard')
  const [theme, setTheme] = useLocalStorage('jt.theme', 'light')
  const { user, signOut } = useAppStore()

  return (
    <div className="app" data-theme={theme}>
      <header className="app-header">
        <div className="app-title">
          <span className="app-logo">🧭</span>
          <span>Journey Tracker</span>
        </div>
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
        <div className="header-actions">
          <ExportImport />
          <button
            className="icon-btn theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {user && (
            <div className="user-menu">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'User'}
                  className="user-avatar"
                  title={user.displayName ?? user.email}
                />
              )}
              <button className="icon-btn" onClick={signOut} title="Sign out">
                ↩
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'study'     && <StudyPlan />}
        {tab === 'life'      && <LifeTasks />}
        {tab === 'schedule'  && <Schedule />}
      </main>

      <footer className="app-footer">
        Stay disciplined. Small daily wins compound. 💪
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
