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
    (tr.from_account_id === null || typeof tr.from_account_id === 'number') &&
    (tr.to_account_id === null || typeof tr.to_account_id === 'number') &&
    (tr.to_amount == null || typeof tr.to_amount === 'number') &&
    typeof tr.date === 'string'
  );
}

function isValidRecurring(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const r = item as Record<string, unknown>;
  const kind = r.kind ?? 'transaction'; // older exports default to transaction
  if (kind !== 'transaction' && kind !== 'transfer') return false;
  const validFrequency = r.frequency === 'daily' || r.frequency === 'weekly' || r.frequency === 'monthly' || r.frequency === 'yearly';
  if (
    typeof r.id !== 'number' ||
    typeof r.amount !== 'number' ||
    typeof r.account_id !== 'number' ||
    !validFrequency ||
    typeof r.start_date !== 'string' ||
    typeof r.next_due_date !== 'string'
  ) return false;
  if (kind === 'transfer') {
    return typeof r.to_account_id === 'number';
  }
  return (
    (r.type === 'income' || r.type === 'expense') &&
    typeof r.category_id === 'number'
  );
}

function isValidBudget(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const b = item as Record<string, unknown>;
  return (
    typeof b.id === 'number' &&
    typeof b.category_id === 'number' &&
    typeof b.amount === 'number' &&
    (b.period === 'weekly' || b.period === 'monthly' || b.period === 'yearly') &&
    typeof b.currency === 'string'
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
    d.transfers.every(isValidTransfer) &&
    (d.recurring_transactions == null || (Array.isArray(d.recurring_transactions) && d.recurring_transactions.every(isValidRecurring))) &&
    (d.budgets == null || (Array.isArray(d.budgets) && d.budgets.every(isValidBudget)))
  );
}
