import type { Pool } from 'pg';
import type { CarInput } from './cars/schemas';
import type { PasswordHasher } from './passwordHasher';

export interface DemoLogin {
  email: string;
  password: string;
}

export const DEMO_ADMIN: DemoLogin = { email: '', password: '' };
export const DEMO_USER: DemoLogin = { email: '', password: '' };
export const DEMO_CARS: CarInput[] = [];

/** Why the database must not be reset, or null when it is safe to. */
export function resetGuardProblem(_nodeEnv: string | undefined, _databaseName: string): string | null {
  throw new Error('not implemented');
}

/** Wipes the database behind `pool`, re-applies the migrations, then inserts the demo users and vehicles. */
export async function seedDemoData(_pool: Pool, _hasher?: PasswordHasher): Promise<void> {
  throw new Error('not implemented');
}
