/**
 * Monefy CSV parser and converter.
 *
 * Monefy exports a CSV with the following columns:
 * date, account, category, amount, currency, converted amount, currency, description
 *
 * - Delimiter: comma (RFC 4180, amounts are quoted when they contain commas)
 * - Date format: DD/MM/YYYY
 * - Negative amounts = expenses, positive amounts = income
 * - Transfers appear as two rows: "To 'AccountName'" (negative) and "From 'AccountName'" (positive)
 *   We use only the "To" rows to build transfers and skip the "From" rows.
 */

import type { Account, Category, Transaction, Transfer } from '@/types';
import type { ExportData } from '@/db';

// ─── CSV parsing ──────────────────────────────────────────────────────────────

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/** Parse amount string like "2,43,896" or "-1,490" or "0.18" into a number. */
function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, '')) || 0;
}

/** Convert DD/MM/YYYY to YYYY-MM-DD. */
function convertDate(ddmmyyyy: string): string {
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return ddmmyyyy;
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { color: string; icon: string }> = {
  'Bills':          { color: '#607D8B', icon: 'receipt' },
  'Car':            { color: '#2196F3', icon: 'directions-car' },
  'Clothes':        { color: '#9C27B0', icon: 'checkroom' },
  'Communications': { color: '#00BCD4', icon: 'phone' },
  'Deposits':       { color: '#03A9F4', icon: 'account-balance' },
  'Eating out':     { color: '#FF5722', icon: 'restaurant' },
  'Entertainment':  { color: '#FF9800', icon: 'movie' },
  'Food':           { color: '#4CAF50', icon: 'local-grocery-store' },
  'Gifts':          { color: '#E91E63', icon: 'card-giftcard' },
  'Health':         { color: '#F44336', icon: 'local-hospital' },
  'House':          { color: '#795548', icon: 'home' },
  'Pets':           { color: '#8BC34A', icon: 'pets' },
  'Salary':         { color: '#4CAF50', icon: 'work' },
  'Savings':        { color: '#009688', icon: 'savings' },
  'Sports':         { color: '#CDDC39', icon: 'sports-soccer' },
  'Taxi':           { color: '#FFC107', icon: 'local-taxi' },
  'Toiletry':       { color: '#FFEB3B', icon: 'soap' },
  'Transport':      { color: '#3F51B5', icon: 'directions-bus' },
};

const FALLBACK_EXPENSE = { color: '#9E9E9E', icon: 'more-horiz' };
const FALLBACK_INCOME  = { color: '#9E9E9E', icon: 'attach-money' };

const ACCOUNT_COLORS = [
  '#55A3FF', '#4CAF50', '#FF9800', '#E91E63',
  '#9C27B0', '#00BCD4', '#FF5722', '#607D8B',
];

// ─── Public API ───────────────────────────────────────────────────────────────

export interface MonefyRecord {
  date: string;       // YYYY-MM-DD
  account: string;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
}

/** Parse raw CSV text from a Monefy export into MonefyRecord[]. */
export function parseMonefyCsv(csv: string): MonefyRecord[] {
  const lines = csv.trim().split('\n');
  // Skip header row
  return lines.slice(1).flatMap((line) => {
    if (!line.trim()) return [];
    const cols = parseCSVRow(line);
    if (cols.length < 5) return [];
    return [{
      date:        convertDate(cols[0]),
      account:     cols[1],
      category:    cols[2],
      amount:      parseAmount(cols[3]),
      currency:    cols[4],
      description: cols[7]?.trim() || null,
    }];
  });
}

/**
 * Convert parsed Monefy records into the app's ExportData format,
 * ready to pass directly to useImportDb().importAll().
 */
export function convertMonefyToExportData(records: MonefyRecord[]): ExportData {
  const TO_PATTERN   = /^To '(.+)'$/;
  const FROM_PATTERN = /^From '(.+)'$/;
  const now = new Date().toISOString();

  // ── Accounts ──────────────────────────────────────────────────────────────
  const accountNames = [...new Set(records.map((r) => r.account))];
  const accounts: Account[] = accountNames.map((name, i) => ({
    id:              i + 1,
    name,
    initial_balance: 0,
    currency:        records.find((r) => r.account === name)?.currency ?? 'INR',
    color:           ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
    icon:            'account-balance-wallet',
    created_at:      now,
  }));
  const accountIdByName = new Map(accounts.map((a) => [a.name, a.id]));

  // ── Split records ─────────────────────────────────────────────────────────
  const transferRecords = records.filter((r) => TO_PATTERN.test(r.category));
  const regularRecords  = records.filter((r) =>
    !TO_PATTERN.test(r.category) && !FROM_PATTERN.test(r.category)
  );

  // ── Categories ────────────────────────────────────────────────────────────
  // Preserve insertion order so IDs are stable
  const categoryMap = new Map<string, { type: 'income' | 'expense' }>();
  for (const r of regularRecords) {
    if (!categoryMap.has(r.category)) {
      categoryMap.set(r.category, { type: r.amount >= 0 ? 'income' : 'expense' });
    }
  }

  const categories: Category[] = [];
  let catId = 1;
  const categoryIdByName = new Map<string, number>();

  for (const [name, { type }] of categoryMap) {
    const meta = CATEGORY_META[name] ?? (type === 'income' ? FALLBACK_INCOME : FALLBACK_EXPENSE);
    categories.push({ id: catId, name, type, color: meta.color, icon: meta.icon, is_default: 0 });
    categoryIdByName.set(name, catId);
    catId++;
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  const transactions: Transaction[] = regularRecords.map((r, i) => ({
    id:          i + 1,
    amount:      Math.abs(r.amount),
    type:        r.amount >= 0 ? 'income' : 'expense',
    category_id: categoryIdByName.get(r.category)!,
    account_id:  accountIdByName.get(r.account)!,
    note:        r.description,
    date:        r.date,
    created_at:  now,
  }));

  // ── Transfers ─────────────────────────────────────────────────────────────
  const transfers: Transfer[] = transferRecords.flatMap((r, i) => {
    const match = TO_PATTERN.exec(r.category);
    if (!match) return [];
    const toAccountId = accountIdByName.get(match[1]);
    if (toAccountId == null) return []; // destination account not found, skip
    return [{
      id:              i + 1,
      from_account_id: accountIdByName.get(r.account)!,
      to_account_id:   toAccountId,
      amount:          Math.abs(r.amount),
      note:            r.description,
      date:            r.date,
      created_at:      now,
    }];
  });

  return {
    version:      1,
    accounts,
    categories,
    transactions,
    transfers,
    settings:     { currency: records[0]?.currency ?? 'INR' },
  };
}
