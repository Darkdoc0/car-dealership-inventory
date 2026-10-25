import 'dotenv/config';
import { installShutdownHandlers, startServer } from './bootstrap';
import { pool } from './db';

async function main() {
  const server = await startServer(pool, Number(process.env.PORT ?? 3000));
  console.log(`API listening on :${server.port}`);
  installShutdownHandlers(server, () => pool.end(), process, console.log);
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
