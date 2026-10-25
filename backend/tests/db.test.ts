import { pool } from '../src/db';

afterAll(() => pool.end());

describe('pool', () => {
  it('logs an idle-client error instead of crashing the process', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const err = new Error('idle client died');

    expect(() => pool.emit('error', err)).not.toThrow();

    expect(spy).toHaveBeenCalledWith('Unexpected idle PostgreSQL client error', err);
    spy.mockRestore();
  });
});
