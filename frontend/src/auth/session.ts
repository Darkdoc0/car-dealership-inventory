import { createApiClient, type ApiClient } from '../api/client';
import type { TokenStore } from './tokenStorage';

/** The API client wired to the stored token, plus a hook for "your session expired". */
export interface Session {
  api: ApiClient;
  store: TokenStore;
  /** Registers a listener for a rejected (401) authenticated request; returns an unsubscribe function. */
  onExpired(listener: () => void): () => void;
}

export function createSession(store: TokenStore, fetchFn: typeof fetch): Session {
  const listeners = new Set<() => void>();
  const api = createApiClient({
    fetch: fetchFn,
    getToken: () => store.get(),
    onUnauthorized: () => listeners.forEach((listener) => listener()),
  });
  return {
    api,
    store,
    onExpired(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
