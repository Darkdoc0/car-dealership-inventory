import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { migrate } from '../src/migrate';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  const url = process.env.TEST_DATABASE_URL;
  // Guard the destructive reset below: never run it against anything but the test DB.
  if (!url || !/\/car_dealership_test(\?|$)/.test(url)) {
    throw new Error('TEST_DATABASE_URL must be set and point at the car_dealership_test database');
  }
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await migrate(pool);
  } finally {
    await pool.end();
  }
}
