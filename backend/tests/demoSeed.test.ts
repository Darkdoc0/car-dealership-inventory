import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '../src/app';
import { runDemoSeed } from '../src/bootstrap';
import { CAR_CATEGORIES, carInputSchema } from '../src/cars/schemas';
import { DEMO_ADMIN, DEMO_CARS, DEMO_USER, resetGuardProblem, seedDemoData } from '../src/demoData';
import { pool } from '../src/db';
import { createBcryptHasher } from '../src/passwordHasher';

// The documented logins. If these change, the README must change too (checked below).
const ADMIN = { email: 'admin@dealership.test', password: 'Admin-Passw0rd!' };
const SHOPPER = { email: 'shopper@dealership.test', password: 'Shopper-Passw0rd!' };

const hasher = createBcryptHasher(4); // low cost keeps the tests fast
const scalar = async (sql: string, params: unknown[] = []) => (await pool.query(sql, params)).rows[0].n as number;
const login = (who: { email: string; password: string }) => request(createApp()).post('/api/auth/login').send(who);

afterAll(() => pool.end());

describe('the demo data definition', () => {
  it('publishes the documented admin and shopper logins', () => {
    expect(DEMO_ADMIN).toEqual(ADMIN);
    expect(DEMO_USER).toEqual(SHOPPER);
  });

  it('lists those logins in the README, so the documentation cannot drift from the code', () => {
    const readme = fs.readFileSync(path.resolve(__dirname, '../../README.md'), 'utf8');

    for (const login of [ADMIN, SHOPPER]) {
      expect(readme).toContain(login.email);
      expect(readme).toContain(login.password);
    }
  });

  it('has 15 vehicles that all pass the same validation as the API', () => {
    expect(DEMO_CARS).toHaveLength(15);
    for (const car of DEMO_CARS) expect(() => carInputSchema.parse(car)).not.toThrow();
    expect(new Set(DEMO_CARS.map((c) => c.vin)).size).toBe(15);
  });

  it('spans every category', () => {
    expect(new Set(DEMO_CARS.map((c) => c.category))).toEqual(new Set(CAR_CATEGORIES));
  });

  it('has exactly three vehicles out of stock, marked sold like a real sell-out', () => {
    const empty = DEMO_CARS.filter((c) => c.quantity === 0);

    expect(empty).toHaveLength(3);
    expect(empty.every((c) => c.status === 'sold')).toBe(true);
  });

  it('includes a reserved vehicle with stock, and every other vehicle is available with stock', () => {
    const inStock = DEMO_CARS.filter((c) => c.quantity > 0);

    expect(inStock.filter((c) => c.status === 'reserved').length).toBeGreaterThanOrEqual(1);
    expect(inStock.filter((c) => c.status === 'available').length).toBeGreaterThanOrEqual(8);
  });
});

describe('resetGuardProblem', () => {
  it('allows development and test databases', () => {
    expect(resetGuardProblem(undefined, 'car_dealership')).toBeNull();
    expect(resetGuardProblem('development', 'car_dealership')).toBeNull();
    expect(resetGuardProblem('test', 'car_dealership_test')).toBeNull();
  });

  it('refuses when NODE_ENV is production', () => {
    expect(resetGuardProblem('production', 'car_dealership')).toMatch(/production/i);
  });

  it.each([['car_dealership_prod'], ['production'], ['PROD_db'], ['prd_inventory_live']])(
    'refuses the database name %s',
    (name) => {
      expect(resetGuardProblem('development', name)).toMatch(/production/i);
    },
  );
});

