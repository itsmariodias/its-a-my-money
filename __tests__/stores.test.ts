import { useAccountsStore } from '@/store/useAccountsStore';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import { useTransfersStore } from '@/store/useTransfersStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import type { Account, TransactionWithDetails, TransferWithDetails } from '@/types';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 1, name: 'Cash', initial_balance: 0, currency: 'USD',
  color: null, icon: null, created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeTx = (overrides: Partial<TransactionWithDetails> = {}): TransactionWithDetails => ({
  id: 1, amount: 50, type: 'expense', category_id: 1, account_id: 1,
  note: null, date: '2026-01-01', created_at: '2026-01-01T00:00:00Z',
  category_name: 'Food', category_color: '#f00', category_icon: 'restaurant', account_name: 'Cash',
  ...overrides,
});

const makeTransfer = (overrides: Partial<TransferWithDetails> = {}): TransferWithDetails => ({
  id: 1, from_account_id: 1, to_account_id: 2, amount: 100,
  note: null, date: '2026-01-01', created_at: '2026-01-01T00:00:00Z',
  from_account_name: 'Cash', from_account_color: null, from_account_icon: null,
  to_account_name: 'Bank', to_account_color: null, to_account_icon: null,
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

describe('useTransactionsStore', () => {
  beforeEach(() => {
    useTransactionsStore.setState({ transactions: [] });
  });

  it('should prepend new transactions', () => {
    // Given the store has one transaction (id:1)
    useTransactionsStore.setState({ transactions: [makeTx({ id: 1 })] });
    // When addTransaction is called with id:2
    useTransactionsStore.getState().addTransaction(makeTx({ id: 2 }));
    // Then the new transaction should be first
    const ids = useTransactionsStore.getState().transactions.map((t) => t.id);
    expect(ids).toEqual([2, 1]);
  });

  it('should update a transaction in place', () => {
    // Given the store has tx id:2 amount:100
    useTransactionsStore.setState({ transactions: [makeTx({ id: 1 }), makeTx({ id: 2, amount: 100 })] });
    // When updateTransaction is called with id:2 amount:200
    useTransactionsStore.getState().updateTransaction(makeTx({ id: 2, amount: 200 }));
    // Then amount should be 200 and length should be 2
    const { transactions } = useTransactionsStore.getState();
    expect(transactions).toHaveLength(2);
    expect(transactions.find((t) => t.id === 2)?.amount).toBe(200);
  });
});

describe('useTransfersStore', () => {
  beforeEach(() => {
    useTransfersStore.setState({ transfers: [] });
  });

  it('should add and remove transfers', () => {
    // Given an empty transfers store
    // When addTransfer is called
    useTransfersStore.getState().addTransfer(makeTransfer({ id: 1 }));
    expect(useTransfersStore.getState().transfers).toHaveLength(1);
    // And when removeTransfer is called
    useTransfersStore.getState().removeTransfer(1);
    // Then the store should be empty
    expect(useTransfersStore.getState().transfers).toHaveLength(0);
  });
});

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ currency: 'USD', accentColor: '#2f95dc', numberFormat: 'en-US' });
  });

  it('should have correct defaults', () => {
    // Given a fresh settings store
    // When getState is called
    const state = useSettingsStore.getState();
    // Then defaults should be USD, #2f95dc, en-US
    expect(state.currency).toBe('USD');
    expect(state.accentColor).toBe('#2f95dc');
    expect(state.numberFormat).toBe('en-US');
  });

  it('should update currency and accent color', () => {
    // Given a fresh store
    // When setCurrency and setAccentColor are called
    useSettingsStore.getState().setCurrency('EUR');
    useSettingsStore.getState().setAccentColor('#ef4444');
    // Then values should match
    expect(useSettingsStore.getState().currency).toBe('EUR');
    expect(useSettingsStore.getState().accentColor).toBe('#ef4444');
  });
});

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ isAddTxOpen: false, isTransferOpen: false, selectedAccountId: null });
  });

  it('should toggle the add transaction sheet', () => {
    // Given isAddTxOpen is false
    expect(useUIStore.getState().isAddTxOpen).toBe(false);
    // When openAddTx is called
    useUIStore.getState().openAddTx();
    // Then it should be true
    expect(useUIStore.getState().isAddTxOpen).toBe(true);
    // And when closeAddTx is called
    useUIStore.getState().closeAddTx();
    // Then it should be false
    expect(useUIStore.getState().isAddTxOpen).toBe(false);
  });
});
