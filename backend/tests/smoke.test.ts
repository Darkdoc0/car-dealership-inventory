import request from 'supertest';
import { createApp } from '../src/app';

describe('app skeleton', () => {
  it('responds 404 for unknown routes', async () => {
    const res = await request(createApp()).get('/nope');
    expect(res.status).toBe(404);
  });
});
