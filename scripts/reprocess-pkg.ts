import './load-env';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/db/schema';
import { processThoughtPKG } from '../src/lib/pkg';
import path from 'path';

async function reprocess() {
  console.log('🔄 Reprocessing PKG for all thoughts in local database...');

  const dbPath = path.resolve(process.cwd(), 'sqlite.db');
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });

  // 1. Fetch all thoughts
  const allThoughts = await db.select().from(schema.thoughts);
  console.log(`Found ${allThoughts.length} thoughts to process.`);

  // 2. Clear existing PKG tables to start fresh
  console.log('🧹 Clearing local entities and entity relationships tables...');
  await db.delete(schema.entities);
  await db.delete(schema.entityRelationships);

  // 3. Process each thought sequentially
  for (const thought of allThoughts) {
    console.log(`\n⚙️ Processing thought: "${thought.content.substring(0, 60)}..." (ID: ${thought.id})`);
    try {
      await processThoughtPKG(thought.id, thought.userId);
    } catch (err) {
      console.error(`❌ Error processing thought ${thought.id}:`, err);
    }
  }

  console.log('\n🎉 Reprocessing completed successfully!');
}

reprocess().catch(console.error);
