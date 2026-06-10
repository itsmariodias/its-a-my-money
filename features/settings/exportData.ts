import type { SQLiteDatabase } from 'expo-sqlite';
import type { Account, Category, Transaction, Transfer, RecurringTransaction, Budget } from '@/types';

export interface ExportJson {
  version: number;
  exported_at: string;
  accounts: Account[];
  categories: Category[];
  transactions: Omit<Transaction, never>[];
  transfers: Omit<Transfer, never>[];
  recurring_transactions: RecurringTransaction[];
  budgets: Budget[];
  settings: {
    currency: string;
    accent_color: string | null;
    number_format: string;
    biometric_lock: string;
    theme_id: string | null;
    show_pct_change: string;
    date_format: string;
  };
}

export async function generateExportData(db: SQLiteDatabase): Promise<ExportJson> {
  const [accounts, categories, rawTxns, rawTransfers, rawRecurring, rawBudgets] = await Promise.all([
    db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name ASC'),
    db.getAllAsync<Category>('SELECT * FROM categories ORDER BY type, name ASC'),
    db.getAllAsync<Transaction>('SELECT id, amount, type, category_id, account_id, note, date, recurring_transaction_id, created_at FROM transactions ORDER BY date DESC, created_at DESC'),
    db.getAllAsync<Transfer>('SELECT id, from_account_id, to_account_id, amount, to_amount, note, date, recurring_transaction_id, created_at FROM transfers ORDER BY date DESC, created_at DESC'),
    db.getAllAsync<RecurringTransaction>('SELECT * FROM recurring_transactions ORDER BY created_at ASC'),
    db.getAllAsync<Budget>('SELECT id, category_id, amount, period, currency, created_at FROM budgets ORDER BY created_at ASC'),
  ]);

  const [currencyRow, accentRow, formatRow, biometricRow, themeRow, pctRow, dateFmtRow] = await Promise.all([
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'currency'),
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'accent_color'),
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'number_format'),
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'biometric_lock'),
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'theme_id'),
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'show_pct_change'),
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'date_format'),
  ]);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    accounts,
    categories,
    transactions: rawTxns,
    transfers: rawTransfers,
    recurring_transactions: rawRecurring,
    budgets: rawBudgets,
    settings: {
      currency: currencyRow?.value ?? 'USD',
      accent_color: accentRow?.value ?? null,
      number_format: formatRow?.value ?? 'en-US',
      biometric_lock: biometricRow?.value ?? 'false',
      theme_id: themeRow?.value ?? null,
      show_pct_change: pctRow?.value ?? 'true',
      date_format: dateFmtRow?.value ?? 'DD/MM/YYYY',
    },
  };
}

export async function generateExportJson(db: SQLiteDatabase): Promise<string> {
  const data = await generateExportData(db);
  return JSON.stringify(data, null, 2);
}
