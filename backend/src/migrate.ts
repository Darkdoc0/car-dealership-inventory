import fs from 'fs';
import path from 'path';
import type { Pool } from 'pg';

const DEFAULT_MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

export async function migrate(pool: Pool, dir: string = DEFAULT_MIGRATIONS_DIR): Promise<void> {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    await pool.query(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
}
