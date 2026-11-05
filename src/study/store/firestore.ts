import { doc, getDoc, onSnapshot, runTransaction, setDoc, type DocumentData } from 'firebase/firestore';
import { db } from '../../firebase';
import type { AppState } from '../domain/types';
import { ConflictError, type StorageAdapter } from './storage';

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
 */
export class FirestoreAdapter implements StorageAdapter {
  private pending: AppState | null = null;
  private timer: number | undefined;
  private waiters: { resolve: () => void; reject: (e: unknown) => void }[] = [];
  /** The revision of the document this tab last saw or saved. */
  private rev = 0;
  /** Tells this tab's own saves apart from another tab's in the live feed. */
  private readonly id = Math.random().toString(36).slice(2);

  constructor(
    private uid: string,
    private delayMs = 500,
  ) {}

  private ref() {
    return doc(db, 'users', this.uid, 'appData', 'ascend');
  }

  private parse(data: DocumentData | undefined): unknown | null {
    const json = data?.json;
    return typeof json === 'string' ? JSON.parse(json) : null;
  }

  private revOf(data: DocumentData | undefined): number {
    return typeof data?.rev === 'number' ? data.rev : 0;
  }

  async load(): Promise<unknown | null> {
    const snap = await getDoc(this.ref());
    if (!snap.exists()) return null;
    this.rev = this.revOf(snap.data());
    return this.parse(snap.data());
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
        tx.set(this.ref(), { json: JSON.stringify(state), savedAt: new Date().toISOString(), rev: remoteRev + 1, by: this.id });
        return remoteRev + 1;
      });
      waiters.forEach((w) => w.resolve());
    } catch (e) {
      if (e instanceof ConflictError) {
        this.rev = e.rev;
        waiters.forEach((w) => w.reject(e));
        return;
      }
      const err = new Error(e instanceof Error && /offline|network|unavailable/i.test(e.message) ? 'You appear to be offline.' : 'Could not sync to your account.');
      waiters.forEach((w) => w.reject(err));
    }
  }

  /** Another tab or device saved: hand over what it saved. Our own saves are skipped. */
  subscribe(onRemote: (raw: unknown) => void): () => void {
    return onSnapshot(
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
  }

  async clear(): Promise<void> {
    await setDoc(this.ref(), { json: null, savedAt: new Date().toISOString(), rev: this.rev + 1, by: this.id });
    this.rev += 1;
  }
}
