import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  Binary,
  Boxes,
  Clock,
  Home,
  Hourglass,
  LayoutGrid,
  MoreHorizontal,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Square,
  Swords,
  Timer,
} from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI, type Route } from '../store/ui';
import { cn } from '../lib/cn';
import { Bar, Button } from './ui';
import { sessionElapsedMs, toggleSessionPause } from '../engine/actions';
import { Sigil } from './Sigil';

type Group = 'study' | 'life' | 'system';
const GROUPS: { id: Group; label: string }[] = [
  { id: 'study', label: 'Study' },
  { id: 'life', label: 'Life' },
  { id: 'system', label: 'System' },
];

const NAV: { route: Route; label: string; icon: typeof LayoutGrid; group: Group }[] = [
  { route: 'dashboard', label: 'Dashboard', icon: LayoutGrid, group: 'study' },
  { route: 'dsa', label: 'DSA', icon: Binary, group: 'study' },
  { route: 'hld', label: 'System Design', icon: Network, group: 'study' },
  { route: 'lld', label: 'Low-Level Design', icon: Boxes, group: 'study' },
  { route: 'revision', label: 'Revision', icon: RotateCcw, group: 'study' },
  { route: 'sessions', label: 'Study Time', icon: Clock, group: 'study' },
  { route: 'quests', label: 'Quests', icon: Swords, group: 'study' },
  { route: 'analytics', label: 'Analytics', icon: BarChart3, group: 'study' },
  { route: 'personal', label: 'Personal', icon: Home, group: 'life' },
  { route: 'time', label: 'Time', icon: Hourglass, group: 'life' },
  { route: 'settings', label: 'Settings', icon: Settings2, group: 'system' },
];

// Study actions (sessions, logging) belong to the study pages only.
const STUDY_ROUTES = new Set(NAV.filter((n) => n.group === 'study').map((n) => n.route));

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
}

export function SessionChip() {
  const { state, act } = useStore();
  const { open } = useUI();
  const s = state.activeSession;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!s?.runningSince) return;
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [s?.runningSince]);
  if (!s) {
    return (
      <Button variant="secondary" size="sm" onClick={() => open({ type: 'start-session' })}>
        <Timer size={14} aria-hidden="true" /> <span className="hidden sm:inline">Start session</span>
      </Button>
    );
  }
  const running = !!s.runningSince;
  return (
    <div className="flex items-center gap-1 rounded-lg border border-violet/40 bg-violet/10 py-0.5 pl-2.5 pr-0.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', running ? 'bg-violet-soft animate-pulseRing' : 'bg-ink-faint')} aria-hidden="true" />
      <span className="num min-w-[44px] text-xs text-violet-soft" aria-live="off">
        {fmt(sessionElapsedMs(s, Date.now()))}
      </span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => act((st, c) => toggleSessionPause(st, c), { silent: true })} aria-label={running ? 'Pause session' : 'Resume session'}>
        {running ? <Pause size={13} /> : <Play size={13} />}
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => open({ type: 'finish-session' })} aria-label="Finish session">
        <Square size={12} />
      </Button>
    </div>
  );
}

function PlayerMini() {
  const { derived, state } = useStore();
  if (!state.settings.gamification) return null;
  const { level } = derived;
  return (
    <div className="rounded-lg border border-line bg-surface-2/60 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-violet-soft">{level.rank.name}</span>
        <span className="num text-xs text-ink-muted">Lv {level.level}</span>
      </div>
      <Bar value={level.progress} className="mt-2" label="Level progress" />
      <p className="num mt-1.5 text-[11px] text-ink-muted">
        {level.intoLevel} / {level.forNext} XP
      </p>
    </div>
  );
}

