import { useSQLiteContext } from 'expo-sqlite';
import type { Account, Category, Transaction, Transfer, TransactionWithDetails } from '@/types';

// --- Accounts ---

export function useAccountsDb() {
  const db = useSQLiteContext();

  return {
    getAll: () => db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name ASC'),

    insert: (account: Omit<Account, 'id' | 'created_at'>) =>
      db.runAsync(
        'INSERT INTO accounts (name, initial_balance, currency, color, icon) VALUES (?, ?, ?, ?, ?)',
        account.name, account.initial_balance, account.currency, account.color ?? null, account.icon ?? null
      ),

    update: (id: number, account: Partial<Omit<Account, 'id' | 'created_at'>>) =>
      db.runAsync(
        'UPDATE accounts SET name=?, initial_balance=?, currency=?, color=?, icon=? WHERE id=?',
        account.name!, account.initial_balance!, account.currency!, account.color ?? null, account.icon ?? null, id
      ),

    remove: (id: number) => db.runAsync('DELETE FROM accounts WHERE id=?', id),
  };
}

// --- Categories ---

export function useCategoriesDb() {
  const db = useSQLiteContext();

  return {
    getAll: () => db.getAllAsync<Category>('SELECT * FROM categories ORDER BY type, name ASC'),
    getByType: (type: 'income' | 'expense') =>
      db.getAllAsync<Category>('SELECT * FROM categories WHERE type=? ORDER BY name ASC', type),
    insert: (cat: Omit<Category, 'id'>) =>
      db.runAsync(
        'INSERT INTO categories (name, type, color, icon, is_default) VALUES (?, ?, ?, ?, 0)',
        cat.name, cat.type, cat.color, cat.icon
      ),
    update: (id: number, cat: Partial<Omit<Category, 'id'>>) =>
      db.runAsync(
        'UPDATE categories SET name=?, type=?, color=?, icon=? WHERE id=?',
        cat.name!, cat.type!, cat.color!, cat.icon!, id
      ),
    remove: (id: number) => db.runAsync('DELETE FROM categories WHERE id=?', id),
    countTransactions: (id: number) =>
      db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM transactions WHERE category_id=?', id),
  };
}

// --- Settings ---

export function useSettingsDb() {
  const db = useSQLiteContext();

  return {
    get: (key: string) =>
      db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', key),
    set: (key: string, value: string) =>
      db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value),
  };
}

// --- Transactions ---

export function useTransactionsDb() {
  const db = useSQLiteContext();

  return {
    getAll: () =>
      db.getAllAsync<TransactionWithDetails>(`
        SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, a.name as account_name
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        JOIN accounts a ON t.account_id = a.id
        ORDER BY t.date DESC, t.created_at DESC
      `),

    getByMonth: (year: number, month: number) =>
      db.getAllAsync<TransactionWithDetails>(`
        SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, a.name as account_name
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        JOIN accounts a ON t.account_id = a.id
        WHERE strftime('%Y', t.date) = ? AND strftime('%m', t.date) = ?
        ORDER BY t.date DESC, t.created_at DESC
      `, String(year), String(month).padStart(2, '0')),

    insert: (tx: Omit<Transaction, 'id' | 'created_at'>) =>
      db.runAsync(
        'INSERT INTO transactions (amount, type, category_id, account_id, note, date) VALUES (?, ?, ?, ?, ?, ?)',
        tx.amount, tx.type, tx.category_id, tx.account_id, tx.note ?? null, tx.date
      ),

    update: (id: number, tx: Partial<Omit<Transaction, 'id' | 'created_at'>>) =>
      db.runAsync(
        'UPDATE transactions SET amount=?, type=?, category_id=?, account_id=?, note=?, date=? WHERE id=?',
        tx.amount!, tx.type!, tx.category_id!, tx.account_id!, tx.note ?? null, tx.date!, id
      ),

    getById: (id: number) =>
      db.getFirstAsync<TransactionWithDetails>(`
        SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, a.name as account_name
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        JOIN accounts a ON t.account_id = a.id
        WHERE t.id = ?
      `, id),

    remove: (id: number) => db.runAsync('DELETE FROM transactions WHERE id=?', id),

    removeByAccount: (accountId: number) =>
      db.runAsync('DELETE FROM transactions WHERE account_id=?', accountId),

    removeByCategory: (categoryId: number) =>
      db.runAsync('DELETE FROM transactions WHERE category_id=?', categoryId),
  };
}

// --- Balance ---

export function useBalanceDb() {
  const db = useSQLiteContext();

  return {
    getTotalBalance: () =>
      db.getFirstAsync<{ total_balance: number }>(`
        SELECT
          (SELECT COALESCE(SUM(initial_balance), 0) FROM accounts) +
          (SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) FROM transactions)
        AS total_balance
      `),
  };
}

// --- Reset ---

export function useResetDb() {
  const db = useSQLiteContext();

  return {
    resetAll: async () => {
      await db.execAsync(`
        DELETE FROM transactions;
        DELETE FROM transfers;
        DELETE FROM budgets;
        DELETE FROM accounts;
        DELETE FROM categories;
        INSERT INTO accounts (name, initial_balance, currency, color, icon)
          VALUES ('Cash', 0, 'USD', '#55A3FF', 'account-balance-wallet');
        INSERT INTO categories (name, type, color, icon, is_default) VALUES
          ('Food & Drinks', 'expense', '#FF6B6B', 'restaurant', 1),
          ('Transport', 'expense', '#4ECDC4', 'directions-car', 1),
          ('Shopping', 'expense', '#45B7D1', 'shopping-cart', 1),
          ('Entertainment', 'expense', '#96CEB4', 'movie', 1),
          ('Health', 'expense', '#FFEAA7', 'local-hospital', 1),
          ('Bills & Utilities', 'expense', '#DDA0DD', 'receipt', 1),
          ('Housing', 'expense', '#98D8C8', 'home', 1),
          ('Other Expense', 'expense', '#B0B0B0', 'more-horiz', 1),
          ('Salary', 'income', '#55A3FF', 'work', 1),
          ('Freelance', 'income', '#FF9F43', 'laptop', 1),
          ('Investment', 'income', '#48DBFB', 'trending-up', 1),
          ('Gift', 'income', '#FF6B9D', 'card-giftcard', 1),
          ('Other Income', 'income', '#B0B0B0', 'more-horiz', 1);
        INSERT OR REPLACE INTO settings (key, value) VALUES ('currency', 'USD');
      `);
    },
  };
}

// --- Transfers ---

export function useTransfersDb() {
  const db = useSQLiteContext();

  return {
    getAll: () => db.getAllAsync<Transfer>('SELECT * FROM transfers ORDER BY date DESC'),

    insert: (transfer: Omit<Transfer, 'id' | 'created_at'>) =>
      db.runAsync(
        'INSERT INTO transfers (from_account_id, to_account_id, amount, note, date) VALUES (?, ?, ?, ?, ?)',
        transfer.from_account_id, transfer.to_account_id, transfer.amount, transfer.note ?? null, transfer.date
      ),

    remove: (id: number) => db.runAsync('DELETE FROM transfers WHERE id=?', id),
  };
}
