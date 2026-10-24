/** Original mark: an ascending chevron inside a thin diamond. */
export function Sigil({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sigil-g" x1="0" y1="24" x2="24" y2="0">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path d="M12 1.5 22.5 12 12 22.5 1.5 12Z" stroke="url(#sigil-g)" strokeWidth="1.2" opacity=".7" />
      <path d="M7 14.5 12 9.5l5 5" stroke="url(#sigil-g)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 17.5 12 14.5l3 3" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
    </svg>
  );
}
