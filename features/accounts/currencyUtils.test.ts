import type { Account } from '@/types';
import { buildAccountCurrencyMap, getAccountCurrency } from './currencyUtils';

function makeAccount(id: number, currency: string, name = `Account ${id}`): Account {
  return {
    id,
    name,
    initial_balance: 0,
    currency,
    color: null,
    icon: null,
    account_type: 'cash',
    current_value: null,
    created_at: '2025-01-01T00:00:00.000Z',
  };
}

describe('getAccountCurrency', () => {
  it('returns the currency of the selected account', () => {
    // Given accounts in two different currencies
    const accounts = [makeAccount(1, 'AUD'), makeAccount(2, 'INR')];

    // When resolving the currency for the rupee account
    const result = getAccountCurrency(accounts, 2, 'AUD');

    // Then the account's own currency wins over the global default
    expect(result).toBe('INR');
  });

  it('falls back to the global default when no account is selected', () => {
    // Given a list of accounts but nothing selected yet
    const accounts = [makeAccount(1, 'INR')];

    // When resolving with a null account id
    // Then the global default is used
    expect(getAccountCurrency(accounts, null, 'AUD')).toBe('AUD');
    expect(getAccountCurrency(accounts, undefined, 'AUD')).toBe('AUD');
  });

  it('falls back to the global default when the account id is unknown', () => {
    // Given an id that matches no account (e.g. a deleted account)
    const accounts = [makeAccount(1, 'INR')];

    // When resolving that id
    const result = getAccountCurrency(accounts, 99, 'AUD');

    // Then the global default is used
    expect(result).toBe('AUD');
  });

  it('falls back to the global default when the account has no currency', () => {
    // Given a legacy account row with an empty currency
    const accounts = [makeAccount(1, '')];

    // When resolving it
    const result = getAccountCurrency(accounts, 1, 'AUD');

    // Then the global default fills the gap
    expect(result).toBe('AUD');
  });
});

describe('buildAccountCurrencyMap', () => {
  it('maps every account id to its own currency', () => {
    // Given a mixed-currency list of accounts
    const accounts = [makeAccount(1, 'AUD'), makeAccount(2, 'INR'), makeAccount(3, 'EUR')];

    // When building the lookup map
    const map = buildAccountCurrencyMap(accounts, 'USD');

    // Then each id resolves to its account's currency
    expect(map).toEqual({ 1: 'AUD', 2: 'INR', 3: 'EUR' });
  });

  it('uses the given fallback for accounts with no currency', () => {
    // Given one account missing a currency
    const accounts = [makeAccount(1, 'INR'), makeAccount(2, '')];

    // When building the map with a global default
    // Then only the empty one takes the fallback
    expect(buildAccountCurrencyMap(accounts, 'AUD')).toEqual({ 1: 'INR', 2: 'AUD' });

    // And an empty fallback is preserved verbatim (budget-crossing call site relies on this)
    expect(buildAccountCurrencyMap(accounts, '')).toEqual({ 1: 'INR', 2: '' });
  });

  it('returns an empty map when there are no accounts', () => {
    // Given no accounts at all
    // When building the map
    // Then it is empty
    expect(buildAccountCurrencyMap([], 'AUD')).toEqual({});
  });
});
