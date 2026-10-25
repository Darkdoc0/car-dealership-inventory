import type { ApiClient } from '../api/client';
import type { CurrentUser } from '../api/types';
import type { Session } from '../auth/session';
import type { TokenStore } from '../auth/tokenStorage';

export function createMemoryTokenStore(initial: string | null = null): TokenStore {
  let token = initial;
  return {
    get: () => token,
    set: (value) => {
      token = value;
    },
    clear: () => {
      token = null;
    },
  };
}

export type FakeApi = { [K in keyof ApiClient]: ReturnType<typeof vi.fn<ApiClient[K]>> };

export function createFakeApi(): FakeApi {
  return {
    register: vi.fn<ApiClient['register']>(),
    login: vi.fn<ApiClient['login']>(),
    me: vi.fn<ApiClient['me']>(),
    listCars: vi.fn<ApiClient['listCars']>(),
    getCar: vi.fn<ApiClient['getCar']>(),
    createCar: vi.fn<ApiClient['createCar']>(),
    updateCar: vi.fn<ApiClient['updateCar']>(),
    deleteCar: vi.fn<ApiClient['deleteCar']>(),
    purchaseCar: vi.fn<ApiClient['purchaseCar']>(),
    restockCar: vi.fn<ApiClient['restockCar']>(),
  };
}

export interface FakeSession extends Session {
  api: FakeApi;
  /** Simulates the API rejecting an authenticated request with 401. */
  expire(): void;
}

export function createFakeSession(options: { token?: string | null; user?: CurrentUser } = {}): FakeSession {
  const api = createFakeApi();
  const listeners = new Set<() => void>();
  if (options.user) api.me.mockResolvedValue(options.user);
  return {
    api,
    store: createMemoryTokenStore(options.token ?? null),
    onExpired(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    expire: () => listeners.forEach((l) => l()),
  };
}

export const member: CurrentUser = { id: 1, email: 'member@example.com', role: 'user' };
export const admin: CurrentUser = { id: 2, email: 'admin@example.com', role: 'admin' };
