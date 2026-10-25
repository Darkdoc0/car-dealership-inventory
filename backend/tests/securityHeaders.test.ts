import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';

const app = createApp();

afterAll(() => pool.end());

describe('security headers', () => {
  it('does not advertise the framework', async () => {
    const res = await request(app).get('/api/cars');

    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('tells browsers not to sniff content types or allow framing', async () => {
    const res = await request(app).get('/api/cars');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('asks browsers to keep using HTTPS', async () => {
    const res = await request(app).get('/api/cars');

    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
  });

  it('sets them on error responses too, not only on successful ones', async () => {
    const unknown = await request(app).get('/api/no-such-route');
    const malformed = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');

    for (const res of [unknown, malformed]) {
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    }
  });
});
