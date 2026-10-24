import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { AppState } from '../domain/types';
import type { StorageAdapter } from './storage';

/**
 * Syncs study state to the signed-in user's account. It lives in its own
 * document, beside (never inside) the Personal/Time data in `appData/main`.
 * State is stored as one JSON string: Firestore rejects `undefined` values and
 * nested arrays, both of which the study state may contain.
 */
export class FirestoreAdapter implements StorageAdapter {
  private pending: AppState | null = null;
  private timer: number | undefined;
  private waiters: { resolve: () => void; reject: (e: unknown) => void }[] = [];

  constructor(
    private uid: string,
    private delayMs = 500,
  ) {}

  private ref() {
    return doc(db, 'users', this.uid, 'appData', 'ascend');
  }

  async load(): Promise<unknown | null> {
    const snap = await getDoc(this.ref());
    if (!snap.exists()) return null;
    const json = snap.data().json;
    return typeof json === 'string' ? JSON.parse(json) : null;
  }

  /** Rapid actions coalesce into one write; every caller learns how it went. */
  save(state: AppState): Promise<void> {
    this.pending = state;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), this.delayMs);
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  private async flush() {
    const state = this.pending;
    const waiters = this.waiters;
    this.pending = null;
    this.waiters = [];
    if (!state) return;
    try {
      await setDoc(this.ref(), { json: JSON.stringify(state), savedAt: new Date().toISOString() });
      waiters.forEach((w) => w.resolve());
    } catch (e) {
      const err = new Error(e instanceof Error && /offline|network/i.test(e.message) ? 'You appear to be offline.' : 'Could not sync to your account.');
      waiters.forEach((w) => w.reject(err));
    }
  }

  async clear(): Promise<void> {
    await setDoc(this.ref(), { json: null, savedAt: new Date().toISOString() });
  }
}
