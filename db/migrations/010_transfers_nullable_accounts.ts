import { type SQLiteDatabase } from 'expo-sqlite';

// Rebuilds `transfers` to make from_account_id and to_account_id nullable
// with ON DELETE SET NULL, so deleting an account preserves transfer history
// (surviving side renders normally; deleted side shows as "Unknown").
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys=off;

    CREATE TABLE transfers_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      recurring_transaction_id INTEGER REFERENCES recurring_transactions(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO transfers_new
      (id, from_account_id, to_account_id, amount, note, date, recurring_transaction_id, created_at)
      SELECT id, from_account_id, to_account_id, amount, note, date, recurring_transaction_id, created_at
      FROM transfers;

    DROP TABLE transfers;
    ALTER TABLE transfers_new RENAME TO transfers;

    PRAGMA foreign_keys=on;
  `);
}
