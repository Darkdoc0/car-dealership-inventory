import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { pool } from '../src/db';

const app = createApp();
let n = 0;
const uniqueEmail = () => `user${Date.now()}_${n++}@example.com`;

afterAll(() => pool.end());

describe('POST /api/auth/register', () => {
  it('creates a user and returns 201 with id and email only', async () => {
    const email = uniqueEmail();

    const res = await request(app).post('/api/auth/register').send({ email, password: 'Sup3rSecret!' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), email });
  });

  it('stores a bcrypt hash, never the plaintext password', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ email, password: 'Sup3rSecret!' });

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);

    expect(rows[0].password_hash).not.toBe('Sup3rSecret!');
    expect(await bcrypt.compare('Sup3rSecret!', rows[0].password_hash)).toBe(true);
  });

  it('rejects a malformed email with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'Sup3rSecret!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it('rejects a password shorter than 8 characters with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: uniqueEmail(), password: 'short' });

    expect(res.status).toBe(400);
  });

  it('rejects a missing body with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({});

    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email with 409, ignoring case', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ email, password: 'Sup3rSecret!' });

    const res = await request(app).post('/api/auth/register').send({ email: email.toUpperCase(), password: 'An0therPass!' });

    expect(res.status).toBe(409);
  });
});
