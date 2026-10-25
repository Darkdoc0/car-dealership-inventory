import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { pool } from '../src/db';

const app = createApp();
const secret = () => process.env.JWT_SECRET as string;
let n = 0;

async function registerAndLogin() {
  const email = `me${Date.now()}_${n++}@example.com`;
  const password = 'Sup3rSecret!';
  const reg = await request(app).post('/api/auth/register').send({ email, password });
  const login = await request(app).post('/api/auth/login').send({ email, password });
  return { id: reg.body.id as number, email, token: login.body.token as string };
}

const me = (authorization?: string) => {
  const req = request(app).get('/api/auth/me');
  return authorization ? req.set('Authorization', authorization) : req;
};

afterAll(() => pool.end());

describe('requireAuth middleware (via GET /api/auth/me)', () => {
  it('returns the current user for a valid bearer token', async () => {
    const { id, email, token } = await registerAndLogin();

    const res = await me(`Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, email });
  });

  it('rejects a request without an Authorization header with 401', async () => {
    const res = await me();

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });

  it('rejects a non-Bearer scheme with 401', async () => {
    const { token } = await registerAndLogin();

    expect((await me(`Basic ${token}`)).status).toBe(401);
  });

  it('rejects a malformed token with 401', async () => {
    expect((await me('Bearer not.a.jwt')).status).toBe(401);
  });

  it('rejects a token signed with a different secret with 401', async () => {
    const { id } = await registerAndLogin();
    const forged = jwt.sign({}, 'some-other-secret', { subject: String(id), expiresIn: 60 });

    expect((await me(`Bearer ${forged}`)).status).toBe(401);
  });

  it('rejects an expired token with 401', async () => {
    const { id } = await registerAndLogin();
    const expired = jwt.sign({}, secret(), { subject: String(id), expiresIn: -10 });

    expect((await me(`Bearer ${expired}`)).status).toBe(401);
  });

  it('rejects an unsigned (alg: none) token with 401', async () => {
    const { id } = await registerAndLogin();
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: String(id) })}.`;

    expect((await me(`Bearer ${unsigned}`)).status).toBe(401);
  });

  it('rejects a valid token whose user no longer exists with 401', async () => {
    const { id, token } = await registerAndLogin();
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    expect((await me(`Bearer ${token}`)).status).toBe(401);
  });
});
