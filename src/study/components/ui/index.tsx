import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

// ── Button ──────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-violet text-white hover:bg-violet-soft hover:text-void shadow-[0_0_0_1px_rgba(167,139,250,0.4),0_8px_24px_-12px_rgba(139,92,246,0.8)]',
  secondary: 'border border-line-strong bg-surface-2 text-ink hover:border-violet/50 hover:bg-surface-3',
  ghost: 'text-ink-soft hover:bg-surface-2 hover:text-ink',
  subtle: 'bg-surface-2 text-ink-soft hover:bg-surface-3 hover:text-ink',
  danger: 'border border-rose/40 bg-rose/10 text-rose hover:bg-rose/20',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'icon' && 'h-9 w-9 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
});

// ── Progress ────────────────────────────────────────────────────────────

export function Bar({
  value,
  tone = 'violet',
  className,
  label,
}: {
  value: number;
  tone?: 'violet' | 'arc' | 'ember' | 'jade' | 'muted';
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = {
    violet: 'bg-gradient-to-r from-violet-deep to-violet-soft',
    arc: 'bg-gradient-to-r from-arc to-arc-soft',
    ember: 'bg-ember',
    jade: 'bg-jade',
    muted: 'bg-ink-faint',
  }[tone];
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({
  value,
  size = 56,
  stroke = 4,
  tone = 'violet',
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: 'violet' | 'arc' | 'jade';
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const color = { violet: 'var(--c-violet-soft)', arc: 'var(--c-arc-soft)', jade: 'var(--c-jade)' }[tone];
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: 'rgb(var(--c-surface-3))' }} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ stroke: `rgb(${color})`, transition: 'stroke-dashoffset .8s ease-out', filter: `drop-shadow(0 0 4px rgb(${color} / 0.4))` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────

export function Badge({ children, tone = 'muted', className }: { children: ReactNode; tone?: 'muted' | 'violet' | 'arc' | 'ember' | 'rose' | 'jade'; className?: string }) {
  const tones = {
    muted: 'border-line-strong text-ink-muted',
    violet: 'border-violet/40 text-violet-soft bg-violet/10',
    arc: 'border-arc/40 text-arc-soft bg-arc/10',
    ember: 'border-ember/40 text-ember-soft bg-ember/10',
    rose: 'border-rose/40 text-rose bg-rose/10',
    jade: 'border-jade/40 text-jade bg-jade/10',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none', tones[tone], className)}>{children}</span>;
}

// ── Panel ───────────────────────────────────────────────────────────────

export function Panel({
  title,
  action,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const hid = useId();
  return (
    <section className={cn('st-panel p-4 sm:p-5', className)} aria-labelledby={title ? hid : undefined} id={id}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 id={hid} className="st-label">
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-4 py-8 text-center">
      {icon && <div className="text-ink-faint">{icon}</div>}
      <p className="text-sm font-medium text-ink-soft">{title}</p>
      {children && <div className="text-xs text-ink-muted">{children}</div>}
    </div>
  );
}

// ── Modal (native <dialog>: focus trap + Esc for free) ──────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const hid = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={hid}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto max-h-[92vh] w-[calc(100%-24px)] overflow-hidden rounded-2xl border border-line-strong bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/70',
        wide ? 'max-w-3xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="flex max-h-[92vh] flex-col animate-rise">
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id={hid} className="text-base font-semibold">
              {title}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
              <X size={16} />
            </Button>
          </header>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

// ── Form bits ───────────────────────────────────────────────────────────

export function Field({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-2.5 font-medium transition-colors',
            size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm',
            value === o.value ? 'bg-surface-3 text-ink shadow-[inset_0_0_0_1px_rgba(139,92,246,0.45)]' : 'text-ink-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Confidence({ value, onChange, label = 'Confidence' }: { value: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${label} ${n} of 5`}
          onClick={() => onChange(value === n ? 0 : n)}
          className={cn(
            'h-8 w-8 rounded-md border text-xs font-medium transition-colors num',
            n <= value ? 'border-violet/60 bg-violet/20 text-violet-soft' : 'border-line-strong bg-surface-2 text-ink-muted hover:text-ink',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full border transition-colors', checked ? 'border-violet bg-violet/70' : 'border-line-strong bg-surface-3')}
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1.5 text-sm text-ink-soft hover:text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-line-strong bg-surface-2 checked:border-violet checked:bg-violet
          checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222.5%22><path d=%22M3.5 8.5l3 3 6-7%22/></svg>')] bg-center bg-no-repeat"
      />
      <span>{label}</span>
    </label>
  );
}
