import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Set up the local SQLite database file at the root of the project
const dbPath = path.resolve(process.cwd(), 'sqlite.db');

const sqlite = new Database(dbPath);

// Export the drizzle database client with schemas loaded
export const db = drizzle(sqlite, { schema });
export * as schema from './schema';
