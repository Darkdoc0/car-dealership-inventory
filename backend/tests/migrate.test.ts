import fs from 'fs';
import os from 'os';
import path from 'path';
import { pool } from '../src/db';
import { migrate } from '../src/migrate';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
});

afterEach(async () => {
  fs.rmSync(dir, { recursive: true, force: true });
  await pool.query('DROP TABLE IF EXISTS migrate_probe');
  await pool.query("DELETE FROM schema_migrations WHERE name = '900_probe.sql'").catch(() => undefined);
});

afterAll(() => pool.end());

describe('migrate', () => {
  it('applies each migration file only once across repeated runs', async () => {
    // Deliberately not idempotent: re-running it would throw "relation already exists".
    fs.writeFileSync(path.join(dir, '900_probe.sql'), 'CREATE TABLE migrate_probe (id INT);');

    await migrate(pool, dir);
    await migrate(pool, dir);

    const { rows } = await pool.query("SELECT name FROM schema_migrations WHERE name = '900_probe.sql'");
    expect(rows).toHaveLength(1);
  });

  it('applies a migration added after an earlier run', async () => {
    fs.writeFileSync(path.join(dir, '900_probe.sql'), 'CREATE TABLE migrate_probe (id INT);');
    await migrate(pool, dir);
    fs.writeFileSync(path.join(dir, '901_probe2.sql'), 'ALTER TABLE migrate_probe ADD COLUMN note TEXT;');

    await migrate(pool, dir);

    const { rows } = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'migrate_probe' AND column_name = 'note'",
    );
    expect(rows).toHaveLength(1);
    await pool.query("DELETE FROM schema_migrations WHERE name = '901_probe2.sql'");
  });
});
