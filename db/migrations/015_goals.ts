import { type SQLiteDatabase } from 'expo-sqlite';

// Goals are the inverse of budgets: a target you spend *towards* rather than a limit to stay
// under. Progress is the spend in the category from start_date onward, so a new goal is not
// retroactively filled by history. start_date is its own column rather than derived from
// created_at, which is UTC — transactions.date is a local YYYY-MM-DD and the two would disagree
// for goals created near midnight.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      target_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      start_date TEXT NOT NULL,
      target_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
