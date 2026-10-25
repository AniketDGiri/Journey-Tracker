import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Domain } from '../domain/types';

/** UI-only state: routing and which global sheet is open. Never persisted. */

export type Route = 'dashboard' | 'dsa' | 'hld' | 'lld' | 'revision' | 'sessions' | 'quests' | 'analytics' | 'settings' | 'personal' | 'time';
const ROUTES: Route[] = ['dashboard', 'dsa', 'hld', 'lld', 'revision', 'sessions', 'quests', 'analytics', 'settings', 'personal', 'time'];

export type Sheet =
  /** `mode: 'new'` opens straight on a blank item form, pre-set to `topicId`. */
  | { type: 'log'; domain?: Domain; itemId?: string; mode?: 'new' | 'existing'; topicId?: string }
  | { type: 'item'; itemId: string }
  | { type: 'start-session'; domain?: Domain; itemId?: string }
  | { type: 'finish-session'; manual?: { domain: Domain; itemId?: string; topicId?: string } }
  | { type: 'focus'; domain?: Domain }
  | { type: 'boss'; bossId: string }
  | { type: 'topic'; domain: Domain; topicId?: string };

interface UI {
  route: Route;
  navigate: (r: Route | string) => void;
  sheet: Sheet | null;
  open: (s: Sheet) => void;
  close: () => void;
}

const UICtx = createContext<UI | null>(null);

function parse(): Route {
  const r = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'dashboard';
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(parse);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = useCallback((r: string) => {
    window.location.hash = `/${r}`;
  }, []);
  return (
    <UICtx.Provider value={{ route, navigate, sheet, open: setSheet, close: () => setSheet(null) }}>{children}</UICtx.Provider>
  );
}

export function useUI(): UI {
  const u = useContext(UICtx);
  if (!u) throw new Error('useUI must be used inside UIProvider');
  return u;
}
