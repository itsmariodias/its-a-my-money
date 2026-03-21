import { useAccountsDb, useCategoriesDb, useTransactionsDb, useTransfersDb, useSettingsDb } from '@/db';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getMockDb } = require('../__mocks__/expo-sqlite');
const mockDb = getMockDb();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAccountsDb', () => {
  const db = useAccountsDb();

  it('should pass 5 parameters for account insert', async () => {
    // Given a mocked SQLite context
    // When insert is called with a full account
    await db.insert({ name: 'Bank', initial_balance: 1000, currency: 'USD', color: '#fff', icon: 'bank' });
    // Then runAsync should receive INSERT SQL with 5 positional params
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO accounts');
    expect(params).toHaveLength(5);
    expect(params).toEqual(['Bank', 1000, 'USD', '#fff', 'bank']);
  });

  it('should pass id as last parameter for account update', async () => {
    // Given a mocked SQLite context
    // When update is called with id 1
    await db.update(1, { name: 'Bank', initial_balance: 500, currency: 'EUR', color: null, icon: null });
    // Then runAsync should receive 6 params with id last
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('UPDATE accounts');
    expect(params).toHaveLength(6);
    expect(params[5]).toBe(1);
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
    await db.insert({ amount: 50, type: 'expense', category_id: 1, account_id: 1, note: 'lunch', date: '2026-03-21' });
    // Then runAsync should receive 6 params
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO transactions');
    expect(params).toHaveLength(6);
    expect(params).toEqual([50, 'expense', 1, 1, 'lunch', '2026-03-21']);
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

  it('should pass 5 parameters for transfer insert', async () => {
    // Given a mocked SQLite context
    // When insert is called
    await db.insert({ from_account_id: 1, to_account_id: 2, amount: 100, note: null, date: '2026-03-21' });
    // Then runAsync should receive 5 params
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO transfers');
    expect(params).toHaveLength(5);
    expect(params).toEqual([1, 2, 100, null, '2026-03-21']);
  });

  it('should pass 6 parameters for transfer update', async () => {
    // Given a mocked SQLite context
    // When update is called with id 3
    await db.update(3, { from_account_id: 1, to_account_id: 2, amount: 200, note: 'rent', date: '2026-03-21' });
    // Then runAsync should receive 6 params (5 fields + id)
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('UPDATE transfers');
    expect(params).toHaveLength(6);
    expect(params[5]).toBe(3);
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
