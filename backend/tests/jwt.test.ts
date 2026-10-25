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
