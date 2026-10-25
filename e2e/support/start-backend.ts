/**
 * Starts the real backend for the end-to-end run: wipes the test database, applies the migrations,
 * seeds the admin user, then listens. Run with tsx from the backend folder (see playwright.config.ts).
 */
import { installShutdownHandlers, runSeed, startServer } from '../../backend/src/bootstrap';
import { pool } from '../../backend/src/db';
import { ADMIN, BACKEND_PORT, TEST_DATABASE_URL } from './env';

async function main() {
  if (process.env.DATABASE_URL !== TEST_DATABASE_URL) {
    throw new Error('Refusing to reset a database other than TEST_DATABASE_URL');
  }
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await runSeed(pool, { ADMIN_EMAIL: ADMIN.email, ADMIN_PASSWORD: ADMIN.password }, console.log);
  const server = await startServer(pool, BACKEND_PORT);
  console.log(`E2E backend listening on :${server.port}`);
  installShutdownHandlers(server, () => pool.end(), process, console.log);
}

main().catch((err) => {
  console.error('E2E backend failed to start', err);
  process.exit(1);
});
