import 'dotenv/config';
import { pool } from './db';
import { migrate } from './migrate';
import { readAdminCredentials, seedAdmin } from './seedAdmin';

async function main() {
  const credentials = readAdminCredentials(process.env);
  await migrate(pool);
  const admin = await seedAdmin(pool, credentials);
  console.log(`Admin user ready: ${admin.email} (id ${admin.id})`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
