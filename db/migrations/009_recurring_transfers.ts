import { type SQLiteDatabase } from 'expo-sqlite';

// Adds support for recurring transfers (in addition to recurring transactions).
// SQLite cannot drop a NOT NULL constraint with ALTER, so we recreate the table
// to make `type` and `category_id` nullable for the transfer variant.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys=off;

    CREATE TABLE recurring_transactions_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      kind TEXT NOT NULL DEFAULT 'transaction' CHECK(kind IN ('transaction', 'transfer')),
      type TEXT CHECK(type IN ('income', 'expense')),
      category_id INTEGER REFERENCES categories(id),
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      to_account_id INTEGER REFERENCES accounts(id),
      note TEXT,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_due_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO recurring_transactions_new
      (id, amount, kind, type, category_id, account_id, to_account_id, note, frequency, start_date, end_date, next_due_date, is_active, created_at)
      SELECT id, amount, 'transaction', type, category_id, account_id, NULL, note, frequency, start_date, end_date, next_due_date, is_active, created_at
      FROM recurring_transactions;

    DROP TABLE recurring_transactions;
    ALTER TABLE recurring_transactions_new RENAME TO recurring_transactions;

    ALTER TABLE transfers ADD COLUMN recurring_transaction_id INTEGER REFERENCES recurring_transactions(id);

    PRAGMA foreign_keys=on;
  `);
}
