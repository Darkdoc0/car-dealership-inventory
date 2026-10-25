import { ApiError } from './errors';
import type { Car, CarInput, CarListParams, CarListResult, CarUpdate, CurrentUser, LoginResult, PublicUser } from './types';

export interface ApiClient {
  register(email: string, password: string): Promise<PublicUser>;
  login(email: string, password: string): Promise<LoginResult>;
  me(): Promise<CurrentUser>;
  listCars(params?: CarListParams): Promise<CarListResult>;
  getCar(id: number): Promise<Car>;
  createCar(input: CarInput): Promise<Car>;
  updateCar(id: number, patch: CarUpdate): Promise<Car>;
  deleteCar(id: number): Promise<void>;
  purchaseCar(id: number, quantity?: number): Promise<Car>;
  restockCar(id: number, quantity: number): Promise<Car>;
}

export interface ApiClientOptions {
  fetch: typeof fetch;
  getToken: () => string | null;
  /** Called when a request that carried a token is rejected with 401 (expired or revoked session). */
  onUnauthorized: () => void;
}

const NETWORK_ERROR_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response.';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** The server's `{ error }` message, or a generic one when the body is not the expected JSON. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) return body.error;
  } catch {
    // not JSON: fall through to the generic message
  }
  return `Request failed (${res.status})`;
}

function queryString(params: CarListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function createApiClient({ fetch: fetchFn, getToken, onUnauthorized }: ApiClientOptions): ApiClient {
  async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    const token = getToken();
    const headers = new Headers();
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let res: Response;
    try {
      res = await fetchFn(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, NETWORK_ERROR_MESSAGE);
    }

    if (!res.ok) {
      if (res.status === 401 && token) onUnauthorized();
      throw new ApiError(res.status, await errorMessage(res));
    }
    if (res.status === 204) return undefined as T;
    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError(res.status, UNEXPECTED_RESPONSE_MESSAGE);
    }
  }

  return {
    register: (email, password) => request('POST', '/api/auth/register', { email, password }),
    login: (email, password) => request('POST', '/api/auth/login', { email, password }),
    me: () => request('GET', '/api/auth/me'),
    listCars: (params = {}) => request('GET', `/api/vehicles${queryString(params)}`),
    getCar: (id) => request('GET', `/api/vehicles/${id}`),
    createCar: (input) => request('POST', '/api/vehicles', input),
    updateCar: (id, patch) => request('PUT', `/api/vehicles/${id}`, patch),
    deleteCar: (id) => request('DELETE', `/api/vehicles/${id}`),
    purchaseCar: (id, quantity) => request('POST', `/api/vehicles/${id}/purchase`, quantity === undefined ? {} : { quantity }),
    restockCar: (id, quantity) => request('POST', `/api/vehicles/${id}/restock`, { quantity }),
  };
}
