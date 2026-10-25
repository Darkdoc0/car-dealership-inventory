import jwt from 'jsonwebtoken';

const TOKEN_TTL_SECONDS = 60 * 60;
const MIN_PRODUCTION_SECRET_LENGTH = 32;

/** The signing secret. Production demands at least 32 characters so tokens cannot be brute-forced offline. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  if (process.env.NODE_ENV === 'production' && secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`);
  }
  return secret;
}

export function signToken(userId: number): string {
  return jwt.sign({}, getJwtSecret(), { algorithm: 'HS256', subject: String(userId), expiresIn: TOKEN_TTL_SECONDS });
}

/** Returns the user id from a valid, unexpired HS256 token; throws otherwise. */
export function verifyToken(token: string): number {
  const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
  const userId = Number(typeof payload === 'string' ? NaN : payload.sub);
  if (!Number.isInteger(userId)) throw new Error('Token subject is not a user id');
  return userId;
}
