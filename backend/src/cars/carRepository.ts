import type { Pool } from 'pg';
import { isUniqueViolation } from '../db';
import { MAX_QUANTITY, type CarInput, type CarListQuery, type CarUpdate } from './schemas';

export interface Car {
  id: number;
  vin: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  priceCents: number;
  category: string;
  quantity: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateResult = { kind: 'ok'; car: Car } | { kind: 'duplicate_vin' };
export type WriteResult = { kind: 'ok'; car: Car } | { kind: 'not_found' } | { kind: 'duplicate_vin' };
/** `conflict` means the car exists but the stock rule refused the change. */
export type StockResult = { kind: 'ok'; car: Car } | { kind: 'not_found' } | { kind: 'conflict' };

/** Persistence port for cars. Routes depend on this interface, not on SQL. */
export interface CarRepository {
  create(input: CarInput): Promise<CreateResult>;
  findById(id: number): Promise<Car | null>;
  list(query: CarListQuery): Promise<{ items: Car[]; total: number }>;
  update(id: number, patch: CarUpdate): Promise<WriteResult>;
  remove(id: number): Promise<boolean>;
  purchase(id: number, quantity: number): Promise<StockResult>;
  restock(id: number, quantity: number): Promise<StockResult>;
}

const CAR_COLUMNS = `id, vin, make, model, year, mileage, price_cents AS "priceCents", category, quantity, status,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

const UPDATE_COLUMNS: Record<keyof CarUpdate, string> = {
  vin: 'vin',
  make: 'make',
  model: 'model',
  year: 'year',
  mileage: 'mileage',
  priceCents: 'price_cents',
  category: 'category',
  quantity: 'quantity',
  status: 'status',
};

export function createCarRepository(pool: Pool): CarRepository {
  /**
   * Runs a guarded stock UPDATE that returns the car when its guard passes. When nothing matched,
   * tells a missing car apart from a guard that refused the change.
   */
  async function guardedStockUpdate(sql: string, params: unknown[], id: number): Promise<StockResult> {
    const { rows } = await pool.query(sql, params);
    if (rows[0]) return { kind: 'ok', car: rows[0] };
    const exists = await pool.query('SELECT 1 FROM cars WHERE id = $1', [id]);
    return exists.rowCount ? { kind: 'conflict' } : { kind: 'not_found' };
  }

  return {
    async create(c) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO cars (vin, make, model, year, mileage, price_cents, category, quantity, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${CAR_COLUMNS}`,
          [c.vin, c.make, c.model, c.year, c.mileage, c.priceCents, c.category, c.quantity, c.status],
        );
        return { kind: 'ok', car: rows[0] };
      } catch (err) {
        if (isUniqueViolation(err)) return { kind: 'duplicate_vin' };
        throw err;
      }
    },

    async findById(id) {
      const { rows } = await pool.query(`SELECT ${CAR_COLUMNS} FROM cars WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    async list(q) {
      const conditions: string[] = [];
      const params: unknown[] = [];
      const add = (sql: string, value: unknown) => {
        params.push(value);
        conditions.push(sql.replace('?', `$${params.length}`));
      };
      if (q.make) add('lower(make) = lower(?)', q.make);
      if (q.model) add('lower(model) = lower(?)', q.model);
      if (q.category) add('category = ?', q.category);
      if (q.status) add('status = ?', q.status);
      if (q.minYear !== undefined) add('year >= ?', q.minYear);
      if (q.maxYear !== undefined) add('year <= ?', q.maxYear);
      if (q.minPrice !== undefined) add('price_cents >= ?', q.minPrice);
      if (q.maxPrice !== undefined) add('price_cents <= ?', q.maxPrice);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [items, count] = await Promise.all([
        pool.query(
          `SELECT ${CAR_COLUMNS} FROM cars ${where} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, q.limit, q.offset],
        ),
        pool.query(`SELECT count(*)::int AS total FROM cars ${where}`, params),
      ]);
      return { items: items.rows, total: count.rows[0].total };
    },

    async update(id, patch) {
      const entries = Object.entries(patch) as [keyof CarUpdate, unknown][];
      const assignments = entries.map(([key], i) => `${UPDATE_COLUMNS[key]} = $${i + 1}`);
      const values = entries.map(([, value]) => value);
      try {
        const { rows } = await pool.query(
          `UPDATE cars SET ${assignments.join(', ')}, updated_at = now()
           WHERE id = $${values.length + 1} RETURNING ${CAR_COLUMNS}`,
          [...values, id],
        );
        return rows[0] ? { kind: 'ok', car: rows[0] } : { kind: 'not_found' };
      } catch (err) {
        if (isUniqueViolation(err)) return { kind: 'duplicate_vin' };
        throw err;
      }
    },

    async remove(id) {
      const { rowCount } = await pool.query('DELETE FROM cars WHERE id = $1', [id]);
      return rowCount === 1;
    },

    // The stock check and the change are one atomic statement, so concurrent buyers can never oversell.
    purchase: (id, quantity) =>
      guardedStockUpdate(
        `UPDATE cars
            SET quantity = quantity - $1,
                status = CASE WHEN quantity - $1 = 0 THEN 'sold' ELSE status END,
                updated_at = now()
          WHERE id = $2 AND status = 'available' AND quantity >= $1
          RETURNING ${CAR_COLUMNS}`,
        [quantity, id],
        id,
      ),

    restock: (id, quantity) =>
      guardedStockUpdate(
        `UPDATE cars
            SET quantity = quantity + $1,
                status = CASE WHEN status = 'sold' THEN 'available' ELSE status END,
                updated_at = now()
          WHERE id = $2 AND quantity + $1 <= $3
          RETURNING ${CAR_COLUMNS}`,
        [quantity, id, MAX_QUANTITY],
        id,
      ),
  };
}
