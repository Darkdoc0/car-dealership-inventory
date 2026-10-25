export interface TokenStore {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

const STORAGE_KEY = 'car-dealership.token';

/**
 * Keeps the session token in the given storage (localStorage in the app). If the storage is unavailable
 * (private mode, blocked site data) the token lives in memory so the current tab still works.
 */
export function createTokenStore(storage: Storage): TokenStore {
  let memoryToken: string | null = null;

  return {
    get() {
      try {
        return storage.getItem(STORAGE_KEY);
      } catch {
        return memoryToken;
      }
    },
    set(token) {
      memoryToken = token;
      try {
        storage.setItem(STORAGE_KEY, token);
      } catch {
        // kept in memory only
      }
    },
    clear() {
      memoryToken = null;
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        // nothing stored to remove
      }
    },
  };
}
