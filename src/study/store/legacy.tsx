import { createContext, useContext, type ReactNode } from 'react';
import type { DayKey } from '../domain/types';

/**
 * Days won in the retired study tracker (read-only). Shown on the consistency
 * heatmap so the history from before Ascend isn't lost; they don't feed XP or streaks.
 */
const LegacyDaysCtx = createContext<ReadonlySet<DayKey>>(new Set());

export function LegacyDaysProvider({ days, children }: { days: ReadonlySet<DayKey>; children: ReactNode }) {
  return <LegacyDaysCtx.Provider value={days}>{children}</LegacyDaysCtx.Provider>;
}

export function useLegacyDays(): ReadonlySet<DayKey> {
  return useContext(LegacyDaysCtx);
}
