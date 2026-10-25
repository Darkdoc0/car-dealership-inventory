import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { migrate } from '../src/migrate';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await migrate(pool);
  } finally {
    await pool.end();
  }
}
