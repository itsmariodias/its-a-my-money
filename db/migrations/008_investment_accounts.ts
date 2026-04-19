import { type SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE accounts ADD COLUMN account_type TEXT NOT NULL DEFAULT 'cash';
  `);
  await db.execAsync(`
    ALTER TABLE accounts ADD COLUMN current_value REAL;
  `);
}
