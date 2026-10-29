import { type SQLiteDatabase } from 'expo-sqlite';

// A finished goal is archived rather than deleted: archived_at records when, the goal and its
// allocations stay as history, and it stops counting toward its account's reserved money.
// NULL means active. Restoring a goal clears it.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`ALTER TABLE goals ADD COLUMN archived_at TEXT;`);
}