export function AppShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const { route, navigate, open } = useUI();
  const { state, saveError, retrySave, derived } = useStore();
  const [more, setMore] = useState(false);
  const due = derived.queues.overdue.length + derived.queues.today.length;

  // Lightweight shortcuts: N = log progress, R = revision focus.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input,textarea,select,[contenteditable],dialog')) return;
      if (e.key === 'n') {
        e.preventDefault();
        open({ type: 'log' });
      } else if (e.key === 'r') {
        e.preventDefault();
        open({ type: 'focus' });
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open]);

  const navItems = NAV.filter((n) => !(n.route === 'quests' && !state.settings.gamification));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface-2 focus:px-3 focus:py-2">
        Skip to content
      </a>
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-line bg-void/60 px-4 py-5 backdrop-blur lg:flex">
        <a href="#/dashboard" className="flex items-center gap-2.5 px-2" aria-label="Ascend home">
          <Sigil size={24} />
          <span className="text-sm font-semibold tracking-[0.32em] text-ink">ASCEND</span>
        </a>
        <nav aria-label="Primary" className="flex flex-col gap-4">
          {GROUPS.map((g) => (
            <div key={g.id} className="flex flex-col gap-0.5">
              <p className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{g.label}</p>
              {navItems
                .filter((n) => n.group === g.id)
                .map(({ route: r, label, icon: Icon }) => (
                  <a
                    key={r}
                    href={`#/${r}`}
                    aria-current={route === r ? 'page' : undefined}
                    className={cn(
                      'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors',
                      route === r ? 'bg-surface-2 text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink',
                    )}
                  >
                    {route === r && <span className="absolute left-0 top-2 h-5 w-0.5 rounded-full bg-violet-soft shadow-glow" aria-hidden="true" />}
                    <Icon size={16} aria-hidden="true" className={route === r ? 'text-violet-soft' : ''} />
                    <span className="flex-1">{label}</span>
                    {r === 'revision' && due > 0 && <span className="num rounded bg-ember/15 px-1.5 text-[11px] text-ember-soft">{due}</span>}
                  </a>
                ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <PlayerMini />
          <p className="px-1 text-[11px] text-ink-faint">
            <kbd className="rounded border border-line px-1">N</kbd> log progress · <kbd className="rounded border border-line px-1">R</kbd> revise
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-20 lg:pb-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-void/80 px-4 backdrop-blur sm:px-6">
          <a href="#/dashboard" className="flex items-center gap-2 lg:hidden" aria-label="Ascend home">
            <Sigil size={22} />
          </a>
          <h1 className="truncate text-sm font-medium text-ink-soft">{NAV.find((n) => n.route === route)?.label}</h1>
          <div className="ml-auto flex items-center gap-2">
            {/* Study Time is for logging time after the fact, so it offers no timer of its own. */}
            {((STUDY_ROUTES.has(route) && route !== 'sessions') || state.activeSession) && <SessionChip />}
            {STUDY_ROUTES.has(route) && (
              <Button variant="primary" size="sm" onClick={() => open({ type: 'log' })} aria-keyshortcuts="n">
                <Plus size={14} aria-hidden="true" /> Log
              </Button>
            )}
            {actions}
            <div className="relative lg:hidden">
              <Button variant="ghost" size="icon" aria-label="More pages" aria-expanded={more} onClick={() => setMore((m) => !m)}>
                <MoreHorizontal size={18} />
              </Button>
              {more && (
                <div className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl" onClick={() => setMore(false)}>
                  {navItems
                    .filter((n) => ['sessions', 'quests', 'analytics', 'personal', 'time', 'settings'].includes(n.route))
                    .map(({ route: r, label, icon: Icon }) => (
                      <a key={r} href={`#/${r}`} className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-ink-soft hover:bg-surface-2 hover:text-ink">
                        <Icon size={16} aria-hidden="true" /> {label}
                      </a>
                    ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {state.mode === 'sample' && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-arc/25 bg-arc/[0.07] px-4 py-2.5 text-xs text-arc-soft sm:px-6" role="status">
            <span>
              <strong className="font-semibold">Sample data.</strong> You are exploring a demo journey — none of this is your progress.
            </span>
            <button className="font-medium text-ink underline decoration-arc/60 underline-offset-4 hover:decoration-arc" onClick={() => navigate('settings')}>
              Start my real journey →
            </button>
          </div>
        )}
        {saveError && (
          <div className="flex flex-wrap items-center gap-3 border-b border-rose/30 bg-rose/10 px-4 py-2.5 text-xs text-rose sm:px-6" role="alert">
            <span>Not saved: {saveError} Your changes are kept in this tab.</span>
            <button className="font-medium underline underline-offset-4" onClick={retrySave}>
              Retry
            </button>
            <button className="font-medium underline underline-offset-4" onClick={() => navigate('settings')}>
              Export backup
            </button>
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-6 sm:py-7">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-void/95 backdrop-blur lg:hidden">
        {NAV.slice(0, 5).map(({ route: r, label, icon: Icon }) => (
          <a
            key={r}
            href={`#/${r}`}
            aria-current={route === r ? 'page' : undefined}
            className={cn('relative flex h-16 flex-col items-center justify-center gap-1 text-[10px]', route === r ? 'text-violet-soft' : 'text-ink-muted')}
          >
            <Icon size={18} aria-hidden="true" />
            {label.split(' ')[0] === 'Low-Level' ? 'LLD' : label === 'System Design' ? 'HLD' : label === 'Dashboard' ? 'Home' : label}
            {r === 'revision' && due > 0 && <span className="num absolute right-[22%] top-2 rounded bg-ember/20 px-1 text-[10px] text-ember-soft">{due}</span>}
          </a>
        ))}
      </nav>
    </div>
  );
}
