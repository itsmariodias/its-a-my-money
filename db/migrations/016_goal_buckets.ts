import { type SQLiteDatabase } from 'expo-sqlite';

// Goals become savings buckets inside an account rather than spend toward a category. A goal now
// has its own name, icon and colour and belongs to one account (its currency is the account's).
// The money in a bucket is the sum of its rows in goal_allocations: positive rows reserve money
// (an income split or a manual add), negative rows take it out (a release or an expense paid from
// the goal). Rows tied to a transaction carry its id so editing or deleting it can follow.
//
// Existing goals are converted, not dropped: the category's name, icon and colour carry over, and
// the goal is placed in the first account of its currency (else the first account of any). They
// start empty — spend-based progress has no meaning as reserved money. A goal with no account to
// land in at all is dropped.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys=off;

    CREATE TABLE goals_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      target_amount REAL NOT NULL,
      target_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO goals_new (id, name, icon, color, account_id, target_amount, target_date, created_at)
      SELECT * FROM (
        SELECT g.id, c.name, c.icon, c.color,
          COALESCE(
            (SELECT a.id FROM accounts a WHERE a.currency = g.currency ORDER BY a.id LIMIT 1),
            (SELECT a.id FROM accounts a ORDER BY a.id LIMIT 1)
          ) AS account_id,
          g.target_amount, g.target_date, g.created_at
        FROM goals g
        JOIN categories c ON c.id = g.category_id
      )
      WHERE account_id IS NOT NULL;

    DROP TABLE goals;
    ALTER TABLE goals_new RENAME TO goals;

    CREATE TABLE IF NOT EXISTS goal_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES goals(id),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      transaction_id INTEGER REFERENCES transactions(id),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_goal_allocations_goal ON goal_allocations(goal_id);
    CREATE INDEX IF NOT EXISTS idx_goal_allocations_transaction ON goal_allocations(transaction_id);

    PRAGMA foreign_keys=on;
  `);
}
