import { type SQLiteDatabase } from 'expo-sqlite';

/**
 * Aligns default category colors to the full MD500 palette, minimising repeated colors.
 * Also updates the Cash account default color to green if it still has the old blue default.
 */
export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    UPDATE categories SET color='#4CAF50' WHERE name='Food'         AND is_default=1;
    UPDATE categories SET color='#F44336' WHERE name='Health'       AND is_default=1;
    UPDATE categories SET color='#FF5722' WHERE name='Eating out'   AND is_default=1;
    UPDATE categories SET color='#8BC34A' WHERE name='Pets'         AND is_default=1;
    UPDATE categories SET color='#CDDC39' WHERE name='Sports'       AND is_default=1;
    UPDATE categories SET color='#FFEB3B' WHERE name='Toiletry'     AND is_default=1;
    UPDATE categories SET color='#3F51B5' WHERE name='Transport'    AND is_default=1;
    UPDATE categories SET color='#673AB7' WHERE name='Freelance'    AND is_default=1;
    UPDATE categories SET color='#4CAF50' WHERE name='Investment'   AND is_default=1;
    UPDATE categories SET color='#009688' WHERE name='Savings'      AND is_default=1;
    UPDATE categories SET color='#9E9E9E' WHERE name='Other Income' AND is_default=1;
    UPDATE accounts SET color='#4CAF50' WHERE name='Cash' AND color='#55A3FF';
  `);
}
