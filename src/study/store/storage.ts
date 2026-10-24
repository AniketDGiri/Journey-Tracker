import type { AppState } from '../domain/types';

/**
 * Persistence boundary. The app only talks to `StorageAdapter`, so swapping
 * localStorage for IndexedDB or a REST backend later is a one-file change.
 */
export interface StorageAdapter {
  load(): Promise<unknown | null>;
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
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
