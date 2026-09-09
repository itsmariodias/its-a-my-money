import type { TransferWithDetails } from '@/types';
import { getTransferSide } from './transferSide';

const makeTransfer = (overrides: Partial<TransferWithDetails> = {}): TransferWithDetails => ({
  id: 1,
  from_account_id: 1,
  to_account_id: 2,
  amount: 100,
  to_amount: null,
  note: null,
  date: '2026-01-01',
  recurring_transaction_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  from_account_name: 'Checking',
  from_account_color: null,
  from_account_icon: null,
  from_account_currency: 'AUD',
  to_account_name: 'Rupee Wallet',
  to_account_color: null,
  to_account_icon: null,
  to_account_currency: 'INR',
  ...overrides,
});

describe('getTransferSide', () => {
  it('reads the source side in the source account currency', () => {
    // Given a cross-currency transfer of A$100 that lands as ₹5500
    const transfer = makeTransfer({ amount: 100, to_amount: 5500 });

    // When viewed from the source account
    const side = getTransferSide(transfer, 1, 'USD');

    // Then it is an outgoing A$100 towards the rupee wallet
    expect(side).toEqual({ isOutgoing: true, amount: 100, currency: 'AUD', otherName: 'Rupee Wallet' });
  });

  it('reads the destination side in the destination account currency', () => {
    // Given the same transfer
    const transfer = makeTransfer({ amount: 100, to_amount: 5500 });

    // When viewed from the destination account
    const side = getTransferSide(transfer, 2, 'USD');

    // Then it is an incoming ₹5500 from checking
    expect(side).toEqual({ isOutgoing: false, amount: 5500, currency: 'INR', otherName: 'Checking' });
  });

  it('uses the single amount on both sides of a same-currency transfer', () => {
    // Given a same-currency transfer, where to_amount is null by convention
    const transfer = makeTransfer({ amount: 80, to_amount: null, to_account_currency: 'AUD' });

    // When viewed from either side
    // Then both see the same amount
    expect(getTransferSide(transfer, 1, 'USD').amount).toBe(80);
    expect(getTransferSide(transfer, 2, 'USD').amount).toBe(80);
  });

  it('falls back to the given currency when the viewed account was deleted', () => {
    // Given a transfer whose destination account was deleted (ON DELETE SET NULL)
    const transfer = makeTransfer({ to_account_id: null, to_account_name: null, to_account_currency: null });

    // When viewed from anything other than the surviving source account
    const side = getTransferSide(transfer, null, 'USD');

    // Then the row still renders, using the fallback currency and an Unknown counterpart
    expect(side).toEqual({ isOutgoing: false, amount: 100, currency: 'USD', otherName: 'Checking' });
  });

  it('names the other side Unknown when that account was deleted', () => {
    // Given a transfer whose destination was deleted, viewed from the surviving source
    const transfer = makeTransfer({ to_account_id: null, to_account_name: null, to_account_currency: null });

    // When viewed from the source account
    const side = getTransferSide(transfer, 1, 'USD');

    // Then the source currency still applies and the counterpart reads as Unknown
    expect(side).toEqual({ isOutgoing: true, amount: 100, currency: 'AUD', otherName: 'Unknown' });
  });
});
