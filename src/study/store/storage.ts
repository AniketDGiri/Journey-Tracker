import type { AppState } from '../domain/types';

/**
 * Persistence boundary. The app only talks to `StorageAdapter`, so swapping
 * localStorage for IndexedDB or a REST backend later is a one-file change.
 */
export interface StorageAdapter {
  load(): Promise<unknown | null>;
  /** Rejects with `ConflictError` when another tab or device saved since this one last looked. */
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
  /** Writes anything still waiting, now — the page is being hidden or closed. */
  flush?(): void;
  /**
   * Calls `onRemote` with the saved state whenever another tab or device saves, and `onRetired`
   * when an old copy of the app saves to the retired document (entries after `since` are new).
   * Returns the unsubscribe.
   */
  subscribe?(onRemote: (raw: unknown) => void, onRetired?: (raw: unknown, since: string) => void): () => void;
  /** A message for the player from the last load, once. */
  takeNotice?(): string | undefined;
}

/** Another tab or device saved first: `remote` is what it saved, at revision `rev`. */
export class ConflictError extends Error {
  constructor(
    public remote: unknown,
    public rev: number,
  ) {
    super('Changed on another device.');
  }
}

const KEY = 'ascend.state.v1';

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private key = KEY) {}

  async load(): Promise<unknown | null> {
    const raw = window.localStorage.getItem(this.key);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async save(state: AppState): Promise<void> {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
    } catch (e) {
      const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
      throw new Error(quota ? 'Browser storage is full. Export a backup, then clear old data.' : 'Could not write to browser storage.');
    }
  }

  async clear(): Promise<void> {
    window.localStorage.removeItem(this.key);
  }
}

export class MemoryAdapter implements StorageAdapter {
  private data: AppState | null = null;
  async load() {
    return this.data ? structuredClone(this.data) : null;
  }
  async save(state: AppState) {
    this.data = structuredClone(state);
  }
  async clear() {
    this.data = null;
  }
}
