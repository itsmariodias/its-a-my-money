import { useSQLiteContext } from 'expo-sqlite';
import type { Account, Category, Transaction, Transfer, TransactionWithDetails, TransferWithDetails, RecurringTransaction, RecurringTransactionWithDetails } from '@/types';

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

    adjustInitialBalance: (id: number, delta: number) =>
      db.runAsync('UPDATE accounts SET initial_balance = initial_balance + ? WHERE id=?', delta, id),
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
        'INSERT INTO transactions (amount, type, category_id, account_id, note, date, recurring_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        tx.amount, tx.type, tx.category_id, tx.account_id, tx.note ?? null, tx.date, tx.recurring_transaction_id ?? null
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

    removeByRecurring: (recurringId: number) =>
      db.runAsync('DELETE FROM transactions WHERE recurring_transaction_id=?', recurringId),
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
        DELETE FROM recurring_transactions;
        DELETE FROM transactions;
        DELETE FROM transfers;
        DELETE FROM budgets;
        DELETE FROM accounts;
        DELETE FROM categories;
        INSERT INTO accounts (name, initial_balance, currency, color, icon)
          VALUES ('Cash', 0, 'USD', '#4CAF50', 'account-balance-wallet');
        INSERT INTO categories (name, type, color, icon, is_default) VALUES
          ('Bills', 'expense', '#607D8B', 'receipt', 1),
          ('Car', 'expense', '#2196F3', 'directions-car', 1),
          ('Clothes', 'expense', '#9C27B0', 'checkroom', 1),
          ('Communications', 'expense', '#00BCD4', 'phone', 1),
          ('Eating out', 'expense', '#FF5722', 'restaurant', 1),
          ('Entertainment', 'expense', '#FF9800', 'movie', 1),
          ('Food', 'expense', '#4CAF50', 'local-grocery-store', 1),
          ('Gifts', 'expense', '#E91E63', 'card-giftcard', 1),
          ('Health', 'expense', '#F44336', 'local-hospital', 1),
          ('House', 'expense', '#795548', 'home', 1),
          ('Pets', 'expense', '#8BC34A', 'pets', 1),
          ('Sports', 'expense', '#CDDC39', 'sports-soccer', 1),
          ('Taxi', 'expense', '#FFC107', 'local-taxi', 1),
          ('Toiletry', 'expense', '#FFEB3B', 'soap', 1),
          ('Transport', 'expense', '#3F51B5', 'directions-bus', 1),
          ('Other Expense', 'expense', '#9E9E9E', 'more-horiz', 1),
          ('Deposits', 'income', '#03A9F4', 'account-balance', 1),
          ('Freelance', 'income', '#673AB7', 'laptop', 1),
          ('Gift', 'income', '#E91E63', 'redeem', 1),
          ('Investment', 'income', '#4CAF50', 'trending-up', 1),
          ('Salary', 'income', '#4CAF50', 'work', 1),
          ('Savings', 'income', '#009688', 'savings', 1),
          ('Other Income', 'income', '#9E9E9E', 'attach-money', 1);
        INSERT OR REPLACE INTO settings (key, value) VALUES ('currency', 'USD');
        DELETE FROM settings WHERE key IN ('accent_color', 'number_format');
      `);
    },
  };
}

// --- Import ---

export interface ExportData {
  version: number;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  transfers: Transfer[];
  recurring_transactions?: RecurringTransaction[];
  settings?: { currency?: string; accent_color?: string; number_format?: string; biometric_lock?: string; theme_id?: string };
}

export function useImportDb() {
  const db = useSQLiteContext();

  return {
    importAll: async (data: ExportData) => {
      await db.withTransactionAsync(async () => {
        // 1. Wipe transactions, transfers, budgets, accounts (not categories)
        await db.runAsync('DELETE FROM recurring_transactions');
        await db.runAsync('DELETE FROM transfers');
        await db.runAsync('DELETE FROM transactions');
        await db.runAsync('DELETE FROM budgets');
        await db.runAsync('DELETE FROM accounts');

        // 2. Categories: merge by name — reuse existing, insert only new ones.
        //    Build a remapping from ExportData category ID → actual DB category ID.
        const existing = await db.getAllAsync<{ id: number; name: string }>(
          'SELECT id, name FROM categories'
        );
        const existingIdByName = new Map(existing.map((c) => [c.name, c.id]));
        const categoryIdMap = new Map<number, number>();

        for (const cat of data.categories) {
          if (existingIdByName.has(cat.name)) {
            categoryIdMap.set(cat.id, existingIdByName.get(cat.name)!);
          } else {
            const result = await db.runAsync(
              'INSERT INTO categories (name, type, color, icon, is_default) VALUES (?, ?, ?, ?, ?)',
              cat.name, cat.type, cat.color, cat.icon, cat.is_default
            );
            categoryIdMap.set(cat.id, result.lastInsertRowId);
          }
        }

        // 3. Accounts
        for (const acc of data.accounts) {
          await db.runAsync(
            'INSERT INTO accounts (id, name, initial_balance, currency, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            acc.id, acc.name, acc.initial_balance, acc.currency, acc.color ?? null, acc.icon ?? null, acc.created_at
          );
        }

        // 4. Recurring transactions (remap category_id)
        const recurringIdMap = new Map<number, number>();
        if (data.recurring_transactions) {
          for (const rec of data.recurring_transactions) {
            const actualCategoryId = categoryIdMap.get(rec.category_id) ?? rec.category_id;
            const result = await db.runAsync(
              'INSERT INTO recurring_transactions (amount, type, category_id, account_id, note, frequency, start_date, end_date, next_due_date, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              rec.amount, rec.type, actualCategoryId, rec.account_id, rec.note ?? null,
              rec.frequency, rec.start_date, rec.end_date ?? null, rec.next_due_date, rec.is_active, rec.created_at
            );
            recurringIdMap.set(rec.id, result.lastInsertRowId);
          }
        }

        // 5. Transactions (remap category_id to actual DB id)
        for (const tx of data.transactions) {
          const actualCategoryId = categoryIdMap.get(tx.category_id) ?? tx.category_id;
          const actualRecurringId = tx.recurring_transaction_id != null
            ? (recurringIdMap.get(tx.recurring_transaction_id) ?? null)
            : null;
          await db.runAsync(
            'INSERT INTO transactions (id, amount, type, category_id, account_id, note, date, recurring_transaction_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            tx.id, tx.amount, tx.type, actualCategoryId, tx.account_id, tx.note ?? null, tx.date, actualRecurringId, tx.created_at
          );
        }

        // 6. Transfers
        for (const tr of data.transfers) {
          await db.runAsync(
            'INSERT INTO transfers (id, from_account_id, to_account_id, amount, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            tr.id, tr.from_account_id, tr.to_account_id, tr.amount, tr.note ?? null, tr.date, tr.created_at
          );
        }

        // 7. Settings
        if (data.settings) {
          for (const [key, value] of Object.entries(data.settings)) {
            if (value != null) {
              await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
            }
          }
        }
      });
    },
  };
}

// --- Transfers ---

const TRANSFER_SELECT = `
  SELECT t.*,
    fa.name as from_account_name, fa.color as from_account_color, fa.icon as from_account_icon,
    ta.name as to_account_name, ta.color as to_account_color, ta.icon as to_account_icon
  FROM transfers t
  LEFT JOIN accounts fa ON fa.id = t.from_account_id
  LEFT JOIN accounts ta ON ta.id = t.to_account_id
