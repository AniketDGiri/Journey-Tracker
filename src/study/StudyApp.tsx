import { useMemo, type ReactNode } from 'react';
import { CheckCircle2, LogOut, Moon, Sparkles, Sun, TriangleAlert, X } from 'lucide-react';
import { AppStoreProvider, useStore } from './store/AppStore';
import { UIProvider, useUI } from './store/ui';
import { FirestoreAdapter } from './store/firestore';
import { LegacyDaysProvider } from './store/legacy';
import { AppShell } from './components/AppShell';
import { Button } from './components/ui';
import { Sigil } from './components/Sigil';
import { Dashboard } from './views/Dashboard';
import { Workspace } from './views/Workspace';
import { Revision } from './views/Revision';
import { StudyTime } from './views/StudyTime';
import { Quests } from './views/Quests';
import { Analytics } from './views/Analytics';
import { Settings } from './views/Settings';
import { LogSheet } from './components/sheets/LogSheet';
import { ItemSheet } from './components/sheets/ItemSheet';
import { FinishSessionSheet, StartSessionSheet } from './components/sheets/SessionSheets';
import { FocusSheet } from './components/sheets/FocusSheet';
import { BossSheet } from './components/sheets/BossSheet';
import { TopicSheet } from './components/sheets/TopicSheet';
import { PlanSheet } from './components/sheets/PlanSheet';
import { WorkoutLogSheet } from './components/sheets/WorkoutLogSheet';
import { Workout } from './views/Workout';
import { Nutrition } from './views/Nutrition';
import { cn } from './lib/cn';
import type { User } from 'firebase/auth';
// The Personal and Time workspaces are the original JS app, unchanged.
import { useAppStore as useLegacyStore } from '../store/AppStore';
import Personal from '../components/Personal/Personal';
import TimeTracker from '../components/Personal/TimeTracker';
import ExportImport from '../components/common/ExportImport';
import { Card as LegacyCard } from '../components/common/ui';
import { useLocalStorage } from '../hooks/useLocalStorage';
import './study.css';

// Types for the untyped JS boundary.
const useAppStore = useLegacyStore as unknown as () => { user: User; signOut: () => void; legacyWonDays?: string[] };
const Card = LegacyCard as unknown as (p: { title: string; subtitle?: string; className?: string; children: ReactNode }) => ReactNode;

function Sheets() {
  const { sheet } = useUI();
  if (!sheet) return null;
  switch (sheet.type) {
    case 'log':
      return <LogSheet key={`${sheet.domain}-${sheet.itemId}-${sheet.mode}-${sheet.topicId}`} domain={sheet.domain} itemId={sheet.itemId} mode={sheet.mode} topicId={sheet.topicId} />;
    case 'item':
      return <ItemSheet key={sheet.itemId} itemId={sheet.itemId} />;
    case 'start-session':
      return <StartSessionSheet domain={sheet.domain} itemId={sheet.itemId} />;
    case 'finish-session':
      return <FinishSessionSheet manual={sheet.manual} />;
    case 'focus':
      return <FocusSheet domain={sheet.domain} />;
    case 'boss':
      return <BossSheet bossId={sheet.bossId} />;
    case 'topic':
      return <TopicSheet domain={sheet.domain} topicId={sheet.topicId} />;
    case 'plan':
      return <PlanSheet key={`${sheet.itemId}-${sheet.subItemId}-${sheet.goalId}`} itemId={sheet.itemId} subItemId={sheet.subItemId} goalId={sheet.goalId} />;
    case 'workout-log':
      return <WorkoutLogSheet key={sheet.workoutId} phaseId={sheet.phaseId} workoutId={sheet.workoutId} />;
  }
}

