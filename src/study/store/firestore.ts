import { doc, getDoc, onSnapshot, runTransaction, setDoc, type DocumentData } from 'firebase/firestore';
import { db } from '../../firebase';
import type { AppState } from '../domain/types';
import { ConflictError, type StorageAdapter } from './storage';
import { migrate } from './schema';
import { absorbLegacy, migrateLegacy, staleNotice } from './sync';

/**
 * Syncs study state to the signed-in user's account. It lives in its own
 * document, beside (never inside) the Personal/Time data in `appData/main`.
 * State is stored as one JSON string: Firestore rejects `undefined` values and
 * nested arrays, both of which the study state may contain.
 *
 * The whole state is one document, so two tabs or devices would otherwise
 * overwrite each other and the one that saved last would win. Every save carries
 * a revision number and only lands on top of the revision this tab last saw;
 * otherwise it is refused with a `ConflictError` and the store replays its
 * unsaved changes on what the other side saved (see store/sync).
 *
 * Saves from one tab run one at a time, in order. Two overlapping saves could
 * otherwise land out of order and an older picture would overwrite a newer one.
 *
 * Every change is also kept in this browser (the "outbox") until the server has
 * it. Closing or reloading the page while a save is still on its way used to lose
 * that change; now the next load finds it in the outbox and saves it.
 *
 * Copies of the app opened before that existed (a phone tab, a tab never
 * reloaded) still overwrite `appData/ascend` with whatever stale copy they hold.
 * So state now lives in `appData/ascend2`, which they don't know about. On the
 * first load it starts from `appData/ascend`; after that, anything new an old
 * copy saves there is folded in by id (store/sync `absorbLegacy`) and nothing
 * it holds can overwrite this document.
 */
const DOC = 'ascend2';
const RETIRED = 'ascend';

/** A change not yet acknowledged by the server, kept in this browser. */
interface Outbox {
  /** The tab that made it. */
  by: string;
  /** The revision (and its save time) the change was made on top of. */
  base: number;
  baseAt: string;
  at: string;
  state: unknown;
}

/** An outbox this old belongs to a tab that closed before its save went through. */
const ABANDONED_MS = 60_000;

export class FirestoreAdapter implements StorageAdapter {
  private pending: AppState | null = null;
  private timer: number | undefined;
  private waiters: { resolve: () => void; reject: (e: unknown) => void }[] = [];
  /** A save is on its way; the next one waits for it. */
  private writing = false;
  /**
   * Another device saved and what is queued here was made before it. The store rebases its
   * changes on that save and saves again; until then the stale picture must not be written.
   */
  private held = false;
  /** The revision of the document this tab last saw or saved, and when it was saved. */
  private rev = 0;
  private revAt = '';
  /** Tells this tab's own saves apart from another tab's in the live feed. */
  private readonly id = Math.random().toString(36).slice(2);
  /** The retired document's last save already folded in. */
  private seen = '';
  private notice: string | undefined;

  constructor(
    private uid: string,
    private delayMs = 500,
  ) {}

  private ref(name = DOC) {
    return doc(db, 'users', this.uid, 'appData', name);
  }

  private parse(data: DocumentData | undefined): unknown | null {
    const json = data?.json;
    return typeof json === 'string' ? JSON.parse(json) : null;
  }

  private revOf(data: DocumentData | undefined): number {
    return typeof data?.rev === 'number' ? data.rev : 0;
  }

  private savedAt(data: DocumentData | undefined): string {
    return typeof data?.savedAt === 'string' ? data.savedAt : '';
  }

  // ── Outbox ──

  private get boxPrefix() {
    return `ascend.outbox.${this.uid}.`;
  }

  private keepLocal(state: AppState) {
    try {
      const box: Outbox = { by: this.id, base: this.rev, baseAt: this.revAt, at: new Date().toISOString(), state };
      window.localStorage.setItem(this.boxPrefix + this.id, JSON.stringify(box));
    } catch {
      // Storage full or blocked: the server save still runs; only the reload safety net is missing.
    }
  }

