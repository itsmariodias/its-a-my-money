import { useAccountsDb, useCategoriesDb, useTransactionsDb, useTransfersDb, useSettingsDb, useBudgetsDb } from '@/db';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getMockDb } = require('../__mocks__/expo-sqlite');
const mockDb = getMockDb();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAccountsDb', () => {
  const db = useAccountsDb();

  it('should pass 7 parameters for account insert (including type and current value)', async () => {
    // Given a mocked SQLite context
    // When insert is called with a full cash account
    await db.insert({
      name: 'Bank', initial_balance: 1000, currency: 'USD', color: '#fff', icon: 'bank',
      account_type: 'cash', current_value: null,
    });
    // Then runAsync should receive INSERT SQL with 7 positional params (defaults 'cash' + null)
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO accounts');
    expect(params).toHaveLength(7);
    expect(params).toEqual(['Bank', 1000, 'USD', '#fff', 'bank', 'cash', null]);
  });

  it('should pass investment account type and current value on insert', async () => {
    await db.insert({
      name: 'Stocks', initial_balance: 5000, currency: 'USD', color: null, icon: null,
      account_type: 'investment', current_value: 6200,
    });
    const [, ...params] = mockDb.runAsync.mock.calls[0];
    expect(params).toEqual(['Stocks', 5000, 'USD', null, null, 'investment', 6200]);
  });

  it('should pass id as last parameter for account update', async () => {
    // Given a mocked SQLite context
    // When update is called with id 1
    await db.update(1, {
      name: 'Bank', initial_balance: 500, currency: 'EUR', color: null, icon: null,
      account_type: 'cash', current_value: null,
    });
    // Then runAsync should receive 8 params with id last
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('UPDATE accounts');
    expect(params).toHaveLength(8);
    expect(params[7]).toBe(1);
  });

  it('should pass the correct id for delete', async () => {
    // Given a mocked SQLite context
    // When remove is called with id 42
    await db.remove(42);
    // Then runAsync should be called with DELETE and id 42
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('DELETE FROM accounts');
    expect(params).toEqual([42]);
  });
});

describe('useTransactionsDb', () => {
  const db = useTransactionsDb();

  it('should pass 6 parameters for transaction insert', async () => {
    // Given a mocked SQLite context
    // When insert is called
    await db.insert({ amount: 50, type: 'expense', category_id: 1, account_id: 1, note: 'lunch', date: '2026-03-21', recurring_transaction_id: null });
    // Then runAsync should receive 7 params
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO transactions');
    expect(params).toHaveLength(7);
    expect(params).toEqual([50, 'expense', 1, 1, 'lunch', '2026-03-21', null]);
  });

  it('should pass 7 parameters for transaction update', async () => {
    // Given a mocked SQLite context
    // When update is called with id 5
    await db.update(5, { amount: 75, type: 'income', category_id: 2, account_id: 1, note: null, date: '2026-03-21' });
    // Then runAsync should receive 7 params (6 fields + id)
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('UPDATE transactions');
    expect(params).toHaveLength(7);
    expect(params[6]).toBe(5);
  });
});

describe('useTransfersDb', () => {
  const db = useTransfersDb();

  it('passes 7 parameters for transfer insert and stores to_amount as null on same-currency', async () => {
    await db.insert({ from_account_id: 1, to_account_id: 2, amount: 100, to_amount: null, note: null, date: '2026-03-21', recurring_transaction_id: null });
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO transfers');
    expect(sql).toContain('to_amount');
    expect(params).toHaveLength(7);
    expect(params).toEqual([1, 2, 100, null, null, '2026-03-21', null]);
  });

  it('stores to_amount when provided for cross-currency transfers', async () => {
    await db.insert({ from_account_id: 1, to_account_id: 2, amount: 100, to_amount: 92.5, note: null, date: '2026-03-21', recurring_transaction_id: null });
    const [, ...params] = mockDb.runAsync.mock.calls[0];
    expect(params[3]).toBe(92.5);
  });

  it('passes 7 parameters for transfer update including to_amount', async () => {
    await db.update(3, { from_account_id: 1, to_account_id: 2, amount: 200, to_amount: 185, note: 'rent', date: '2026-03-21' });
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('UPDATE transfers');
    expect(sql).toContain('to_amount=?');
    expect(params).toHaveLength(7);
    expect(params[3]).toBe(185);
    expect(params[6]).toBe(3);
  });
});

describe('useCategoriesDb', () => {
  const db = useCategoriesDb();

  it('should hardcode is_default to 0 and pass 4 parameters for insert', async () => {
    // Given a mocked SQLite context
    // When insert is called
    await db.insert({ name: 'Groceries', type: 'expense', color: '#ff0', icon: 'cart', is_default: 0 });
    // Then the SQL should contain "is_default" hardcoded to 0 and only 4 params
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('is_default');
    expect(sql).toContain(', 0)');
    expect(params).toHaveLength(4);
    expect(params).toEqual(['Groceries', 'expense', '#ff0', 'cart']);
  });
});

describe('useSettingsDb', () => {
  const db = useSettingsDb();

  it('should use INSERT OR REPLACE for set', async () => {
    // Given a mocked SQLite context
    // When set is called
    await db.set('currency', 'EUR');
    // Then runAsync should use INSERT OR REPLACE with 2 params
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT OR REPLACE');
    expect(params).toEqual(['currency', 'EUR']);
  });

  it('should use SELECT for get', async () => {
    // Given a mocked SQLite context
    // When get is called
    await db.get('currency');
    // Then getFirstAsync should be called with SELECT and the key
    const [sql, ...params] = mockDb.getFirstAsync.mock.calls[0];
    expect(sql).toContain('SELECT');
    expect(params).toEqual(['currency']);
  });
});

describe('useBudgetsDb', () => {
  const db = useBudgetsDb();

  it('passes 4 parameters for budget insert including currency', async () => {
    await db.insert({ category_id: 5, amount: 500, period: 'monthly', currency: 'EUR' });
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO budgets');
    expect(sql).toContain('currency');
    expect(params).toEqual([5, 500, 'monthly', 'EUR']);
  });

  it('passes id as last parameter for budget update and persists currency', async () => {
    await db.update(7, { category_id: 5, amount: 750, period: 'weekly', currency: 'JPY' });
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('UPDATE budgets');
    expect(sql).toContain('currency=?');
    expect(params).toEqual([5, 750, 'weekly', 'JPY', 7]);
  });

  it('should pass the correct id for delete', async () => {
    // Given a mocked SQLite context
    // When remove is called with id 12
    await db.remove(12);
    // Then runAsync should be called with DELETE and id 12
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('DELETE FROM budgets');
    expect(params).toEqual([12]);
  });

  it('should delete budgets by category id', async () => {
    // Given a mocked SQLite context
    // When removeByCategory is called with category 4
    await db.removeByCategory(4);
    // Then runAsync should be called with DELETE filtering by category_id
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('DELETE FROM budgets');
    expect(sql).toContain('category_id=?');
    expect(params).toEqual([4]);
  });

  it('should join categories for getAll', async () => {
    // Given a mocked SQLite context
    // When getAll is called
    await db.getAll();
    // Then getAllAsync should join budgets with categories
    const [sql] = mockDb.getAllAsync.mock.calls[0];
    expect(sql).toContain('FROM budgets');
    expect(sql).toContain('JOIN categories');
    expect(sql).toContain('category_name');
  });
});
