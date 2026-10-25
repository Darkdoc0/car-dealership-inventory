import type { Pool } from 'pg';
import { isUniqueViolation } from '../db';

export type Role = 'user' | 'admin';

export interface User {
  id: number;
  email: string;
  role: Role;
}

export interface UserCredentials {
  id: number;
  email: string;
  passwordHash: string;
}

export type CreateUserResult = { kind: 'ok'; user: { id: number; email: string } } | { kind: 'duplicate_email' };

/** Persistence port for users. Routes and middleware depend on this interface, not on SQL. */
export interface UserRepository {
  create(email: string, passwordHash: string): Promise<CreateUserResult>;
  findById(id: number): Promise<User | null>;
  /** `email` must already be lower-cased. */
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
  list(): Promise<User[]>;
}

export function createUserRepository(pool: Pool): UserRepository {
  return {
    async create(email, passwordHash) {
      try {
        const { rows } = await pool.query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
          [email, passwordHash],
        );
        return { kind: 'ok', user: rows[0] };
      } catch (err) {
        if (isUniqueViolation(err)) return { kind: 'duplicate_email' };
        throw err;
      }
    },

    async findById(id) {
      const { rows } = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [id]);
      return rows[0] ?? null;
    },

    async findCredentialsByEmail(email) {
      const { rows } = await pool.query(
        'SELECT id, email, password_hash AS "passwordHash" FROM users WHERE lower(email) = $1',
        [email],
      );
      return rows[0] ?? null;
    },

    async list() {
      const { rows } = await pool.query('SELECT id, email, role FROM users ORDER BY id');
      return rows;
    },
  };
}
