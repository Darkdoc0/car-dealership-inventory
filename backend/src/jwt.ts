import jwt from 'jsonwebtoken';

const TOKEN_TTL_SECONDS = 60 * 60;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

export function signToken(userId: number): string {
  return jwt.sign({}, getJwtSecret(), { subject: String(userId), expiresIn: TOKEN_TTL_SECONDS });
}
