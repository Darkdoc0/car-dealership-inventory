import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { bearer, createUserToken, failQueriesMatching } from './helpers';

const app = createApp();
let userToken: string;
let adminToken: string;

beforeAll(async () => {
  userToken = await createUserToken(app, 'user');
  adminToken = await createUserToken(app, 'admin');
});
beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
afterEach(() => jest.restoreAllMocks());
afterAll(() => pool.end());

const GENERIC_500 = { error: 'Internal server error' };

describe('database failures surface as the generic JSON 500', () => {
  it('when requireAuth cannot load the user', async () => {
    failQueriesMatching('FROM users WHERE id');

    const res = await request(app).get('/api/auth/me').set(bearer(userToken));

    expect(res.status).toBe(500);
    expect(res.body).toEqual(GENERIC_500);
  });

  it('when login cannot look the user up', async () => {
    failQueriesMatching('lower(email)');

    const res = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'Sup3rSecret!' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual(GENERIC_500);
  });

  it('when the admin user list query fails', async () => {
    failQueriesMatching('ORDER BY id');

    const res = await request(app).get('/api/admin/users').set(bearer(adminToken));

    expect(res.status).toBe(500);
    expect(res.body).toEqual(GENERIC_500);
  });
});
