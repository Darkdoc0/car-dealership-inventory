import type { AddressInfo } from 'net';
import type { Pool } from 'pg';
import { createApp } from './app';
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
