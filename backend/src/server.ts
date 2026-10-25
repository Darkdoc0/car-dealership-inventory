import 'dotenv/config';
import { createApp } from './app';
import { pool } from './db';
import { migrate } from './migrate';

async function main() {
  await migrate(pool);
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => console.log(`API listening on :${port}`));
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
