import type { Pool } from 'pg';
import { createCarRepository } from './cars/carRepository';
import type { CarInput } from './cars/schemas';
import { migrate } from './migrate';
import { createBcryptHasher, type PasswordHasher } from './passwordHasher';
import { seedAdmin } from './seedAdmin';
import { createUserRepository } from './users/userRepository';

export interface DemoLogin {
  email: string;
  password: string;
}

/**
 * Logins created by `npm run seed`. They are public (they are in the README) and meant for local development
 * only: the seed refuses to run in production, so these accounts never exist there.
 */
export const DEMO_ADMIN: DemoLogin = { email: 'admin@dealership.test', password: 'Admin-Passw0rd!' };
export const DEMO_USER: DemoLogin = { email: 'shopper@dealership.test', password: 'Shopper-Passw0rd!' };

/** Obviously fake, but valid, VINs: 'DMX' plus a 14-digit counter (VINs cannot contain I, O or Q). */
const vin = (n: number) => `DMX${String(n).padStart(14, '0')}`;

type DemoCar = Omit<CarInput, 'vin'>;

const dollars = (amount: number) => Math.round(amount * 100);

// 15 vehicles in every category. Three are sold out (quantity 0, status sold, as a real sell-out leaves them)
// and one is reserved, so the shop shows each state of the Buy button.
const CARS: DemoCar[] = [
  { make: 'Toyota', model: 'Corolla', year: 2021, mileage: 42000, priceCents: dollars(18500), category: 'sedan', quantity: 4, status: 'available' },
  { make: 'Honda', model: 'Civic', year: 2022, mileage: 18500, priceCents: dollars(22900), category: 'sedan', quantity: 2, status: 'available' },
  { make: 'Tesla', model: 'Model 3', year: 2023, mileage: 9800, priceCents: dollars(38750), category: 'sedan', quantity: 1, status: 'available' },
  { make: 'Toyota', model: 'RAV4', year: 2022, mileage: 24300, priceCents: dollars(31200), category: 'suv', quantity: 5, status: 'available' },
  { make: 'Subaru', model: 'Outback', year: 2021, mileage: 36100, priceCents: dollars(27450), category: 'suv', quantity: 3, status: 'reserved' },
  { make: 'Honda', model: 'CR-V', year: 2023, mileage: 12000, priceCents: dollars(34900), category: 'suv', quantity: 0, status: 'sold' },
  { make: 'Ford', model: 'F-150', year: 2020, mileage: 58700, priceCents: dollars(36800), category: 'truck', quantity: 2, status: 'available' },
  { make: 'Chevrolet', model: 'Silverado', year: 2019, mileage: 71200, priceCents: dollars(29950), category: 'truck', quantity: 0, status: 'sold' },
  { make: 'Mazda', model: 'Mazda3', year: 2022, mileage: 15600, priceCents: dollars(21300), category: 'hatchback', quantity: 3, status: 'available' },
  { make: 'Volkswagen', model: 'Golf', year: 2021, mileage: 29400, priceCents: dollars(19800), category: 'hatchback', quantity: 2, status: 'available' },
  { make: 'BMW', model: 'M4', year: 2022, mileage: 11200, priceCents: dollars(74900), category: 'coupe', quantity: 1, status: 'available' },
  { make: 'Ford', model: 'Mustang', year: 2020, mileage: 33900, priceCents: dollars(32500), category: 'coupe', quantity: 0, status: 'sold' },
  { make: 'Mazda', model: 'MX-5 Miata', year: 2019, mileage: 22800, priceCents: dollars(26400), category: 'convertible', quantity: 1, status: 'available' },
  { make: 'Chrysler', model: 'Pacifica', year: 2021, mileage: 47300, priceCents: dollars(28700), category: 'van', quantity: 2, status: 'available' },
  { make: 'Ford', model: 'Transit', year: 2022, mileage: 19000, priceCents: dollars(41250), category: 'van', quantity: 4, status: 'available' },
];

export const DEMO_CARS: CarInput[] = CARS.map((car, i) => ({ ...car, vin: vin(i + 1) }));

/** Why the database must not be reset, or null when it is safe to. */
export function resetGuardProblem(nodeEnv: string | undefined, databaseName: string): string | null {
  if (nodeEnv === 'production') return 'Refusing to reset the database: NODE_ENV is production';
  if (/prod|prd/i.test(databaseName)) {
    return `Refusing to reset "${databaseName}": the name looks like a production database`;
  }
  return null;
}

/** Wipes the database behind `pool`, re-applies the migrations, then inserts the demo users and vehicles. */
export async function seedDemoData(pool: Pool, hasher: PasswordHasher = createBcryptHasher()): Promise<void> {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(pool);

  await seedAdmin(pool, DEMO_ADMIN, hasher);
  const user = await createUserRepository(pool).create(DEMO_USER.email, await hasher.hash(DEMO_USER.password));
  if (user.kind !== 'ok') throw new Error(`Could not create the demo user ${DEMO_USER.email}`);

  const cars = createCarRepository(pool);
  for (const car of DEMO_CARS) {
    const result = await cars.create(car);
    if (result.kind !== 'ok') throw new Error(`Could not create the demo vehicle ${car.vin}`);
  }
}
