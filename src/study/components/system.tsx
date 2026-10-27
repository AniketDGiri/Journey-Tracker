import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const TONES = {
  arc: { frame: 'border-arc-soft/45 shadow-glow-arc', corner: 'border-arc-soft', tag: 'text-arc-soft' },
  rose: { frame: 'border-rose/60 shadow-[0_0_0_1px_rgba(240,98,122,0.3),0_0_28px_-6px_rgba(240,98,122,0.5)]', corner: 'border-rose', tag: 'text-rose' },
} as const;

type Tone = keyof typeof TONES;

/** A glowing Solo Leveling "System" window: framed with corner brackets. Rose is the Penalty Zone. */
export function SystemWindow({ children, label, className, tone = 'arc' }: { children: ReactNode; label: string; className?: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <section aria-label={label} className={cn('relative rounded-xl border bg-surface p-5 sm:px-6', t.frame, className)}>
      <span aria-hidden="true" className={cn('absolute -left-px -top-px h-3.5 w-3.5 rounded-tl-xl border-l-2 border-t-2', t.corner)} />
      <span aria-hidden="true" className={cn('absolute -bottom-px -right-px h-3.5 w-3.5 rounded-br-xl border-b-2 border-r-2', t.corner)} />
      {children}
    </section>
  );
}

/** The bracketed mono heading used on System windows, e.g. "[ DAILY QUEST ]". */
export function SystemTag({ children, tone = 'arc' }: { children: ReactNode; tone?: Tone }) {
  return <p className={cn('num text-xs tracking-[0.18em]', TONES[tone].tag)}>[ {children} ]</p>;
}

/**
 * The Penalty Zone notice: yesterday was failed. Clearing today wins part of it back.
 * Shows the survived state once today's work has earned the recovery.
 */
export function PenaltyZone({ lost, recover, survived, what, missed }: { lost: number; recover: number; survived: boolean; what: string; missed: string }) {
  if (survived)
    return (
      <SystemWindow label="Penalty Zone survived" className="py-4">
        <SystemTag>PENALTY ZONE · SURVIVED</SystemTag>
        <p className="mt-2 text-sm text-ink">
          Yesterday cost <span className="num text-rose">−{lost} XP</span>. You came back and {what} today: <span className="num text-jade">+{recover} XP</span> recovered.
        </p>
      </SystemWindow>
    );
  return (
    <SystemWindow label="Penalty Zone" tone="rose" className="py-4">
      <SystemTag tone="rose">PENALTY ZONE</SystemTag>
      <p className="mt-2 text-base font-semibold">{missed}</p>
      {lost > 0 ? (
        <p className="mt-1 text-sm text-ink-soft">
          Penalty applied: <span className="num font-semibold text-rose">−{lost} XP</span>. {what.charAt(0).toUpperCase() + what.slice(1)} before midnight to survive and recover{' '}
          <span className="num font-semibold text-jade">+{recover} XP</span>. Fail again and the next penalty grows.
        </p>
      ) : (
        <p className="mt-1 text-sm text-ink-soft">Your rank shielded you from losing XP this time — but the miss still counts. Fail again and the next penalty grows.</p>
      )}
    </SystemWindow>
  );
}