`;

export function useTransfersDb() {
  const db = useSQLiteContext();

  return {
    getAll: () =>
      db.getAllAsync<TransferWithDetails>(
        `${TRANSFER_SELECT} ORDER BY t.date DESC, t.created_at DESC`
      ),

    getById: (id: number) =>
      db.getFirstAsync<TransferWithDetails>(
        `${TRANSFER_SELECT} WHERE t.id = ?`, id
      ),

    insert: (transfer: Omit<Transfer, 'id' | 'created_at'>) =>
      db.runAsync(
        'INSERT INTO transfers (from_account_id, to_account_id, amount, note, date) VALUES (?, ?, ?, ?, ?)',
        transfer.from_account_id, transfer.to_account_id, transfer.amount, transfer.note ?? null, transfer.date
      ),

    update: (id: number, transfer: Partial<Omit<Transfer, 'id' | 'created_at'>>) =>
      db.runAsync(
        'UPDATE transfers SET from_account_id=?, to_account_id=?, amount=?, note=?, date=? WHERE id=?',
        transfer.from_account_id!, transfer.to_account_id!, transfer.amount!, transfer.note ?? null, transfer.date!, id
      ),

    remove: (id: number) => db.runAsync('DELETE FROM transfers WHERE id=?', id),

    getByAccount: (accountId: number) =>
      db.getAllAsync<Transfer>(
        'SELECT * FROM transfers WHERE from_account_id=? OR to_account_id=?', accountId, accountId
      ),

    removeByAccount: (accountId: number) =>
      db.runAsync('DELETE FROM transfers WHERE from_account_id=? OR to_account_id=?', accountId, accountId),
  };
}

// --- Recurring Transactions ---

const RECURRING_SELECT = `
  SELECT r.*,
    c.name as category_name, c.color as category_color, c.icon as category_icon,
    a.name as account_name
  FROM recurring_transactions r
  JOIN categories c ON r.category_id = c.id
  JOIN accounts a ON r.account_id = a.id
