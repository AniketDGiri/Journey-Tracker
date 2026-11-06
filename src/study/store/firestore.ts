import { doc, getDoc, onSnapshot, runTransaction, setDoc, type DocumentData } from 'firebase/firestore';
import { db } from '../../firebase';
import type { AppState } from '../domain/types';
import { ConflictError, type StorageAdapter } from './storage';
import { migrate } from './schema';
import { absorbLegacy, staleNotice } from './sync';

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
 * Copies of the app opened before that existed (a phone tab, a tab never
 * reloaded) still overwrite `appData/ascend` with whatever stale copy they hold.
 * So state now lives in `appData/ascend2`, which they don't know about. On the
 * first load it starts from `appData/ascend`; after that, anything new an old
 * copy saves there is folded in by id (store/sync `absorbLegacy`) and nothing
 * it holds can overwrite this document.
 */
const DOC = 'ascend2';
const RETIRED = 'ascend';

export class FirestoreAdapter implements StorageAdapter {
  private pending: AppState | null = null;
  private timer: number | undefined;
  private waiters: { resolve: () => void; reject: (e: unknown) => void }[] = [];
  /** The revision of the document this tab last saw or saved. */
  private rev = 0;
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
    this.seen = typeof data.legacySeen === 'string' ? data.legacySeen : '';
    const raw = this.parse(data);
    if (!raw || !oldRaw || this.savedAt(oldData) <= this.seen) return raw;
    const { state, added } = absorbLegacy(migrate(raw), migrate(oldRaw), this.seen);
    this.seen = this.savedAt(oldData);
    if (!added) return raw;
    this.notice = staleNotice(added);
    void this.save(state).catch(() => {});
    return state;
  }

  /** A message for the player from the last load, once. */
  takeNotice(): string | undefined {
    const n = this.notice;
    this.notice = undefined;
    return n;
  }

  /** Rapid actions coalesce into one write; every caller learns how it went. */
  save(state: AppState): Promise<void> {
    this.pending = state;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.write(), this.delayMs);
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  flush(): void {
    window.clearTimeout(this.timer);
    void this.write();
  }

  private async write() {
    const state = this.pending;
    const waiters = this.waiters;
    this.pending = null;
    this.waiters = [];
    if (!state) return;
    try {
      this.rev = await runTransaction(db, async (tx) => {
        const data = (await tx.get(this.ref())).data();
        const remoteRev = this.revOf(data);
        // Someone else saved since this tab last looked: never write over it. (A newer revision
        // of our own — an earlier save whose reply got lost — is fine to build on.)
        if (remoteRev !== this.rev && data?.by !== this.id) throw new ConflictError(this.parse(data), remoteRev);
        tx.set(this.ref(), { json: JSON.stringify(state), savedAt: new Date().toISOString(), rev: remoteRev + 1, by: this.id, legacySeen: this.seen });
        return remoteRev + 1;
      });
      waiters.forEach((w) => w.resolve());
    } catch (e) {
      if (e instanceof ConflictError) {
        this.rev = e.rev;
        waiters.forEach((w) => w.reject(e));
        return;
      }
      waiters.forEach((w) => w.reject(new Error(describe(e))));
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
