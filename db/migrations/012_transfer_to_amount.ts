import { type SQLiteDatabase } from 'expo-sqlite';

// `to_amount` is the amount credited to the destination account when it differs from
// `amount` (the amount debited from the source). NULL means same-currency — the source
// amount applies on both sides. The user types both values for cross-currency transfers;
// the app never invents a conversion rate.
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`ALTER TABLE transfers ADD COLUMN to_amount REAL;`);
}
