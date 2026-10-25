import request from 'supertest';
import type { Express } from 'express';
import { pool } from '../src/db';

let counter = 0;

/** A syntactically valid, unique 17-character VIN (no I, O or Q). */
export function uniqueVin(): string {
  const stamp = String(Date.now() % 1e10).padStart(10, '0');
  return `TST${stamp}${String(counter++ % 1e4).padStart(4, '0')}`;
}

export function carPayload(overrides: Record<string, unknown> = {}) {
  return {
    vin: uniqueVin(),
    make: 'Toyota',
    model: 'Corolla',
    year: 2021,
    mileage: 42000,
    priceCents: 1850000,
    category: 'sedan',
    quantity: 3,
    ...overrides,
  };
}

/** Registers a user, optionally promotes them to admin, and returns a login token. */
export async function createUserToken(app: Express, role: 'user' | 'admin') {
  const email = `${role}${Date.now()}_${counter++}@example.com`;
  const password = 'Sup3rSecret!';
  const reg = await request(app).post('/api/auth/register').send({ email, password });
  if (role === 'admin') await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [reg.body.id]);
  const login = await request(app).post('/api/auth/login').send({ email, password });
  return login.body.token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
