import type { ExportData } from '@/db';

function isValidAccount(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const a = item as Record<string, unknown>;
  return (
    typeof a.id === 'number' &&
    typeof a.name === 'string' &&
    typeof a.initial_balance === 'number' &&
    typeof a.currency === 'string'
  );
}

function isValidCategory(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const c = item as Record<string, unknown>;
  return (
    typeof c.id === 'number' &&
    typeof c.name === 'string' &&
    (c.type === 'income' || c.type === 'expense') &&
    typeof c.icon === 'string' &&
    typeof c.color === 'string'
  );
}

function isValidTransaction(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const t = item as Record<string, unknown>;
  return (
    typeof t.id === 'number' &&
    typeof t.amount === 'number' &&
    (t.type === 'income' || t.type === 'expense') &&
    typeof t.category_id === 'number' &&
    typeof t.account_id === 'number' &&
    typeof t.date === 'string'
  );
}

function isValidTransfer(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const tr = item as Record<string, unknown>;
  return (
    typeof tr.id === 'number' &&
    typeof tr.amount === 'number' &&
    typeof tr.from_account_id === 'number' &&
    typeof tr.to_account_id === 'number' &&
    typeof tr.date === 'string'
  );
}

export function isValidExport(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    d.version === 1 &&
    Array.isArray(d.accounts) &&
    Array.isArray(d.categories) &&
    Array.isArray(d.transactions) &&
    Array.isArray(d.transfers) &&
    d.accounts.every(isValidAccount) &&
    d.categories.every(isValidCategory) &&
    d.transactions.every(isValidTransaction) &&
    d.transfers.every(isValidTransfer)
  );
}
