import { useCallback, useLayoutEffect, useRef } from 'react'

/** A table cell field that wraps onto more lines instead of scrolling out of view. */
export function GrowText({ value, onChange, placeholder, title }) {
  const ref = useRef(null)
  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])
  useLayoutEffect(resize, [value, resize])

  return (
    <textarea
      ref={ref}
      className="cell-input cell-text"
      rows={1}
      value={value ?? ''}
      placeholder={placeholder}
      title={title}
      onChange={onChange}
    />
  )
}

export function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Bar({ value, tone = 'accent', height = 10 }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100
  return (
    <div className="bar-track" style={{ height }}>
      <div className={`bar-fill bar-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

export function Row({ label, value, hint }) {
  return (
    <div className="kv">
      <span className="kv-label">{label}</span>
      <span className="kv-value">{value}</span>
      {hint && <span className="kv-hint">{hint}</span>}
    </div>
  )
}

export function Field({ label, children, wide }) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>
}

export const hrs = (n) => `${(n ?? 0).toFixed(1)}h`
export const pct = (n) => (n === null || n === undefined ? '—' : `${Math.round(n * 100)}%`)
