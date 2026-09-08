import type { TransactionWithDetails, TransferWithDetails } from '@/types';
import { getTransferSide } from '@/features/transfers/transferSide';

export type TransactionListItem =
  | { kind: 'tx'; item: TransactionWithDetails }
  | { kind: 'transfer'; item: TransferWithDetails };

export type SectionCurrencySummary = {
  currency: string;
  net: number;
};

export function getSectionAmountColor(net: number): string {
  return net >= 0 ? '#4CAF50' : '#F44336';
}

export function getSectionCurrencySummary(
  items: TransactionListItem[],
  selectedId: number | null,
  fallbackCurrency: string,
): SectionCurrencySummary[] {
  const totalsByCurrency = new Map<string, number>();

  for (const listItem of items) {
    let currency: string;
    let amount: number;

    if (listItem.kind === 'tx') {
      currency = listItem.item.account_currency || fallbackCurrency;
      amount = listItem.item.type === 'income' ? listItem.item.amount : -listItem.item.amount;
    } else {
      if (selectedId === null) {
        continue;
      }

      const side = getTransferSide(listItem.item, selectedId, fallbackCurrency);
      currency = side.currency;
      amount = side.isOutgoing ? -side.amount : side.amount;
    }

    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + amount);
  }

  return Array.from(totalsByCurrency.entries())
    .map(([currency, net]) => ({ currency, net }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
