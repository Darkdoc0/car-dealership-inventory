import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !/\/car_dealership_test(\?|$)/.test(testUrl)) {
  throw new Error('TEST_DATABASE_URL must be set and point at the car_dealership_test database');
}
// Tests must never touch the dev database.
process.env.DATABASE_URL = testUrl;

process.env.JWT_SECRET = 'test-only-jwt-secret';
