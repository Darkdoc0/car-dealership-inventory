import type { APIRequestContext } from '@playwright/test';
import { ADMIN, API_URL } from './env';

let counter = 0;
const stamp = Date.now().toString(36);

/** A value that is unique across tests and runs, so tests sharing one database never collide. */
export const unique = (prefix: string) => `${prefix}${stamp}x${counter++}`;

export const uniqueEmail = () => `${unique('user')}@example.com`;

/** A valid, unique 17-character VIN (no I, O or Q). */
export function uniqueVin(): string {
  const digits = String(Date.now() % 1e9).padStart(9, '0') + String(counter++).padStart(5, '0');
  return `E2E${digits}`;
}

export interface CarSeed {
  vin?: string;
  make: string;
  model?: string;
  year?: number;
  mileage?: number;
  priceCents?: number;
  category?: string;
  quantity?: number;
  status?: string;
}

export const PASSWORD = 'E2eUser-Pass1!';

async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_URL}/api/auth/login`, { data: ADMIN });
  if (!res.ok()) throw new Error(`Admin login failed: ${res.status()}`);
  return (await res.json()).token;
}

/** Adds a vehicle straight through the API (as the seeded admin), bypassing the UI. */
export async function seedCar(request: APIRequestContext, seed: CarSeed) {
  const token = await adminToken(request);
  const res = await request.post(`${API_URL}/api/vehicles`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      vin: uniqueVin(),
      model: 'Testmodel',
      year: 2021,
      mileage: 42000,
      priceCents: 1850000,
      category: 'sedan',
      quantity: 3,
      ...seed,
    },
  });
  if (res.status() !== 201) throw new Error(`Seeding a car failed: ${res.status()} ${await res.text()}`);
  return (await res.json()) as { id: number; make: string; model: string; year: number; quantity: number };
}

export async function seedCars(request: APIRequestContext, make: string, count: number, seed: Partial<CarSeed> = {}) {
  const cars = [];
  for (let i = 1; i <= count; i++) cars.push(await seedCar(request, { make, model: `Model ${String(i).padStart(2, '0')}`, ...seed }));
  return cars;
}

/** Registers a regular user straight through the API. */
export async function registerUser(request: APIRequestContext, email = uniqueEmail()) {
  const res = await request.post(`${API_URL}/api/auth/register`, { data: { email, password: PASSWORD } });
  if (res.status() !== 201) throw new Error(`Registering failed: ${res.status()} ${await res.text()}`);
  return { email, password: PASSWORD };
}
