import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { pool } from '../src/db';

const app = createApp();
const PASSWORD = 'Sup3rSecret!';
let n = 0;

async function createUser(role: 'user' | 'admin') {
  const email = `${role}${Date.now()}_${n++}@example.com`;
  const reg = await request(app).post('/api/auth/register').send({ email, password: PASSWORD });
  if (role === 'admin') await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [reg.body.id]);
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { id: reg.body.id as number, email, token: login.body.token as string };
}

const listUsers = (token?: string) => {
  const req = request(app).get('/api/admin/users');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

afterAll(() => pool.end());

describe('role column', () => {
  it('defaults new registrations to the user role', async () => {
    const { token } = await createUser('user');

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.body.role).toBe('user');
  });

  it('ignores a role supplied at registration', async () => {
    const email = `sneaky${Date.now()}@example.com`;

    const res = await request(app).post('/api/auth/register').send({ email, password: PASSWORD, role: 'admin' });

    expect(res.status).toBe(201);
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [res.body.id]);
    expect(rows[0].role).toBe('user');
  });

  it('rejects a role outside user/admin at the database level', async () => {
    const { id } = await createUser('user');

    await expect(pool.query("UPDATE users SET role = 'superuser' WHERE id = $1", [id])).rejects.toThrow();
  });
});

describe('GET /api/admin/users', () => {
  it('rejects a request without a token with 401', async () => {
    const res = await listUsers();

    expect(res.status).toBe(401);
  });

  it('rejects an invalid token with 401', async () => {
    expect((await listUsers('not.a.jwt')).status).toBe(401);
  });

  it('rejects an expired token with 401', async () => {
    const { id } = await createUser('admin');
    const expired = jwt.sign({}, process.env.JWT_SECRET as string, { subject: String(id), expiresIn: -10 });

    expect((await listUsers(expired)).status).toBe(401);
  });

  it('rejects an authenticated non-admin with 403', async () => {
    const { token } = await createUser('user');

    const res = await listUsers(token);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden' });
  });

  it('lets an admin list users without exposing password hashes', async () => {
    const admin = await createUser('admin');

    const res = await listUsers(admin.token);

    expect(res.status).toBe(200);
    expect(res.body).toContainEqual({ id: admin.id, email: admin.email, role: 'admin' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('applies a demotion immediately, even to a token issued while the user was admin', async () => {
    const admin = await createUser('admin');
    await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [admin.id]);

    expect((await listUsers(admin.token)).status).toBe(403);
  });
});
