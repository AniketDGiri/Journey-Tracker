import type { DayKey } from '../domain/types';

/**
 * Calendar-day helpers. Everything works on local `YYYY-MM-DD` keys so that
 * revision dates never drift across time zones or DST transitions.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function toDayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isDayKey(v: unknown): v is DayKey {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(parseDayKey(v).getTime());
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseDayKey(key);
  return toDayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Whole days from `a` to `b` (b - a). DST-safe because it compares UTC midnights. */
export function diffDays(a: DayKey, b: DayKey): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function weekday(key: DayKey): number {
  return parseDayKey(key).getDay();
}

/** Monday of the week containing `key`. */
export function startOfWeek(key: DayKey): DayKey {
  const wd = weekday(key);
  return addDays(key, -((wd + 6) % 7));
}

export function daysBetween(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let k = from; diffDays(k, to) >= 0; k = addDays(k, 1)) out.push(k);
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDay(key: DayKey, today?: DayKey): string {
  if (today) {
    const d = diffDays(today, key);
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    if (d === -1) return 'Yesterday';
    if (d > 1 && d < 7) return `In ${d} days`;
    if (d < -1 && d > -7) return `${-d} days ago`;
  }
  const dt = parseDayKey(key);
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

export function shortWeekday(key: DayKey): string {
  return DAYS[weekday(key)];
}

export function monthLabel(key: DayKey): string {
  return MONTHS[parseDayKey(key).getMonth()];
}

export function startOfMonth(key: DayKey): DayKey {
  return `${key.slice(0, 7)}-01`;
}

export function endOfMonth(key: DayKey): DayKey {
  const d = parseDayKey(key);
  return toDayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function addMonths(key: DayKey, n: number): DayKey {
  const d = parseDayKey(startOfMonth(key));
  return toDayKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function monthYear(key: DayKey): string {
  const d = parseDayKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
