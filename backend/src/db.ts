import { Pool } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// An unhandled 'error' on an idle client would otherwise crash the process.
pool.on('error', (err) => console.error('Unexpected idle PostgreSQL client error', err));
