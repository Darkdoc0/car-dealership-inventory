import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { readAdminCredentials, seedAdmin } from '../src/seedAdmin';

const app = createApp();
const PASSWORD = 'Adm1nSecret!';
let n = 0;
const uniqueEmail = () => `seed${Date.now()}_${n++}@example.com`;

const login = (email: string, password: string) => request(app).post('/api/auth/login').send({ email, password });
const roleOf = async (email: string) =>
  (await pool.query('SELECT role FROM users WHERE lower(email) = lower($1)', [email])).rows.map((r) => r.role);

afterAll(() => pool.end());

describe('seedAdmin', () => {
  it('creates an admin who can log in and reach admin routes', async () => {
    const email = uniqueEmail();

    const created = await seedAdmin(pool, { email, password: PASSWORD });

    expect(created.email).toBe(email);
    expect(await roleOf(email)).toEqual(['admin']);
    const res = await login(email, PASSWORD);
    expect(res.status).toBe(200);
    const users = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${res.body.token}`);
    expect(users.status).toBe(200);
  });

  it('stores a hash, never the plaintext password', async () => {
    const email = uniqueEmail();
    await seedAdmin(pool, { email, password: PASSWORD });

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);

    expect(rows[0].password_hash).not.toContain(PASSWORD);
  });

  it('is idempotent: running twice keeps one admin and applies the latest password', async () => {
    const email = uniqueEmail();
    const first = await seedAdmin(pool, { email, password: PASSWORD });

    const second = await seedAdmin(pool, { email, password: 'Rotat3dSecret!' });

    expect(second.id).toBe(first.id);
    expect(await roleOf(email)).toEqual(['admin']);
    expect((await login(email, 'Rotat3dSecret!')).status).toBe(200);
    expect((await login(email, PASSWORD)).status).toBe(401);
  });

  it('promotes an existing regular user instead of creating a duplicate', async () => {
    const email = uniqueEmail();
    const reg = await request(app).post('/api/auth/register').send({ email, password: 'Regul4rSecret!' });

    const seeded = await seedAdmin(pool, { email: email.toUpperCase(), password: PASSWORD });

    expect(seeded.id).toBe(reg.body.id);
    expect(await roleOf(email)).toEqual(['admin']);
  });

  it('rejects a weak password and creates no user', async () => {
    const email = uniqueEmail();

    await expect(seedAdmin(pool, { email, password: 'short' })).rejects.toThrow(/password/i);

    expect(await roleOf(email)).toEqual([]);
  });

  it('rejects an invalid email', async () => {
    await expect(seedAdmin(pool, { email: 'not-an-email', password: PASSWORD })).rejects.toThrow(/email/i);
  });
});

describe('readAdminCredentials', () => {
  it('reads ADMIN_EMAIL and ADMIN_PASSWORD from the given environment', () => {
    expect(readAdminCredentials({ ADMIN_EMAIL: 'boss@example.com', ADMIN_PASSWORD: PASSWORD })).toEqual({
      email: 'boss@example.com',
      password: PASSWORD,
    });
  });

  it.each([
    ['ADMIN_EMAIL', { ADMIN_PASSWORD: PASSWORD }],
    ['ADMIN_PASSWORD', { ADMIN_EMAIL: 'boss@example.com' }],
  ])('throws naming %s when it is missing', (name, env) => {
    expect(() => readAdminCredentials(env)).toThrow(name);
  });
});
