import { type SQLiteDatabase } from 'expo-sqlite';
import { up as migration001 } from './migrations/001_initial';
import { up as migration002 } from './migrations/002_settings';
import { up as migration003 } from './migrations/003_category_colors';
import { up as migration004 } from './migrations/004_monefy_categories';
import { up as migration005 } from './migrations/005_unique_category_icons';
import { up as migration006 } from './migrations/006_update_category_colors';
import { up as migration007 } from './migrations/007_recurring_transactions';
import { up as migration008 } from './migrations/008_investment_accounts';

const migrations = [
  { version: 1, up: migration001 },
  { version: 2, up: migration002 },
  { version: 3, up: migration003 },
  { version: 4, up: migration004 },
  { version: 5, up: migration005 },
  { version: 6, up: migration006 },
  { version: 7, up: migration007 },
  { version: 8, up: migration008 },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const result = await db.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) as version FROM schema_migrations'
  );
  const currentVersion = result?.version ?? 0;

  const pending = migrations.filter((m) => m.version > currentVersion);
  for (const migration of pending) {
    await migration.up(db);
    await db.runAsync(
      'INSERT INTO schema_migrations (version) VALUES (?)',
      migration.version
    );
  }
}
