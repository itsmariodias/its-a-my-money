import { type SQLiteDatabase } from 'expo-sqlite';

// Until now, AccountFormSheet hardcoded `currency: 'USD'` on insert regardless of the
// user's global currency setting. Accounts created by a non-USD user therefore claim
// to be USD on a column nothing actually read. Multi-currency display starts reading
// `accounts.currency` per row, so back-fill every existing account to the user's
// current global currency before that becomes visible.
export async function up(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'currency'`
  );
  const code = row?.value ?? 'USD';
  await db.runAsync(`UPDATE accounts SET currency = ?`, code);
}
