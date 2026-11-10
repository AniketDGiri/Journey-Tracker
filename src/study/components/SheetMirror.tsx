import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Check, Copy, ExternalLink, RefreshCw, Sheet } from 'lucide-react';
import type { AppState } from '../domain/types';
import { useStore } from '../store/AppStore';
import { isScriptUrl, mirrorPayload, pushMirror, type PersonalData } from '../store/sheetMirror';
import { updateSettings } from '../engine/actions';
import { Button, Field, Panel } from './ui';
import { useAppStore as useLegacyStore } from '../../store/AppStore';

const useLegacy = useLegacyStore as unknown as () => PersonalData;

/** Quiet time after the last change before the sheet is updated, so a burst of edits is one push. */
const DEBOUNCE_MS = 20_000;
const LAST_OK = 'ascend.sheetMirror.lastOk';

// ── Sync status, shared by the watcher and the settings panel ──

interface Status {
  phase: 'idle' | 'syncing' | 'ok' | 'error';
  lastOk?: string;
  error?: string;
}
let status: Status = { phase: 'idle', lastOk: read(LAST_OK) };
const listeners = new Set<() => void>();
const setStatus = (s: Partial<Status>) => {
  status = { ...status, ...s };
  listeners.forEach((l) => l());
};
const useStatus = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => status,
  );