  private dropLocal() {
    try {
      window.localStorage.removeItem(this.boxPrefix + this.id);
    } catch {
      /* nothing to do */
    }
  }

  /** Outboxes left by tabs that closed or reloaded before their save went through. */
  private readOutboxes(): { key: string; box: Outbox }[] {
    const out: { key: string; box: Outbox }[] = [];
    try {
      const ls = window.localStorage;
      for (let k = 0; k < ls.length; k++) {
        const key = ls.key(k);
        if (!key?.startsWith(this.boxPrefix)) continue;
        try {
          const box = JSON.parse(ls.getItem(key) ?? '') as Outbox;
          if (box && typeof box.by === 'string' && typeof box.base === 'number' && box.state) out.push({ key, box });
          else ls.removeItem(key);
        } catch {
          ls.removeItem(key);
        }
      }
    } catch {
      /* storage unavailable */
    }
    return out.sort((a, b) => (a.box.at < b.box.at ? -1 : 1));
  }

  /**
   * Puts back what a closed tab never got to save. If nothing else was saved since that tab
   * last looked (or the last save was its own), its copy is simply the newest. Otherwise the
   * changes it made after its last look are folded in by id, the same way as an old copy.
   */
  private restore(state: AppState | null, docBy: unknown): { state: AppState | null; restored: boolean } {
    let restored = false;
    for (const { key, box } of this.readOutboxes()) {
      let mine: AppState;
      try {
        mine = migrate(box.state);
      } catch {
        continue;
      }
      if (!state || (this.rev === box.base || docBy === box.by)) {
        if (!state || JSON.stringify(mine) !== JSON.stringify(state)) restored = true;
        state = mine;
      } else {
        const merged = absorbLegacy(state, mine, box.baseAt);
        if (merged.added) restored = true;
        state = merged.state;
      }
      // A live tab keeps its own outbox until its save lands; only abandoned ones are cleared.
      if (Date.now() - Date.parse(box.at) > ABANDONED_MS) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
    }
    return { state, restored };
  }

  async load(): Promise<unknown | null> {
    const [snap, old] = await Promise.all([getDoc(this.ref()), getDoc(this.ref(RETIRED))]);
    const oldData = old.data();
    const oldRaw = this.parse(oldData);
    if (!snap.exists()) {
      // First load on this version: carry everything over, and save it to the new document straight away.
      this.seen = this.savedAt(oldData);
      if (oldRaw) void this.save(migrate(oldRaw)).catch(() => {});
      return oldRaw;
    }
    const data = snap.data();
    this.rev = this.revOf(data);
    this.revAt = this.savedAt(data);
    this.seen = typeof data.legacySeen === 'string' ? data.legacySeen : '';
    const raw = this.parse(data);
    let state: AppState | null = raw ? migrate(raw) : null;
    let changed = false;

    if (state && oldRaw && this.savedAt(oldData) > this.seen) {
      const { state: next, added } = absorbLegacy(state, migrateLegacy(oldRaw), this.seen);
      this.seen = this.savedAt(oldData);
      if (added) {
        this.notice = staleNotice(added);
        state = next;
        changed = true;
      }
    }

    const back = this.restore(state, data.by);
    if (back.restored) {
      state = back.state;
      changed = true;
      this.notice = 'Restored changes that were still saving when the app was last closed.';
    }

    if (changed && state) void this.save(state).catch(() => {});
    return changed ? state : raw;
  }

  /** A message for the player from the last load, once. */
  takeNotice(): string | undefined {
    const n = this.notice;
    this.notice = undefined;
    return n;
  }

  hasUnsaved(): boolean {
    return !!this.pending || this.writing;
  }

