import type { SQLiteDatabase } from 'expo-sqlite';
import type { Account, Category, Transaction, Transfer, RecurringTransaction } from '@/types';

export interface ExportJson {
  version: number;
  exported_at: string;
  accounts: Account[];
  categories: Category[];
  transactions: Omit<Transaction, never>[];
  transfers: Omit<Transfer, never>[];
  recurring_transactions: RecurringTransaction[];
  settings: {
    currency: string;
    accent_color: string | null;
    number_format: string;
    biometric_lock: string;
    theme_id: string | null;
  };
}

export async function generateExportData(db: SQLiteDatabase): Promise<ExportJson> {
  const [accounts, categories, rawTxns, rawTransfers, rawRecurring] = await Promise.all([
    db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name ASC'),
    db.getAllAsync<Category>('SELECT * FROM categories ORDER BY type, name ASC'),
    db.getAllAsync<Transaction>('SELECT id, amount, type, category_id, account_id, note, date, recurring_transaction_id, created_at FROM transactions ORDER BY date DESC, created_at DESC'),
    db.getAllAsync<Transfer>('SELECT id, from_account_id, to_account_id, amount, note, date, created_at FROM transfers ORDER BY date DESC, created_at DESC'),
    db.getAllAsync<RecurringTransaction>('SELECT * FROM recurring_transactions ORDER BY created_at ASC'),
  ]);

  const [currencyRow, accentRow, formatRow, biometricRow, themeRow] = await Promise.all([
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'currency'),
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'accent_color'),
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'number_format'),
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'biometric_lock'),
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'theme_id'),
  ]);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    accounts,
    categories,
    transactions: rawTxns,
    transfers: rawTransfers,
    recurring_transactions: rawRecurring,
    settings: {
      currency: currencyRow?.value ?? 'USD',
      accent_color: accentRow?.value ?? null,
      number_format: formatRow?.value ?? 'en-US',
      biometric_lock: biometricRow?.value ?? 'false',
      theme_id: themeRow?.value ?? null,
    },
  };
}

export async function generateExportJson(db: SQLiteDatabase): Promise<string> {
  const data = await generateExportData(db);
  return JSON.stringify(data, null, 2);
}
