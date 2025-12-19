import {
  drizzle as drizzleSqlite,
  BetterSQLite3Database,
} from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.sqlite';
import { env } from '$env/dynamic/private';

// For local development, we use SQLite only
// PostgreSQL support can be added in production by creating a separate module

// Database configuration from environment
const DATABASE_URL = env.DATABASE_URL;

// Type for the database instance (SQLite for dev)
export type DatabaseInstance = BetterSQLite3Database<typeof schema>;

// Database singleton
let dbInstance: DatabaseInstance | null = null;

function createSqliteDatabase(): DatabaseInstance {
  const sqlite = new Database('data/midgard.db');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  return drizzleSqlite(sqlite, { schema });
}

function createDatabase(): DatabaseInstance {
  // For now, always use SQLite
  // PostgreSQL can be implemented separately for production
  if (DATABASE_URL) {
    console.warn(
      'DATABASE_URL is set but PostgreSQL is not yet implemented. Using SQLite.',
    );
  }
  return createSqliteDatabase();
}

/**
 * Get the database instance (singleton)
 */
export function getDb(): DatabaseInstance {
  if (!dbInstance) {
    dbInstance = createDatabase();
  }
  return dbInstance;
}

/**
 * Reset the database connection (useful for testing)
 */
export function resetDb(): void {
  dbInstance = null;
}

// Re-export schema for convenience
export { schema };

// Re-export table definitions
export const { wallets, factories, challenges, factoryClosures, tokenEvents } =
  schema;

// Re-export types from the schema
export type {
  Wallet,
  NewWallet,
  Factory,
  NewFactory,
  Challenge,
  NewChallenge,
  FactoryClosure,
  NewFactoryClosure,
  TokenEvent,
  NewTokenEvent,
} from './schema.sqlite';