`;

export function useRecurringDb() {
  const db = useSQLiteContext();

  return {
    getAll: () =>
      db.getAllAsync<RecurringTransactionWithDetails>(
        `${RECURRING_SELECT} ORDER BY r.next_due_date ASC`
      ),

    getDue: (today: string) =>
      db.getAllAsync<RecurringTransactionWithDetails>(
        `${RECURRING_SELECT} WHERE r.is_active = 1 AND r.next_due_date <= ? AND (r.end_date IS NULL OR r.end_date >= ?)`,
        today, today
      ),

    getById: (id: number) =>
      db.getFirstAsync<RecurringTransactionWithDetails>(
        `${RECURRING_SELECT} WHERE r.id = ?`, id
      ),

    insert: (rec: Omit<RecurringTransaction, 'id' | 'created_at'>) =>
      db.runAsync(
        'INSERT INTO recurring_transactions (amount, type, category_id, account_id, note, frequency, start_date, end_date, next_due_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        rec.amount, rec.type, rec.category_id, rec.account_id, rec.note ?? null,
        rec.frequency, rec.start_date, rec.end_date ?? null, rec.next_due_date, rec.is_active
      ),

    update: (id: number, rec: Partial<Omit<RecurringTransaction, 'id' | 'created_at'>>) =>
      db.runAsync(
        'UPDATE recurring_transactions SET amount=?, type=?, category_id=?, account_id=?, note=?, frequency=?, start_date=?, end_date=?, next_due_date=?, is_active=? WHERE id=?',
        rec.amount!, rec.type!, rec.category_id!, rec.account_id!, rec.note ?? null,
        rec.frequency!, rec.start_date!, rec.end_date ?? null, rec.next_due_date!, rec.is_active!, id
      ),

    updateNextDueDate: (id: number, nextDate: string, isActive: number) =>
      db.runAsync(
        'UPDATE recurring_transactions SET next_due_date=?, is_active=? WHERE id=?',
        nextDate, isActive, id
      ),

    remove: (id: number) => db.runAsync('DELETE FROM recurring_transactions WHERE id=?', id),

    removeByAccount: (accountId: number) =>
      db.runAsync('DELETE FROM recurring_transactions WHERE account_id=?', accountId),

    removeByCategory: (categoryId: number) =>
      db.runAsync('DELETE FROM recurring_transactions WHERE category_id=?', categoryId),
  };
}
