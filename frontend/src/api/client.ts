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

export function createApiClient(_options: ApiClientOptions): ApiClient {
  throw new Error('not implemented');
}
