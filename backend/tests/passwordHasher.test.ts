import bcrypt from 'bcryptjs';
import { createBcryptHasher } from '../src/passwordHasher';

const hasher = createBcryptHasher(4); // low cost keeps the test fast

afterEach(() => jest.restoreAllMocks());

describe('createBcryptHasher', () => {
  it('produces a salted bcrypt hash, never the plaintext', async () => {
    const a = await hasher.hash('Sup3rSecret!');
    const b = await hasher.hash('Sup3rSecret!');

    expect(a).toMatch(/^\$2[aby]\$04\$/);
    expect(a).not.toContain('Sup3rSecret!');
    expect(a).not.toBe(b);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hasher.hash('Sup3rSecret!');

    expect(await hasher.verify('Sup3rSecret!', hash)).toBe(true);
    expect(await hasher.verify('Wr0ngPassword!', hash)).toBe(false);
  });

  it('returns false for a missing hash but still performs a bcrypt comparison', async () => {
    const compare = jest.spyOn(bcrypt, 'compare');

    const result = await hasher.verify('anything', null);

    expect(result).toBe(false);
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it('computes the dummy hash only once per hasher', async () => {
    const hashSpy = jest.spyOn(bcrypt, 'hash');
    const fresh = createBcryptHasher(4);

    await fresh.verify('a', null);
    await fresh.verify('b', null);

    expect(hashSpy).toHaveBeenCalledTimes(1);
  });
});
