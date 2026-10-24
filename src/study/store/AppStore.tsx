import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, DayKey } from '../domain/types';
import { createEmptyState } from '../domain/defaults';
import { buildSampleState } from '../domain/sample';
import { toDayKey } from '../lib/date';
import { ActionError, run, type Ctx, type Feedback } from '../engine/actions';
import { computeTopicStats, type TopicStats } from '../engine/mastery';
import { computeStreak, type StreakInfo } from '../engine/streak';
import { levelInfo, totalXp, type LevelInfo } from '../engine/progression';
import { revisionQueues, type RevisionQueues } from '../engine/revision';
import { LocalStorageAdapter, type StorageAdapter } from './storage';
import { migrate } from './schema';

export interface Toast {
  id: number;
  tone: 'success' | 'error' | 'info' | 'level';
  title: string;
  detail?: string;
  action?: { label: string; run: () => void };
}

export interface Derived {
  stats: Map<string, TopicStats>;
  streak: StreakInfo;
  level: LevelInfo;
  queues: RevisionQueues;
}

interface Store {
  status: 'loading' | 'ready' | 'error';
  loadError?: string;
  state: AppState;
  today: DayKey;
  derived: Derived;
  saveError?: string;
  ctx: () => Ctx;
  /** Run a transition. Returns feedback, or null if the action was rejected. */
  act: (fn: (s: AppState, ctx: Ctx) => AppState, opts?: { success?: string; silent?: boolean }) => Feedback | null;
  replace: (s: AppState, message?: string) => void;
  retrySave: () => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
  startSample: () => void;
  startFresh: () => void;
}

const StoreCtx = createContext<Store | null>(null);

export function AppStoreProvider({ children, adapter }: { children: ReactNode; adapter?: StorageAdapter }) {
  const storage = useMemo(() => adapter ?? new LocalStorageAdapter(), [adapter]);
  const [status, setStatus] = useState<Store['status']>('loading');
  const [loadError, setLoadError] = useState<string>();
  const [state, setState] = useState<AppState>(() => createEmptyState());
  const [saveError, setSaveError] = useState<string>();
  const [today, setToday] = useState(() => toDayKey(new Date()));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), t.tone === 'error' ? 8000 : 4200);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((x) => x.id !== id)), []);

  // Load once.
  useEffect(() => {
    let cancelled = false;
    storage
      .load()
      .then((raw) => {
        if (cancelled) return;
        if (raw) setState(migrate(raw));
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Unknown error');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  // Day rollover.
  useEffect(() => {
    const t = window.setInterval(() => setToday(toDayKey(new Date())), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const persist = useCallback(
    (s: AppState) => {
      storage
        .save(s)
        .then(() => setSaveError(undefined))
        .catch((e: unknown) => setSaveError(e instanceof Error ? e.message : 'Could not save.'));
    },
    [storage],
  );

  const ctx = useCallback((): Ctx => {
    const now = new Date();
    return { today: toDayKey(now), now: now.toISOString() };
  }, []);

  const act: Store['act'] = useCallback(
    (fn, opts) => {
      const c = ctx();
      try {
        const { state: next, feedback } = run(stateRef.current, (s) => fn(s, c), c);
        if (next === stateRef.current) return feedback;
        stateRef.current = next;
        setState(next);
        persist(next);
        const g = next.settings.gamification;
        if (!opts?.silent) {
          if (g && feedback.xp > 0) toast({ tone: 'success', title: `+${feedback.xp} XP`, detail: opts?.success });
          else if (opts?.success) toast({ tone: 'success', title: opts.success });
        }
        if (g && feedback.levelUp) toast({ tone: 'level', title: `Level ${feedback.levelUp}`, detail: feedback.rankUp ? `Rank up — you are now ${feedback.rankUp}.` : 'Your foundations are getting stronger.' });
        if (g) for (const a of feedback.achievements) toast({ tone: 'level', title: 'Achievement unlocked', detail: a });
        return feedback;
      } catch (e) {
        if (e instanceof ActionError) toast({ tone: 'error', title: e.message });
        else {
          console.error(e);
          toast({ tone: 'error', title: 'Something went wrong', detail: e instanceof Error ? e.message : undefined });
        }
        return null;
      }
    },
    [ctx, persist, toast],
  );

  const replace = useCallback(
    (s: AppState, message?: string) => {
      stateRef.current = s;
      setState(s);
      persist(s);
      if (message) toast({ tone: 'success', title: message });
    },
    [persist, toast],
  );

  const retrySave = useCallback(() => persist(stateRef.current), [persist]);

  const startSample = useCallback(() => replace(buildSampleState(new Date()), 'Sample data loaded'), [replace]);
  const startFresh = useCallback(() => {
    const settings = stateRef.current.settings;
    replace({ ...createEmptyState(new Date()), onboarded: true, settings }, 'Fresh start. Your journey begins today.');
  }, [replace]);

  const derived = useMemo<Derived>(
    () => ({
      stats: computeTopicStats(state, today),
      streak: computeStreak(state, today),
      level: levelInfo(totalXp(state)),
      queues: revisionQueues(state.items, today),
    }),
    [state, today],
  );

  // Reduced motion preference → <html> class.
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle('motion-off', state.settings.reducedMotion === 'on');
    el.classList.toggle('motion-on', state.settings.reducedMotion === 'off');
  }, [state.settings.reducedMotion]);

  const value: Store = {
    status,
    loadError,
    state,
    today,
    derived,
    saveError,
    ctx,
    act,
    replace,
    retrySave,
    toasts,
    toast,
    dismiss,
    startSample,
    startFresh,
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('useStore must be used inside AppStoreProvider');
  return s;
}
