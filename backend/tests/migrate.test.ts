import fs from 'fs';
import os from 'os';
import path from 'path';
import { Pool } from 'pg';
import { pool } from '../src/db';
import { MIGRATION_LOCK_ID, migrate } from '../src/migrate';

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

  it('uses the repository migrations folder by default and finds everything already applied', async () => {
    await expect(migrate(pool)).resolves.toBeUndefined();

    const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY name');
    expect(rows.map((r) => r.name)).toEqual(expect.arrayContaining(['001_create_users.sql', '002_add_user_role.sql']));
  });

  it('surfaces the original migration error even when ROLLBACK and the lock release also fail', async () => {
    fs.writeFileSync(path.join(dir, '920_bad.sql'), 'SELECT 1;');
    const migrationError = new Error('real migration error');
    const release = jest.fn();
    const client = {
      release,
      query: jest.fn((sql: string) => {
        if (sql.startsWith('SELECT name FROM schema_migrations')) return Promise.resolve({ rows: [] });
        if (sql === 'SELECT 1;') return Promise.reject(migrationError);
        if (sql === 'ROLLBACK') return Promise.reject(new Error('connection lost during rollback'));
        if (sql.includes('pg_advisory_unlock')) return Promise.reject(new Error('connection lost during unlock'));
        return Promise.resolve({ rows: [] });
      }),
    };
    const fakePool = { connect: jest.fn(() => Promise.resolve(client)) } as unknown as Pool;

    await expect(migrate(fakePool, dir)).rejects.toBe(migrationError);

    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rolls back a failing migration, records nothing, rethrows, and releases the lock', async () => {
    fs.writeFileSync(
      path.join(dir, '910_bad.sql'),
      'CREATE TABLE migrate_bad_probe (id INT); SELECT * FROM table_that_does_not_exist;',
    );

    await expect(migrate(pool, dir)).rejects.toThrow(/table_that_does_not_exist/);

    const table = await pool.query("SELECT to_regclass('migrate_bad_probe') AS t");
    expect(table.rows[0].t).toBeNull();
    const recorded = await pool.query("SELECT 1 FROM schema_migrations WHERE name = '910_bad.sql'");
    expect(recorded.rows).toHaveLength(0);
    // The lock is session-scoped, so check it from a different connection.
    const other = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { rows } = await other.query('SELECT pg_try_advisory_lock($1) AS got', [MIGRATION_LOCK_ID]);
      expect(rows[0].got).toBe(true);
      await other.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    } finally {
      await other.end();
    }
  });
});
