import { type SQLiteDatabase } from 'expo-sqlite';

// A budget tracks spend in one currency — multi-currency users may want, e.g., a EUR
// food budget and a USD entertainment budget. Back-fill existing budgets to the user's
// global currency so they continue counting the same set of transactions as before.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`ALTER TABLE budgets ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';`);
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'currency'`
  );
  const code = row?.value ?? 'USD';
  await db.runAsync(`UPDATE budgets SET currency = ?`, code);
}