describe('seedDemoData', () => {
  beforeAll(() => seedDemoData(pool, hasher));

  it('creates one admin and one normal user, and nobody else', async () => {
    const { rows } = await pool.query('SELECT email, role FROM users ORDER BY id');

    expect(rows).toEqual([
      { email: ADMIN.email, role: 'admin' },
      { email: SHOPPER.email, role: 'user' },
    ]);
  });

  it('stores password hashes, never the passwords', async () => {
    const { rows } = await pool.query('SELECT password_hash FROM users');

    for (const row of rows) {
      expect(row.password_hash).toMatch(/^\$2[aby]\$/);
      expect(row.password_hash).not.toContain('Passw0rd');
    }
  });

  it('inserts the 15 vehicles, three of them at quantity 0', async () => {
    expect(await scalar('SELECT count(*)::int AS n FROM cars')).toBe(15);
    expect(await scalar('SELECT count(*)::int AS n FROM cars WHERE quantity = 0')).toBe(3);
    expect(await scalar('SELECT count(DISTINCT category)::int AS n FROM cars')).toBe(CAR_CATEGORIES.length);
  });

  it('lets the admin sign in and reach admin-only data', async () => {
    const res = await login(ADMIN);
    expect(res.status).toBe(200);

    const users = await request(createApp()).get('/api/admin/users').set('Authorization', `Bearer ${res.body.token}`);
    expect(users.status).toBe(200);
    expect(users.body).toHaveLength(2);
  });

  it('lets the shopper sign in and browse and buy, but not reach admin data', async () => {
    const res = await login(SHOPPER);
    expect(res.status).toBe(200);
    const auth = { Authorization: `Bearer ${res.body.token}` };

    const list = await request(createApp()).get('/api/cars?limit=100').set(auth);
    expect(list.body.total).toBe(15);
    const available = list.body.items.find((c: { status: string; quantity: number }) => c.status === 'available' && c.quantity > 0);
    expect((await request(createApp()).post(`/api/cars/${available.id}/purchase`).set(auth)).status).toBe(200);
    expect((await request(createApp()).get('/api/admin/users').set(auth)).status).toBe(403);
  });

  it('resets the database: anything that was there is gone and running it again gives the same result', async () => {
    await pool.query("INSERT INTO users (email, password_hash) VALUES ('stray@example.com', 'x')");
    await pool.query(
      `INSERT INTO cars (vin, make, model, year, mileage, price_cents, category, quantity)
       VALUES ('STRAY000000000001', 'Stray', 'Car', 2020, 1, 1, 'sedan', 1)`,
    );

    await seedDemoData(pool, hasher);

    expect(await scalar("SELECT count(*)::int AS n FROM users WHERE email = 'stray@example.com'")).toBe(0);
    expect(await scalar("SELECT count(*)::int AS n FROM cars WHERE make = 'Stray'")).toBe(0);
    expect(await scalar('SELECT count(*)::int AS n FROM users')).toBe(2);
    expect(await scalar('SELECT count(*)::int AS n FROM cars')).toBe(15);
    expect(await scalar('SELECT count(*)::int AS n FROM cars WHERE quantity = 0')).toBe(3);
  });

  it('leaves the schema fully migrated so the app works straight away', async () => {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");

    expect(tables.rows.map((r) => r.table_name)).toEqual(expect.arrayContaining(['users', 'cars', 'schema_migrations']));
  });
});

describe('runDemoSeed', () => {
  it('seeds, and reports the database it reset and the logins to use', async () => {
    const log = jest.fn();

    await runDemoSeed(pool, { NODE_ENV: 'development' }, log);

    const output = log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('car_dealership_test');
    expect(output).toContain(ADMIN.email);
    expect(output).toContain(SHOPPER.email);
    expect(await scalar('SELECT count(*)::int AS n FROM cars')).toBe(15);
  });

  it('refuses in production and leaves the data untouched', async () => {
    await pool.query("INSERT INTO users (email, password_hash) VALUES ('keepme@example.com', 'x')");
    const log = jest.fn();

    await expect(runDemoSeed(pool, { NODE_ENV: 'production' }, log)).rejects.toThrow(/production/i);

    expect(await scalar("SELECT count(*)::int AS n FROM users WHERE email = 'keepme@example.com'")).toBe(1);
    expect(log).not.toHaveBeenCalled();
  });
});
