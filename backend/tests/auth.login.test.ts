import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { pool } from '../src/db';

const app = createApp();
const PASSWORD = 'Sup3rSecret!';
let n = 0;

async function registerUser(password = PASSWORD) {
  const email = `login${Date.now()}_${n++}@example.com`;
  const res = await request(app).post('/api/auth/register').send({ email, password });
  return { id: res.body.id as number, email };
}

afterAll(() => pool.end());

describe('POST /api/auth/login', () => {
  it('returns 200 with a signed token and the public user fields', async () => {
    const { id, email } = await registerUser();

    const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ token: expect.any(String), user: { id, email } });
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    expect(payload.sub).toBe(String(id));
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('matches the email case-insensitively', async () => {
    const { email } = await registerUser();

    const res = await request(app).post('/api/auth/login').send({ email: email.toUpperCase(), password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
  });

  it('rejects a wrong password with 401', async () => {
    const { email } = await registerUser();

    const res = await request(app).post('/api/auth/login').send({ email, password: 'Wr0ngPassword!' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid email or password' });
  });

  it('rejects an unknown email with the same 401 response as a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid email or password' });
  });

  it('does not accept a password that only shares the first 72 bytes with the real one', async () => {
    const real = 'a'.repeat(72);
    const { email } = await registerUser(real);

    const res = await request(app).post('/api/auth/login').send({ email, password: real + 'extra' });

    expect(res.status).toBe(401);
  });

  it('rejects a missing password with 400', async () => {
    const { email } = await registerUser();

    const res = await request(app).post('/api/auth/login').send({ email });

    expect(res.status).toBe(400);
  });

  it('rejects a non-string password with 400', async () => {
    const { email } = await registerUser();

    const res = await request(app).post('/api/auth/login').send({ email, password: 12345678 });

    expect(res.status).toBe(400);
  });
});
