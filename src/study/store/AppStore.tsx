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
import { ConflictError, LocalStorageAdapter, type StorageAdapter } from './storage';
import { migrate } from './schema';
import { absorbLegacy, acknowledged, rebase, staleNotice, type Pending } from './sync';

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
  const storage = useMemo<StorageAdapter>(() => adapter ?? new LocalStorageAdapter(), [adapter]);
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
        const notice = storage.takeNotice?.();
        if (notice) toast({ tone: 'info', title: notice });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Unknown error');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [storage, toast]);

  // Day rollover.
  useEffect(() => {
    const t = window.setInterval(() => setToday(toDayKey(new Date())), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // Changes the server hasn't acknowledged. If another tab or device saved first, they are
  // replayed on what it saved instead of overwriting it (or being lost).
  const pendingRef = useRef<Pending[]>([]);
  const seqRef = useRef(0);
  const adoptRef = useRef<(raw: unknown) => void>(() => {});
  const absorbRef = useRef<(raw: unknown, since: string) => void>(() => {});

  const persist = useCallback(
    (s: AppState) => {
      const seq = seqRef.current;
      storage
        .save(s)
        .then(() => {
          pendingRef.current = acknowledged(pendingRef.current, seq);
          setSaveError(undefined);
        })
        .catch((e: unknown) => {
          if (e instanceof ConflictError) adoptRef.current(e.remote);
          else setSaveError(e instanceof Error ? e.message : 'Could not save.');
        });
    },
    [storage],
  );

  /** What another tab or device saved becomes the base; this tab's unsaved changes go on top. */
  adoptRef.current = (raw) => {
    if (!raw) return;
    let remote: AppState;
    try {
      remote = migrate(raw);
    } catch {
      return;
    }
    const { state: next, kept, dropped } = rebase(remote, pendingRef.current);
    pendingRef.current = kept;
    stateRef.current = next;
    setState(next);
    if (kept.length) persist(next);
    toast({
      tone: 'info',
      title: dropped ? `Synced with another device — ${dropped} change${dropped > 1 ? 's' : ''} made here no longer applied` : 'Updated from another device',
    });
  };

  /** An old copy of the app saved somewhere: keep anything new it logged, never its stale copy. */
  absorbRef.current = (raw, since) => {
    if (!raw) return;
    let legacy: AppState;
    try {
      legacy = migrate(raw);
    } catch {
      return;
    }
    const fn = (s: AppState) => absorbLegacy(s, legacy, since).state;
    const { state: next, added } = absorbLegacy(stateRef.current, legacy, since);
    if (!added) return;
    stateRef.current = next;
    setState(next);
    pendingRef.current.push({ seq: ++seqRef.current, fn, ctx: ctx() });
    persist(next);
    toast({ tone: 'info', title: staleNotice(added) });
  };

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
        pendingRef.current.push({ seq: ++seqRef.current, fn, ctx: c });
        persist(next);
        const g = next.settings.gamification;
        if (!opts?.silent) {
          if (g && feedback.xp > 0) toast({ tone: 'success', title: `+${feedback.xp} XP`, detail: opts?.success });
          else if (opts?.success) toast({ tone: 'success', title: opts.success });
        }
        if (g && feedback.levelUp) toast({ tone: 'level', title: `Level ${feedback.levelUp}`, detail: feedback.rankUp ? `Rank up — you are now ${feedback.rankUp}.` : 'Your foundations are getting stronger.' });
        if (g) for (const a of feedback.achievements) toast({ tone: 'level', title: 'Achievement unlocked', detail: a });
        // System notices (penalties, Penalty Zone recoveries) show even on silent actions.
        if (g) for (const m of feedback.messages) toast({ tone: m.includes('survived') || m.includes('lifted') ? 'level' : 'error', title: m });
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

  // Judge finished days on load and at midnight, not only on the next action.
  useEffect(() => {
    if (status === 'ready') act((s) => s, { silent: true });
  }, [status, today, act]);

  // Other tabs and devices: pick up what they save, and write what is waiting when the page is hidden.
  useEffect(() => {
    if (status !== 'ready') return;
    const stop = storage.subscribe?.(
      (raw) => adoptRef.current(raw),
      (raw, since) => absorbRef.current(raw, since),
    );
    const flush = () => storage.flush?.();
    const hide = () => document.visibilityState === 'hidden' && flush();
    const online = () => pendingRef.current.length > 0 && persist(stateRef.current);
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', online);
    return () => {
      stop?.();
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('online', online);
    };
  }, [status, storage, persist]);

  const replace = useCallback(
    (s: AppState, message?: string) => {
      stateRef.current = s;
      setState(s);
      // Replacing everything (import, fresh start) is what was asked for: it wins over another device.
      pendingRef.current.push({ seq: ++seqRef.current, fn: () => s, ctx: ctx() });
      persist(s);
      if (message) toast({ tone: 'success', title: message });
    },
    [ctx, persist, toast],
  );

  const retrySave = useCallback(() => persist(stateRef.current), [persist]);

  const startSample = useCallback(() => replace(buildSampleState(new Date()), 'Sample data loaded'), [replace]);
  const startFresh = useCallback(() => {
    const settings = stateRef.current.settings;
    // A fresh start also restarts the penalty clock: nothing before today is judged.
    replace({ ...createEmptyState(new Date()), onboarded: true, settings: { ...settings, penaltiesSince: toDayKey(new Date()) } }, 'Fresh start. Your journey begins today.');
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
