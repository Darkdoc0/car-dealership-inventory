import request from 'supertest';
import { createApp } from '../src/app';
import { bearer, createUserToken } from './helpers';
import { pool } from '../src/db';

const app = createApp();

afterEach(() => jest.restoreAllMocks());
afterAll(() => pool.end());

describe('error handling', () => {
  it('returns a JSON 400 for malformed JSON bodies', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{bad json');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it('returns a generic JSON 500 without leaking internals when the database fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(pool, 'query').mockImplementation(() => Promise.reject(new Error('connection to 10.0.0.5 refused')));

    const res = await request(app).post('/api/auth/register').send({ email: 'a@example.com', password: 'Sup3rSecret!' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it('turns a failing cars query into the generic JSON 500 (async handlers have no try/catch)', async () => {
    const token = await createUserToken(app, 'user');
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const realQuery = pool.query.bind(pool) as (...args: unknown[]) => Promise<unknown>;
    jest.spyOn(pool, 'query').mockImplementation(((sql: unknown, ...rest: unknown[]) =>
      typeof sql === 'string' && sql.includes('FROM cars')
        ? Promise.reject(new Error('connection to 10.0.0.5 refused'))
        : realQuery(sql, ...rest)) as never);

    const res = await request(app).get('/api/cars').set(bearer(token));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
