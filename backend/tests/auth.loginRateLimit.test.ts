import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';

const PASSWORD = 'Sup3rSecret!';
let n = 0;

async function registerUser(app: ReturnType<typeof createApp>) {
  const email = `ratelimit${Date.now()}_${n++}@example.com`;
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD });
  return email;
}

const login = (app: ReturnType<typeof createApp>, email: string, password: string) =>
  request(app).post('/api/auth/login').send({ email, password });

afterAll(() => pool.end());

describe('POST /api/auth/login rate limiting', () => {
  it('answers 429 with a JSON error and Retry-After once failed attempts exceed the limit', async () => {
    const app = createApp({ loginMaxAttempts: 3 });
    const email = await registerUser(app);

    for (let i = 0; i < 3; i++) {
      expect((await login(app, email, 'Wr0ngPassword!')).status).toBe(401);
    }
    const res = await login(app, email, 'Wr0ngPassword!');

    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'Too many login attempts, try again later' });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('blocks even the correct password once the limit is reached', async () => {
    const app = createApp({ loginMaxAttempts: 2 });
    const email = await registerUser(app);
    await login(app, email, 'Wr0ngPassword!');
    await login(app, email, 'Wr0ngPassword!');

    const res = await login(app, email, PASSWORD);

    expect(res.status).toBe(429);
  });

  it('does not count successful logins toward the limit', async () => {
    const app = createApp({ loginMaxAttempts: 2 });
    const email = await registerUser(app);

    for (let i = 0; i < 5; i++) {
      expect((await login(app, email, PASSWORD)).status).toBe(200);
    }
  });

  it('does not rate limit registration', async () => {
    const app = createApp({ loginMaxAttempts: 1 });

    for (let i = 0; i < 3; i++) {
      expect((await registerUser(app)).length).toBeGreaterThan(0);
    }
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `ratelimit${Date.now()}_x@example.com`, password: PASSWORD });

    expect(res.status).toBe(201);
  });
});
