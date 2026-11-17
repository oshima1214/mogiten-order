import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const migrationsDir = path.join(root, 'supabase/migrations');

export type TestDb = {
  db: PGlite;
  asAnon<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  asService<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Runs as the owner (the role migrations run as) — for seeding and inspecting test state. */
  asOwner<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
};

let template: Promise<PGlite> | null = null;

async function buildTemplate(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(path.join(__dirname, 'shim.sql'), 'utf8'));
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(path.join(migrationsDir, file), 'utf8'));
  }
  return db;
}

/** A fresh, fully migrated database per call (cloned from one migrated template per test file). */
export async function createTestDb(): Promise<TestDb> {
  template ??= buildTemplate();
  const db = await (await template).clone();

  const as = (role: string | null) => async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
    if (role) await db.exec(`set role ${role}`);
    try {
      return (await db.query<T>(sql, params)).rows;
    } finally {
      if (role) await db.exec('reset role');
    }
  };

  return { db, asAnon: as('anon'), asService: as('service_role'), asOwner: as(null) };
}
