import type { TransactionWithDetails, TransferWithDetails } from '@/types';
import { getTransferSide } from '@/features/transfers/transferSide';

export type TransactionListItem =
  | { kind: 'tx'; item: TransactionWithDetails }
  | { kind: 'transfer'; item: TransferWithDetails };

export type SectionCurrencySummary = {
  currency: string;
  net: number;
};

/**
 * Rolls signed per-row amounts into one subtotal per currency, ordered by currency code.
 * The app never converts between currencies, so every aggregate is a list, not a number.
 */
export function rollUpByCurrency(rows: { currency: string; amount: number }[]): SectionCurrencySummary[] {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amount);
  return Array.from(totals.entries())
    .map(([currency, net]) => ({ currency, net }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/** The subtotal in one currency, or 0 when the aggregate holds nothing in it. */
export function netInCurrency(summary: SectionCurrencySummary[], currency: string): number {
  return summary.find((s) => s.currency === currency)?.net ?? 0;
}

export function getSectionAmountColor(net: number): string {
  return net >= 0 ? '#4CAF50' : '#F44336';
}

export function getSectionCurrencySummary(
  items: TransactionListItem[],
  selectedId: number | null,
  fallbackCurrency: string,
): SectionCurrencySummary[] {
  const rows: { currency: string; amount: number }[] = [];

  for (const listItem of items) {
    if (listItem.kind === 'tx') {
      rows.push({
        currency: listItem.item.account_currency || fallbackCurrency,
        amount: listItem.item.type === 'income' ? listItem.item.amount : -listItem.item.amount,
      });
    } else {
      // Without a selected account there is no side to read a transfer from.
      if (selectedId === null) continue;
      const side = getTransferSide(listItem.item, selectedId, fallbackCurrency);
      rows.push({ currency: side.currency, amount: side.isOutgoing ? -side.amount : side.amount });
    }
  }

  return rollUpByCurrency(rows);
}
