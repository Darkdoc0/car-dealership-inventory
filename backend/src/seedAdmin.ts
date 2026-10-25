import type { Pool } from 'pg';
import { registerSchema } from './credentials';
import { createBcryptHasher, type PasswordHasher } from './passwordHasher';

export interface AdminCredentials {
  email: string;
  password: string;
}

export function readAdminCredentials(env: NodeJS.ProcessEnv): AdminCredentials {
  for (const name of ['ADMIN_EMAIL', 'ADMIN_PASSWORD']) {
    if (!env[name]) throw new Error(`${name} is not set`);
  }
  return { email: env.ADMIN_EMAIL as string, password: env.ADMIN_PASSWORD as string };
}

/** Creates the admin user, or promotes the existing user with that email and resets its password. */
export async function seedAdmin(
  pool: Pool,
  credentials: AdminCredentials,
  hasher: PasswordHasher = createBcryptHasher(),
): Promise<{ id: number; email: string }> {
  const parsed = registerSchema.safeParse(credentials);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))].join(' and ');
    throw new Error(`Invalid admin ${fields}: use a valid email and a password of 8 to 72 bytes`);
  }
  const { email, password } = parsed.data;

  const passwordHash = await hasher.hash(password);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')
     ON CONFLICT ((lower(email))) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
     RETURNING id, email`,
    [email, passwordHash],
  );
  return rows[0];
}
