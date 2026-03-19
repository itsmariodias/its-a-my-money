import { type SQLiteDatabase } from 'expo-sqlite';
import { up as migration001 } from './migrations/001_initial';
import { up as migration002 } from './migrations/002_settings';
import { up as migration003 } from './migrations/003_category_colors';

const migrations = [
  { version: 1, up: migration001 },
  { version: 2, up: migration002 },
  { version: 3, up: migration003 },
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
