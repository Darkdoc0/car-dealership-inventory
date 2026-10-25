import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
// Tests must never touch the dev database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
