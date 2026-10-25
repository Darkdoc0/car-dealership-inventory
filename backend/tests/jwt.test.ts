import jwt from 'jsonwebtoken';
import { getJwtSecret, signToken, verifyToken } from '../src/jwt';

const secret = () => process.env.JWT_SECRET as string;

describe('jwt helpers', () => {
  it('round-trips a user id through signToken and verifyToken', () => {
    expect(verifyToken(signToken(42))).toBe(42);
  });

  it('rejects a token whose subject is not a numeric user id', () => {
    const token = jwt.sign({}, secret(), { algorithm: 'HS256', subject: 'abc', expiresIn: 60 });

    expect(() => verifyToken(token)).toThrow('Token subject is not a user id');
  });

  it('rejects a token that has no subject', () => {
    const token = jwt.sign({}, secret(), { algorithm: 'HS256', expiresIn: 60 });

    expect(() => verifyToken(token)).toThrow();
  });

  it('rejects a token whose payload is a plain string', () => {
    const token = jwt.sign('42', secret(), { algorithm: 'HS256' });

    expect(() => verifyToken(token)).toThrow();
  });

  describe('secret strength in production', () => {
    const originalEnv = { secret: process.env.JWT_SECRET, nodeEnv: process.env.NODE_ENV };
    afterEach(() => {
      process.env.JWT_SECRET = originalEnv.secret;
      process.env.NODE_ENV = originalEnv.nodeEnv;
    });

    it('refuses a secret shorter than 32 characters', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'x'.repeat(31);

      expect(() => getJwtSecret()).toThrow('JWT_SECRET must be at least 32 characters in production');
      expect(() => signToken(1)).toThrow('at least 32 characters');
    });

    it('accepts a secret of 32 characters or more', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'x'.repeat(32);

      expect(getJwtSecret()).toBe('x'.repeat(32));
    });

    it('allows a short secret outside production, for development and tests', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev-only-change-me';

      expect(getJwtSecret()).toBe('dev-only-change-me');
    });
  });

  describe('without JWT_SECRET', () => {
    const original = process.env.JWT_SECRET;
    beforeEach(() => delete process.env.JWT_SECRET);
    afterEach(() => {
      process.env.JWT_SECRET = original;
    });

    it('getJwtSecret fails loudly instead of returning an empty secret', () => {
      expect(() => getJwtSecret()).toThrow('JWT_SECRET is not set');
    });

    it('signToken refuses to sign', () => {
      expect(() => signToken(1)).toThrow('JWT_SECRET is not set');
    });
  });
});
