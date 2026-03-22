import { type SQLiteDatabase } from 'expo-sqlite';

/**
 * Assigns unique icons to default categories that previously shared the same icon.
 */
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    UPDATE categories SET icon='local-grocery-store' WHERE name='Food'         AND is_default=1;
    UPDATE categories SET icon='directions-bus'      WHERE name='Transport'    AND is_default=1;
    UPDATE categories SET icon='checkroom'           WHERE name='Clothes'      AND is_default=1;
    UPDATE categories SET icon='account-balance'     WHERE name='Deposits'     AND is_default=1 AND type='income';
    UPDATE categories SET icon='redeem'              WHERE name='Gift'         AND is_default=1 AND type='income';
    UPDATE categories SET icon='attach-money'        WHERE name='Other Income' AND is_default=1 AND type='income';
  `);
}
