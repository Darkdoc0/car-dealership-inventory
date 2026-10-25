/**
 * Starts the real backend on the end-to-end test database loaded with the demo data (the same data as
 * `npm run seed`), so README screenshots show the app as a reviewer would see it. Used only by screenshots.config.ts.
 */
import { installShutdownHandlers, runDemoSeed, startServer } from '../../backend/src/bootstrap';
import { pool } from '../../backend/src/db';
import { BACKEND_PORT, TEST_DATABASE_URL } from './env';

async function main() {
  if (process.env.DATABASE_URL !== TEST_DATABASE_URL) {
    throw new Error('Refusing to reset a database other than TEST_DATABASE_URL');
  }
  await runDemoSeed(pool, process.env, console.log);
  const server = await startServer(pool, BACKEND_PORT);
  console.log(`Demo backend listening on :${server.port}`);
  installShutdownHandlers(server, () => pool.end(), process, console.log);
}

main().catch((err) => {
  console.error('Demo backend failed to start', err);
  process.exit(1);
});
