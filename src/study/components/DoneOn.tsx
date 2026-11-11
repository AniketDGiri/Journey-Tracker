import { useRef } from 'react';
import { CalendarCheck } from 'lucide-react';
import { formatDay } from '../lib/date';
import { cn } from '../lib/cn';

/**
 * A small calendar button: pick the day something was done. For things not done yet it marks
 * them done on that day; for things already done it moves the date. Opens the browser's own
 * date picker (no future dates).
 */
export function DoneOnButton({
  label,
  done,
  value,
  today,
  onPick,
  className,
}: {
  /** What is being dated, for screen readers and the tooltip. */
  label: string;
  done: boolean;
  /** The day it was done, if known. */
  value?: string;
  today: string;
  onPick: (day: string) => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const el = input.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };
  const tip = done ? `Done${value ? ` ${formatDay(value, today).toLowerCase()}` : ''} — change the date` : 'Mark done on a past day';
  return (
    <span className={cn('relative inline-grid h-7 w-7 shrink-0', className)}>
      <button
        type="button"
        onClick={openPicker}
        aria-label={done ? `Change when “${label}” was done` : `Mark “${label}” done on a past day`}
        title={tip}
        className={cn(
          'inline-grid h-7 w-7 place-items-center rounded-md transition-colors',
          done ? 'text-arc-soft hover:bg-arc/15' : 'text-ink-faint hover:bg-surface-3 hover:text-ink',
        )}
      >
        <CalendarCheck size={14} aria-hidden="true" />
      </button>
      <input
        ref={input}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        max={today}
        value={value ?? today}
        onChange={(e) => {
          const day = e.target.value;
          if (day && day <= today && day !== value) onPick(day);
        }}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
    </span>
  );
}

/** "· 3 Nov" after a done step or item, when it wasn't today. */
export function DoneDate({ day, today, className }: { day?: string; today: string; className?: string }) {
  if (!day) return null;
  return <span className={cn('num whitespace-nowrap text-[11px] text-ink-muted', className)}>{formatDay(day, today)}</span>;
}
