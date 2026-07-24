import type { TransactionWithDetails, TransferWithDetails } from '@/types';

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
  accountCurrencyById: Record<number, string>,
  fallbackCurrency: string,
): SectionCurrencySummary[] {
  const totalsByCurrency = new Map<string, number>();

  for (const listItem of items) {
    let currency: string;
    let amount: number;

    if (listItem.kind === 'tx') {
      currency = accountCurrencyById[listItem.item.account_id] ?? fallbackCurrency;
      amount = listItem.item.type === 'income' ? listItem.item.amount : -listItem.item.amount;
    } else {
      if (selectedId === null) {
        continue;
      }

      const transfer = listItem.item;
      const isOutgoing = transfer.from_account_id === selectedId;
      const sideAccountId = isOutgoing ? transfer.from_account_id : transfer.to_account_id;
      currency = (sideAccountId != null ? accountCurrencyById[sideAccountId] : undefined) ?? fallbackCurrency;
      amount = isOutgoing ? -transfer.amount : (transfer.to_amount ?? transfer.amount);
    }

    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + amount);
  }

  return Array.from(totalsByCurrency.entries())
    .map(([currency, net]) => ({ currency, net }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
