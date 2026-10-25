import type { Pool } from 'pg';

export interface AdminCredentials {
  email: string;
  password: string;
}

export function readAdminCredentials(_env: NodeJS.ProcessEnv): AdminCredentials {
  throw new Error('not implemented');
}

export async function seedAdmin(_pool: Pool, _credentials: AdminCredentials): Promise<{ id: number; email: string }> {
  throw new Error('not implemented');
}
