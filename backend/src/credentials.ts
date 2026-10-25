import { z } from 'zod';

// bcrypt only hashes the first 72 bytes, so longer passwords would silently collide.
const BCRYPT_MAX_BYTES = 72;
export const BCRYPT_COST = 10;

export const withinBcryptLimit = (p: string) => Buffer.byteLength(p, 'utf8') <= BCRYPT_MAX_BYTES;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).refine(withinBcryptLimit),
});
