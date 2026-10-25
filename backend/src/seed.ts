import 'dotenv/config';
import { runSeed } from './bootstrap';
import { pool } from './db';

runSeed(pool, process.env, console.log)
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
