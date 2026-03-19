import { type SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    UPDATE categories SET color = '#F44336' WHERE name = 'Food & Drinks'    AND is_default = 1;
    UPDATE categories SET color = '#2196F3' WHERE name = 'Transport'         AND is_default = 1;
    UPDATE categories SET color = '#9C27B0' WHERE name = 'Shopping'          AND is_default = 1;
    UPDATE categories SET color = '#FF9800' WHERE name = 'Entertainment'     AND is_default = 1;
    UPDATE categories SET color = '#009688' WHERE name = 'Health'            AND is_default = 1;
    UPDATE categories SET color = '#607D8B' WHERE name = 'Bills & Utilities' AND is_default = 1;
    UPDATE categories SET color = '#795548' WHERE name = 'Housing'           AND is_default = 1;
    UPDATE categories SET color = '#9E9E9E' WHERE name = 'Other Expense'     AND is_default = 1;
    UPDATE categories SET color = '#4CAF50' WHERE name = 'Salary'            AND is_default = 1;
    UPDATE categories SET color = '#FF5722' WHERE name = 'Freelance'         AND is_default = 1;
    UPDATE categories SET color = '#03A9F4' WHERE name = 'Investment'        AND is_default = 1;
    UPDATE categories SET color = '#E91E63' WHERE name = 'Gift'              AND is_default = 1;
    UPDATE categories SET color = '#78909C' WHERE name = 'Other Income'      AND is_default = 1;
  `);
}
