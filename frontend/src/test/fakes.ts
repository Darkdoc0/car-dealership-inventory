import type { ApiClient } from '../api/client';
import type { Car, CarListResult, CurrentUser } from '../api/types';
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
    // Screens that list cars get an empty page unless a test says otherwise.
    listCars: vi.fn<ApiClient['listCars']>().mockResolvedValue({ items: [], total: 0, limit: 12, offset: 0 }),
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

let nextCarId = 1;

export function makeCar(overrides: Partial<Car> = {}): Car {
  const id = overrides.id ?? nextCarId++;
  return {
    id,
    vin: `TST${String(id).padStart(14, '0')}`,
    make: 'Toyota',
    model: 'Corolla',
    year: 2021,
    mileage: 42000,
    price: 18500,
    priceCents: 1850000,
    category: 'sedan',
    quantity: 3,
    status: 'available',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makePage(items: Car[], total = items.length, limit = 12, offset = 0): CarListResult {
  return { items, total, limit, offset };
}
