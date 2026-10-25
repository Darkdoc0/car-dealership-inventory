import type { AddressInfo } from 'net';
import type { Pool } from 'pg';
import { createApp } from './app';
import { DEMO_ADMIN, DEMO_CARS, DEMO_USER, resetGuardProblem, seedDemoData } from './demoData';
import { getJwtSecret } from './jwt';
import { migrate } from './migrate';
import { readAdminCredentials, seedAdmin } from './seedAdmin';

export interface ServerHandle {
  port: number;
  /** Stops accepting connections and resolves once in-flight requests have finished. Does not close the pool. */
  close(): Promise<void>;
}

/** Validates configuration, applies migrations, then starts listening. Port 0 picks a free port. */
export async function startServer(pool: Pool, port: number): Promise<ServerHandle> {
  getJwtSecret(); // fail fast if misconfigured
  await migrate(pool);

  const server = createApp().listen(port);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  return {
    port: (server.address() as AddressInfo).port,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

/** Applies migrations and creates (or promotes) the admin user described by ADMIN_EMAIL / ADMIN_PASSWORD. */
export async function runSeed(
  pool: Pool,
  env: NodeJS.ProcessEnv,
  log: (message: string) => void,
): Promise<void> {
  const credentials = readAdminCredentials(env);
  await migrate(pool);
  const admin = await seedAdmin(pool, credentials);
  log(`Admin user ready: ${admin.email} (id ${admin.id})`);
}

export interface ShutdownTarget {
  once(signal: 'SIGINT' | 'SIGTERM', listener: () => void): unknown;
  exit(code: number): unknown;
}

/**
 * Stops the server, then releases resources (e.g. the database pool), when SIGINT or SIGTERM arrives.
 * Repeated signals are ignored while a shutdown is already in progress.
 */
export function installShutdownHandlers(
  server: Pick<ServerHandle, 'close'>,
  releaseResources: () => Promise<void>,
  target: ShutdownTarget,
  log: (message: string) => void,
): void {
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`${signal} received, shutting down`);
    try {
      await server.close();
      await releaseResources();
      target.exit(0);
    } catch (err) {
      console.error('Error during shutdown', err);
      target.exit(1);
    }
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    target.once(signal, () => void shutdown(signal));
  }
}

/**
 * Resets the database in DATABASE_URL and fills it with the demo users and vehicles (`npm run seed`).
 * Refuses to run in production or against a database that looks like one.
 */
export async function runDemoSeed(pool: Pool, env: NodeJS.ProcessEnv, log: (message: string) => void): Promise<void> {
  const { rows } = await pool.query<{ name: string }>('SELECT current_database() AS name');
  const databaseName = rows[0].name;
  const problem = resetGuardProblem(env.NODE_ENV, databaseName);
  if (problem) throw new Error(problem);

  log(`Resetting database "${databaseName}" and loading the demo data...`);
  await seedDemoData(pool);

  const soldOut = DEMO_CARS.filter((car) => car.quantity === 0).length;
  log(`Demo data ready: 2 users and ${DEMO_CARS.length} vehicles (${soldOut} out of stock).`);
  log(`  admin    ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
  log(`  shopper  ${DEMO_USER.email} / ${DEMO_USER.password}`);
}