function Toasts() {
  const { toasts, dismiss } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-20 right-3 z-[60] flex w-[min(360px,calc(100%-24px))] flex-col gap-2 lg:bottom-5 lg:right-5" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface/95 px-4 py-3 shadow-2xl backdrop-blur animate-rise',
            t.tone === 'error' ? 'border-rose/40' : t.tone === 'level' ? 'border-violet/60 shadow-glow' : 'border-line-strong',
          )}
        >
          {t.tone === 'error' ? <TriangleAlert size={16} className="mt-0.5 text-rose" aria-hidden="true" /> : t.tone === 'level' ? <Sparkles size={16} className="mt-0.5 text-violet-soft" aria-hidden="true" /> : <CheckCircle2 size={16} className="mt-0.5 text-arc-soft" aria-hidden="true" />}
          <div className="min-w-0 flex-1">
            <p className={cn('text-sm font-medium', t.title.startsWith('+') && 'num text-violet-soft')}>{t.title}</p>
            {t.detail && <p className="mt-0.5 truncate text-xs text-ink-muted">{t.detail}</p>}
          </div>
          <button className="text-ink-faint hover:text-ink" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Onboarding() {
  const { startSample, startFresh } = useStore();
  const { navigate } = useUI();
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="w-full max-w-lg text-center animate-rise">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-violet/40 bg-violet/10 shadow-glow">
          <Sigil size={34} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Become the engineer you’re preparing to be.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          Ascend tracks DSA, system design and low-level design with spaced revision and a quiet progression layer. XP only comes from real outcomes.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="primary" onClick={startFresh}>
            Start my journey
          </Button>
          <Button variant="secondary" onClick={startSample}>
            Explore with sample data
          </Button>
        </div>
        <p className="mt-4 text-[11px] text-ink-muted">
          Sample data is clearly labelled and can be replaced with a fresh start anytime.{' '}
          <button className="underline underline-offset-4 hover:text-ink" onClick={() => navigate('personal')}>
            Go to Personal instead
          </button>
        </p>
      </div>
    </div>
  );
}

function TimeWorkspace() {
  return (
    <Card
      title="Time"
      subtitle="Log what you did in each slot of the day and mark it urgent and/or important. The day is scored as an Eisenhower matrix as you go."
      className="card-wide"
    >
      <TimeTracker />
    </Card>
  );
}

function Routes() {
  const { route } = useUI();
  const { state } = useStore();
  // Personal and Time never depend on the study onboarding.
  if (route === 'personal') return <div className="legacy"><Personal /></div>;
  if (route === 'time') return <div className="legacy"><TimeWorkspace /></div>;
  // Training and nutrition are independent of study onboarding too.
  if (route === 'workout') return <Workout />;
  if (route === 'nutrition') return <Nutrition />;
  if (!state.onboarded) return <Onboarding />;
  switch (route) {
    case 'dsa':
    case 'hld':
    case 'lld':
      return <Workspace key={route} domain={route} />;
    case 'revision':
      return <Revision />;
    case 'sessions':
      return <StudyTime />;
    case 'quests':
      return <Quests />;
    case 'analytics':
      return <Analytics />;
    case 'settings':
      return <Settings />;
    default:
      return <Dashboard />;
  }
}

function HeaderActions({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const { user, signOut } = useAppStore();
  const { route } = useUI();
  return (
    <div className="flex items-center gap-1">
      {/* The header backup covers Personal and Time; study data has its own in Settings → Data. */}
      {(route === 'personal' || route === 'time') && <ExportImport />}
      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </Button>
      {user && (
        <>
          {user.photoURL && <img src={user.photoURL} alt={user.displayName ?? 'User'} title={user.displayName ?? user.email ?? undefined} className="hidden h-7 w-7 rounded-full border border-line-strong object-cover sm:block" />}
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={16} />
          </Button>
        </>
      )}
    </div>
  );
}

function Root({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const { status, loadError } = useStore();
  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading">
        <div className="animate-pulseRing">
          <Sigil size={36} />
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="st-panel max-w-md p-6 text-center">
          <TriangleAlert className="mx-auto text-rose" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Your study data couldn’t be loaded</h1>
          <p className="mt-2 text-sm text-ink-muted">{loadError}</p>
          <p className="mt-2 text-xs text-ink-muted">Nothing has been overwritten. Check your connection and try again.</p>
          <Button variant="primary" className="mt-5" onClick={() => location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <AppShell actions={<HeaderActions theme={theme} setTheme={setTheme} />}>
        <Routes />
      </AppShell>
      <Sheets />
      <Toasts />
    </>
  );
}

/** The signed-in app: Ascend study tracker plus the Personal and Time workspaces. */
export default function StudyApp() {
  const { user, legacyWonDays } = useAppStore();
  const [theme, setTheme] = useLocalStorage('ascend.theme', 'dark');
  const adapter = useMemo(() => new FirestoreAdapter(user.uid), [user.uid]);
  const legacyDays = useMemo(() => new Set(legacyWonDays ?? []), [legacyWonDays]);
  return (
    <div className="app min-h-screen bg-void font-sans text-ink antialiased" data-theme={theme}>
      <AppStoreProvider key={user.uid} adapter={adapter}>
        <UIProvider>
          <LegacyDaysProvider days={legacyDays}>
            <Root theme={theme} setTheme={setTheme} />
          </LegacyDaysProvider>
        </UIProvider>
      </AppStoreProvider>
    </div>
  );
}
