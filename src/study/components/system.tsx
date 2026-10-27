import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/** A glowing Solo Leveling "System" window: blue frame with corner brackets. */
export function SystemWindow({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <section aria-label={label} className={cn('relative rounded-xl border border-arc-soft/45 bg-surface p-5 shadow-glow-arc sm:px-6', className)}>
      <span aria-hidden="true" className="absolute -left-px -top-px h-3.5 w-3.5 rounded-tl-xl border-l-2 border-t-2 border-arc-soft" />
      <span aria-hidden="true" className="absolute -bottom-px -right-px h-3.5 w-3.5 rounded-br-xl border-b-2 border-r-2 border-arc-soft" />
      {children}
    </section>
  );
}

/** The bracketed mono heading used on System windows, e.g. "[ DAILY QUEST ]". */
export function SystemTag({ children }: { children: ReactNode }) {
  return <p className="num text-xs tracking-[0.18em] text-arc-soft">[ {children} ]</p>;
}