  /** Rapid actions coalesce into one write; every caller learns how it went. */
  save(state: AppState): Promise<void> {
    this.pending = state;
    // The store saves again only after rebasing on whatever arrived, so this picture is current.
    this.held = false;
    this.keepLocal(state);
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.write(), this.delayMs);
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  /**
   * Another device's save arrived. Whatever is queued was made before it, so it is dropped
   * (never written over that save); the store rebases its changes on it and saves again, and
   * the callers still waiting learn the outcome from that save.
   */
  private hold() {
    if (!this.pending) return;
    this.pending = null;
    this.held = true;
    window.clearTimeout(this.timer);
  }

  flush(): void {
    window.clearTimeout(this.timer);
    void this.write();
  }

  private async write() {
    // One save at a time: the one in flight starts the next when it ends.
    if (this.writing || this.held || !this.pending) return;
    const state = this.pending;
    const waiters = this.waiters;
    this.pending = null;
    this.waiters = [];
    this.writing = true;
    // Fixed before the request: a save from another device arriving meanwhile must not make this one look current.
    const base = this.rev;
    const at = new Date().toISOString();
    const json = JSON.stringify(state);
    try {
      const rev = await runTransaction(db, async (tx) => {
        const data = (await tx.get(this.ref())).data();
        const remoteRev = this.revOf(data);
        // This very save already landed (its reply got lost and the transaction retried).
        if (data?.by === this.id && data?.savedAt === at) return remoteRev;
        // Someone else saved since this tab last looked: never write over it.
        if (remoteRev !== base) throw new ConflictError(this.parse(data), remoteRev);
        tx.set(this.ref(), { json, savedAt: at, rev: remoteRev + 1, by: this.id, legacySeen: this.seen });
        return remoteRev + 1;
      });
      if (rev > this.rev) {
        this.rev = rev;
        this.revAt = at;
      }
      if (!this.pending) this.dropLocal();
      waiters.forEach((w) => w.resolve());
    } catch (e) {
      if (e instanceof ConflictError) {
        // Already seen through the live feed? Then the store has rebased and re-saved; nothing to hold.
        e.fresh = e.rev > this.rev;
        if (e.fresh) {
          this.rev = e.rev;
          this.hold();
        }
        waiters.forEach((w) => w.reject(e));
      } else {
        waiters.forEach((w) => w.reject(new Error(describe(e))));
      }
    } finally {
      this.writing = false;
      if (this.pending && !this.held) {
        window.clearTimeout(this.timer);
        void this.write();
      }
    }
  }

  /**
   * Another tab or device saved: hand over what it saved (our own saves are skipped). An old
   * copy of the app saving to the retired document is handed over separately, to fold in.
   */
  subscribe(onRemote: (raw: unknown) => void, onRetired?: (raw: unknown, since: string) => void): () => void {
    const stop = onSnapshot(
      this.ref(),
      (snap) => {
        const data = snap.data();
        if (!data || data.by === this.id) return;
        const rev = this.revOf(data);
        if (rev <= this.rev) return;
        this.rev = rev;
        this.revAt = this.savedAt(data);
        this.hold();
        onRemote(this.parse(data));
      },
      (err) => console.warn('Live sync paused', err),
    );
    const stopRetired = onSnapshot(
      this.ref(RETIRED),
      (snap) => {
        const data = snap.data();
        const at = this.savedAt(data);
        if (!onRetired || !data || at <= this.seen) return;
        const since = this.seen;
        this.seen = at;
        onRetired(this.parse(data), since);
      },
      (err) => console.warn('Live sync paused', err),
    );
    return () => {
      stop();
      stopRetired();
    };
  }

  async clear(): Promise<void> {
    await setDoc(this.ref(), { json: null, savedAt: new Date().toISOString(), rev: this.rev + 1, by: this.id, legacySeen: this.seen });
    this.rev += 1;
    this.dropLocal();
  }
}

/** The real reason a save failed, so a rules or network problem is visible rather than generic. */
function describe(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  const msg = e instanceof Error ? e.message : '';
  if (/offline|network|unavailable/i.test(code + msg)) return 'You appear to be offline.';
  if (/permission/i.test(code)) return 'Your account isn’t allowed to save this (permission denied).';
  return `Could not sync to your account${code ? ` (${code})` : ''}.`;
}
