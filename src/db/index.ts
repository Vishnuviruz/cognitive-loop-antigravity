import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Only connect to Turso in actual production (Vercel). Local dev always uses sqlite.db.
const isProduction = process.env.NODE_ENV === 'production';

const client = createClient(
  isProduction
    ? {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      }
    : {
        url: 'file:sqlite.db',
      }
);

// Export the drizzle database client with schemas loaded
export const db = drizzle(client, { schema });
export * as schema from './schema';
