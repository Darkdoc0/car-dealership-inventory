import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env'), quiet: true });

/** The end-to-end run resets this database, so it must never be anything but the test one. */
const url = process.env.TEST_DATABASE_URL;
if (!url || !/\/car_dealership_test(\?|$)/.test(url)) {
  throw new Error('backend/.env must define TEST_DATABASE_URL pointing at the car_dealership_test database');
}

export const TEST_DATABASE_URL: string = url;

// Ports differ from the development ones (3000 and 5173) so a running dev stack is left alone.
export const BACKEND_PORT = 3101;
export const FRONTEND_PORT = 5174;
export const API_URL = `http://localhost:${BACKEND_PORT}`;
export const APP_URL = `http://localhost:${FRONTEND_PORT}`;

/** Credentials of the admin the run seeds. Test data for the throwaway test database only. */
export const ADMIN = { email: 'e2e-admin@example.com', password: 'E2eAdmin-Pass1!' };

/** Not a secret: it only signs tokens for the throwaway end-to-end backend. */
export const E2E_JWT_SECRET = 'e2e-only-jwt-secret';
