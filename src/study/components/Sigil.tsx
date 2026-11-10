import { useId } from 'react';

/** Original mark: an ascending chevron inside a thin diamond. */
export function Sigil({ size = 24 }: { size?: number }) {
  // Each copy needs its own gradient id: the sidebar's copy is hidden on small screens,
  // and a shared id would point the header's copy at a gradient that isn't rendered.
  const g = `sigil-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={g} x1="0" y1="24" x2="24" y2="0">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path d="M12 1.5 22.5 12 12 22.5 1.5 12Z" stroke={`url(#${g})`} strokeWidth="1.2" opacity=".7" />
      <path d="M7 14.5 12 9.5l5 5" stroke={`url(#${g})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 17.5 12 14.5l3 3" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
    </svg>
  );
}