function read(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Set by the watcher: pushes the current data now. */
let syncNow: () => void = () => {};

/**
 * Keeps the Google Sheet in step: pushes a fresh copy shortly after changes,
 * when the app opens, and when the tab is hidden. Renders nothing.
 */
export function SheetMirrorWatcher() {
  const { state, today, status: storeStatus } = useStore();
  const legacy = useLegacy();
  const cfg = state.settings.sheetMirror;
  const latest = useRef({ state, today, legacy });
  useEffect(() => {
    latest.current = { state, today, legacy };
  });
  const busy = useRef(false);
  const again = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const push = async () => {
      const { state: s, today: t, legacy: l } = latest.current;
      const c = s.settings.sheetMirror;
      if (!c?.url || s.mode !== 'real') return;
      if (busy.current) {
        again.current = true;
        return;
      }
      busy.current = true;
      dirty.current = false;
      setStatus({ phase: 'syncing', error: undefined });
      try {
        const personal: PersonalData = { personalTasks: l.personalTasks, personalSections: l.personalSections, projects: l.projects, timeLog: l.timeLog };
        await pushMirror(c.url, mirrorPayload(c.secret, s as AppState, personal, t));
        const at = new Date().toISOString();
        try {
          localStorage.setItem(LAST_OK, at);
        } catch {
          /* display only */
        }
        setStatus({ phase: 'ok', lastOk: at });
      } catch (e) {
        dirty.current = true;
        setStatus({ phase: 'error', error: e instanceof Error ? e.message : 'Could not update the Google Sheet.' });
      } finally {
        busy.current = false;
        if (again.current) {
          again.current = false;
          void push();
        }
      }
    };
    syncNow = () => void push();
    return () => {
      syncNow = () => {};
    };
  }, []);

  // A change (here or synced from another device) → push after a quiet spell.
  const key = cfg?.url && storeStatus === 'ready' && state.mode === 'real' ? cfg.url : '';
  useEffect(() => {
    if (!key) return;
    dirty.current = true;
    const t = window.setTimeout(() => syncNow(), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [key, state, legacy.personalTasks, legacy.projects, legacy.timeLog, legacy.personalSections]);

  // Leaving the page: don't wait out the quiet spell.
  useEffect(() => {
    if (!key) return;
    const hide = () => document.visibilityState === 'hidden' && dirty.current && syncNow();
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [key]);

  return null;
}

const newSecret = () => {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/[+/=]/g, '').slice(0, 24);
};

/** Settings → Google Sheet mirror. */
export function SheetMirrorPanel() {
  const { state, act } = useStore();
  const cfg = state.settings.sheetMirror;
  const st = useStatus();
  const [url, setUrl] = useState(cfg?.url ?? '');
  const [secret, setSecret] = useState(cfg?.secret ?? newSecret);
  const [copied, setCopied] = useState(false);
  const urlOk = isScriptUrl(url);

  const save = () => {
    act((s) => updateSettings(s, { sheetMirror: { url: url.trim(), secret } }), { success: 'Google Sheet connected — sending your data' });
    window.setTimeout(() => syncNow(), 300);
  };
  const off = () => act((s) => updateSettings(s, { sheetMirror: undefined }), { success: 'Google Sheet mirror turned off. The sheet keeps what it has.' });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the field is selectable */
    }
  };
  const changed = !cfg || cfg.url !== url.trim() || cfg.secret !== secret;

  return (
    <Panel title="Google Sheet mirror" className="lg:col-span-2">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">
          Keeps a read-only copy of everything — study, revisions, backlog, quests, XP, workouts, nutrition, personal tasks and the time log — in a Google Sheet, updated
          automatically from any device. The sheet also keeps a daily backup of your raw data for the last 60 days.
        </p>
        <details className="rounded-lg border border-line bg-surface-2/50 p-3 text-sm text-ink-soft">
          <summary className="cursor-pointer font-medium text-ink">How to set it up (5 minutes, once)</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Create a new Google Sheet at sheets.new.</li>
            <li>
              In the sheet: <strong>Extensions → Apps Script</strong>. Delete what is there and paste in the script from <code>google-sheets/JourneyMirror.gs</code> in this project.
            </li>
            <li>
              In the script, set <code>SECRET</code> to the secret key below (copy it), then save.
            </li>
            <li>
              <strong>Deploy → New deployment</strong> → type <strong>Web app</strong>. Execute as: <strong>Me</strong>. Who has access: <strong>Anyone</strong>. Deploy and allow
              access when Google asks.
            </li>
            <li>Copy the Web app URL (ends in /exec), paste it below and press Connect.</li>
          </ol>
          <p className="mt-2 text-xs text-ink-muted">“Anyone” only means the link works without signing in; without the secret key it accepts nothing and shows nothing.</p>
        </details>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Web app URL" htmlFor="mirror-url" hint={url && !urlOk ? 'This should look like https://script.google.com/macros/s/…/exec' : undefined}>
            <input id="mirror-url" className="st-input w-full" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" spellCheck={false} />
          </Field>
          <Field label="Secret key" htmlFor="mirror-secret">
            <div className="flex gap-2">
              <input id="mirror-secret" className="st-input num w-56" value={secret} onChange={(e) => setSecret(e.target.value.trim())} spellCheck={false} />
              <Button variant="secondary" size="icon" onClick={copy} aria-label="Copy secret key" title="Copy">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {changed ? (
            <Button variant="primary" disabled={!urlOk || secret.length < 8} onClick={save}>
              <Sheet size={14} aria-hidden="true" /> Connect
            </Button>
          ) : (
            <Button variant="secondary" disabled={st.phase === 'syncing' || state.mode !== 'real'} onClick={() => syncNow()}>
              <RefreshCw size={14} aria-hidden="true" className={st.phase === 'syncing' ? 'animate-spin' : undefined} /> Sync now
            </Button>
          )}
          {cfg && (
            <Button variant="ghost" onClick={off}>
              Turn off
            </Button>
          )}
          {cfg && (
            <a className="inline-flex items-center gap-1 text-xs text-ink-muted underline-offset-2 hover:underline" href={cfg.url} target="_blank" rel="noreferrer">
              Test the link <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </div>
        {cfg && (
          <p className={st.phase === 'error' ? 'text-sm text-rose' : 'text-xs text-ink-muted'} role="status">
            {state.mode !== 'real'
              ? 'Paused while sample data is loaded.'
              : st.phase === 'syncing'
                ? 'Updating the sheet…'
                : st.phase === 'error'
                  ? st.error
                  : st.lastOk
                    ? `Sheet updated ${new Date(st.lastOk).toLocaleString()}. It updates by itself about 20 seconds after each change.`
                    : 'Waiting for the first update…'}
          </p>
        )}
      </div>
    </Panel>
  );
}
