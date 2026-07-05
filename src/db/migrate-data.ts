import { drizzle as localDrizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as remoteDrizzle } from 'drizzle-orm/libsql';
import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config();

async function migrate() {
  console.log('🔄 Starting data migration from local SQLite to Turso...');
  
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoToken) {
    console.error('❌ Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be defined in your environment to migrate to Turso!');
    process.exit(1);
  }

  // 1. Init Local DB
  const dbPath = path.resolve(process.cwd(), 'sqlite.db');
  console.log(`📁 Reading local database from: ${dbPath}`);
  const localSqlite = new Database(dbPath);
  const localDb = localDrizzle(localSqlite, { schema });

  // 2. Init Remote DB (Turso)
  console.log(`🌐 Connecting to remote Turso database at: ${tursoUrl}`);
  const remoteClient = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });
  const remoteDb = remoteDrizzle(remoteClient, { schema });

  // 3. Migrate Users
  const users = await localDb.select().from(schema.users);
  if (users.length > 0) {
    console.log(`👤 Migrating ${users.length} users...`);
    await remoteDb.insert(schema.users).values(users).onConflictDoNothing();
  }

  // 4. Migrate Thoughts
  const thoughts = await localDb.select().from(schema.thoughts);
  if (thoughts.length > 0) {
    console.log(`🧠 Migrating ${thoughts.length} thoughts...`);
    await remoteDb.insert(schema.thoughts).values(thoughts).onConflictDoNothing();
  }

  // 5. Migrate Relationships (Connections)
  const relationships = await localDb.select().from(schema.relationships);
  if (relationships.length > 0) {
    console.log(`🔗 Migrating ${relationships.length} connection links...`);
    await remoteDb.insert(schema.relationships).values(relationships).onConflictDoNothing();
  }

  // 6. Migrate Action Items
  const actionItems = await localDb.select().from(schema.actionItems);
  if (actionItems.length > 0) {
    console.log(`✅ Migrating ${actionItems.length} action items...`);
    await remoteDb.insert(schema.actionItems).values(actionItems).onConflictDoNothing();
  }

  console.log('🎉 Data migration completed successfully!');
}

migrate().catch(console.error);
