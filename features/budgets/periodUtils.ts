import type { BudgetPeriod, Transaction } from '@/types';

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function currentPeriodRange(period: BudgetPeriod, today: Date = new Date()): { start: string; end: string } {
  if (period === 'weekly') {
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const offsetFromMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offsetFromMonday);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { start: toISO(monday), end: toISO(sunday) };
  }
  if (period === 'monthly') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: toISO(first), end: toISO(last) };
  }
  // yearly
  const first = new Date(today.getFullYear(), 0, 1);
  const last = new Date(today.getFullYear(), 11, 31);
  return { start: toISO(first), end: toISO(last) };
}

export function spentInRange(
  transactions: Pick<Transaction, 'type' | 'category_id' | 'amount' | 'date' | 'account_id'>[],
  categoryId: number,
  start: string,
  end: string,
  // Optional currency filter: when provided, only transactions whose account
  // currency matches are counted. Omitting it keeps the pre-multi-currency behavior
  // (sum across all accounts) — useful for tests and callers that don't care.
  currencyFilter?: { currency: string; accountCurrencyById: Record<number, string> },
): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (t.category_id !== categoryId) continue;
    if (t.date < start || t.date > end) continue;
    if (currencyFilter) {
      const accCurrency = currencyFilter.accountCurrencyById[t.account_id];
      if (accCurrency !== currencyFilter.currency) continue;
    }
    sum += t.amount;
  }
  return sum;
}

export function periodLabel(period: BudgetPeriod): string {
  if (period === 'weekly') return 'Weekly';
  if (period === 'monthly') return 'Monthly';
  return 'Yearly';
}
