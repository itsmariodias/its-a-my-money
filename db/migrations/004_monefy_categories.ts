import { type SQLiteDatabase } from 'expo-sqlite';

/**
 * Aligns default categories with Monefy export category names.
 * - Renames four existing defaults to match Monefy naming
 * - Adds new Monefy-specific categories that don't already exist
 */
export async function up(db: SQLiteDatabase): Promise<void> {
  // Rename existing defaults to match Monefy names
  await db.execAsync(`
    UPDATE categories SET name='Eating out' WHERE name='Food & Drinks' AND is_default=1;
    UPDATE categories SET name='Clothes'    WHERE name='Shopping'       AND is_default=1;
    UPDATE categories SET name='Bills'      WHERE name='Bills & Utilities' AND is_default=1;
    UPDATE categories SET name='House'      WHERE name='Housing'        AND is_default=1;
  `);

  // Add new Monefy categories only if they don't already exist (no UNIQUE constraint on name,
  // so we guard each insert with a NOT EXISTS check)
  const newCategories: Array<[string, string, string, string]> = [
    ['Car',           'expense', '#2196F3', 'directions-car'],
    ['Communications','expense', '#00BCD4', 'phone'],
    ['Food',          'expense', '#FF5722', 'local-grocery-store'],
    ['Gifts',         'expense', '#E91E63', 'card-giftcard'],
    ['Pets',          'expense', '#FF9800', 'pets'],
    ['Sports',        'expense', '#F44336', 'sports-soccer'],
    ['Taxi',          'expense', '#FFC107', 'local-taxi'],
    ['Toiletry',      'expense', '#26C6DA', 'soap'],
    ['Deposits',      'income',  '#03A9F4', 'account-balance'],
    ['Savings',       'income',  '#43A047', 'savings'],
  ];

  for (const [name, type, color, icon] of newCategories) {
    await db.runAsync(
      `INSERT INTO categories (name, type, color, icon, is_default)
       SELECT ?, ?, ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ?)`,
      name, type, color, icon, name
    );
  }
}
