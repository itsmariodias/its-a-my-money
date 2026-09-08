import type { TransferWithDetails } from '@/types';

export interface TransferSide {
  /** True when the viewed account is the source of the transfer. */
  isOutgoing: boolean;
  /** Amount on the viewed side — `to_amount` credits the destination on cross-currency transfers. */
  amount: number;
  /** Currency of the viewed side's account; `fallbackCurrency` when that account was deleted. */
  currency: string;
  /** Name of the account on the *other* side, or 'Unknown' when it was deleted. */
  otherName: string;
}

/**
 * Resolves how a transfer reads from one account's point of view.
 *
 * The displayed amount and currency follow the side being viewed: the source side is
 * `amount` in the from-account's currency, the destination side is `to_amount` (or `amount`
 * when same-currency) in the to-account's currency.
 */
export function getTransferSide(
  transfer: TransferWithDetails,
  viewedAccountId: number | null,
  fallbackCurrency: string,
): TransferSide {
  const isOutgoing = transfer.from_account_id === viewedAccountId;
  return {
    isOutgoing,
    amount: isOutgoing ? transfer.amount : (transfer.to_amount ?? transfer.amount),
    currency: (isOutgoing ? transfer.from_account_currency : transfer.to_account_currency) || fallbackCurrency,
    otherName: (isOutgoing ? transfer.to_account_name : transfer.from_account_name) ?? 'Unknown',
  };
}
