import { useAccountsStore } from './useAccountsStore';
import type { Account } from '@/types';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 1, name: 'Cash', initial_balance: 0, currency: 'USD',
  color: null, icon: null, account_type: 'cash', current_value: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('useAccountsStore', () => {
  beforeEach(() => {
    useAccountsStore.setState({ accounts: [] });
  });

  it('should set accounts', () => {
    // Given an empty accounts store
    // When setAccounts is called with one account
    useAccountsStore.getState().setAccounts([makeAccount()]);
    // Then the store should contain exactly 1 account
    expect(useAccountsStore.getState().accounts).toHaveLength(1);
    expect(useAccountsStore.getState().accounts[0].name).toBe('Cash');
  });

  it('should upsert-update an existing account', () => {
    // Given the store contains account id:1 name:"Cash"
    useAccountsStore.setState({ accounts: [makeAccount()] });
    // When upsertAccount is called with id:1 name:"Bank"
    useAccountsStore.getState().upsertAccount(makeAccount({ id: 1, name: 'Bank' }));
    // Then name should be "Bank" and length should be 1
    const { accounts } = useAccountsStore.getState();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe('Bank');
  });

  it('should upsert-add a new account', () => {
    // Given the store contains account id:1
    useAccountsStore.setState({ accounts: [makeAccount({ id: 1 })] });
    // When upsertAccount is called with id:2
    useAccountsStore.getState().upsertAccount(makeAccount({ id: 2, name: 'Bank' }));
    // Then length should be 2
    expect(useAccountsStore.getState().accounts).toHaveLength(2);
  });

  it('should remove an account by id', () => {
    // Given the store contains accounts [1, 2, 3]
    useAccountsStore.setState({
      accounts: [makeAccount({ id: 1 }), makeAccount({ id: 2 }), makeAccount({ id: 3 })],
    });
    // When removeAccount(2) is called
    useAccountsStore.getState().removeAccount(2);
    // Then the store should have [1, 3]
    const ids = useAccountsStore.getState().accounts.map((a) => a.id);
    expect(ids).toEqual([1, 3]);
  });
});
