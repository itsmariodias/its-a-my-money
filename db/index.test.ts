import { useAccountsDb, useBudgetsDb, useCategoriesDb, useGoalsDb, useRecurringDb, useSettingsDb, useTransactionsDb, useTransfersDb } from '@/db';

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

  const allocationCalls = () =>
    mockDb.runAsync.mock.calls.filter(([sql]: [string]) => sql.includes('goal_allocations'));

  it('writes nothing to goals when an income has no split', async () => {
    // Given an income saved without goal splits
    await db.insert({ amount: 1000, type: 'income', category_id: 2, account_id: 1, note: null, date: '2026-03-01', recurring_transaction_id: null });
    // Then goal_allocations is not touched
    expect(allocationCalls()).toHaveLength(0);
  });

  it('reserves an income split into each goal, linked to the transaction', async () => {
    // Given the insert returns transaction id 42
    mockDb.runAsync.mockResolvedValueOnce({ changes: 1, lastInsertRowId: 42 });
    // When 1,000 income is saved with 300 to goal 1 and 200 to goal 2
    await db.insert(
      { amount: 1000, type: 'income', category_id: 2, account_id: 1, note: null, date: '2026-03-01', recurring_transaction_id: null },
      [{ goal_id: 1, amount: 300 }, { goal_id: 2, amount: 200 }],
    );
    // Then old splits are cleared and two positive allocations point at transaction 42
    const calls = allocationCalls();
    expect(calls[0][0]).toContain('DELETE FROM goal_allocations WHERE transaction_id=?');
    expect(calls[0][1]).toBe(42);
    expect(calls.slice(1).map(([, ...p]: unknown[]) => p)).toEqual([
      [1, 300, '2026-03-01', 42],
      [2, 200, '2026-03-01', 42],
    ]);
    // And it all happens inside one DB transaction
    expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('stores an expense paid from a goal as a negative allocation', async () => {
    // Given an expense paying 50 from goal 3
    // When it is updated
    await db.update(8, { amount: 50, type: 'expense', category_id: 1, account_id: 1, note: null, date: '2026-04-02' }, [{ goal_id: 3, amount: 50 }]);
    // Then the transaction's splits are replaced with one that takes 50 out
    const calls = allocationCalls();
    expect(calls[0][0]).toContain('DELETE FROM goal_allocations WHERE transaction_id=?');
    const [, ...params] = calls[1];
    expect(params).toEqual([3, -50, '2026-04-02', 8]);
  });

  it('clears the splits when an update removes them', async () => {
    // Given a transaction whose split was taken off in the form
    await db.update(8, { amount: 50, type: 'income', category_id: 1, account_id: 1, note: null, date: '2026-04-02' });
    // Then its allocations are deleted and none are inserted
    const calls = allocationCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toContain('DELETE FROM goal_allocations');
  });

  it('takes its goal splits with it on delete', async () => {
    // When a transaction is removed
    await db.remove(8);
    // Then its allocations are deleted before the row itself
    const sqls = mockDb.runAsync.mock.calls.map(([sql]: [string]) => sql);
    expect(sqls.findIndex((q: string) => q.includes('DELETE FROM goal_allocations'))).toBeLessThan(
      sqls.findIndex((q: string) => q.includes('DELETE FROM transactions')),
    );
  });

  it.each([
    ['removeByAccount', 'account_id=?'],
    ['removeByCategory', 'category_id=?'],
    ['removeByRecurring', 'recurring_transaction_id=?'],
  ] as const)('%s also clears the removed rows\' goal splits', async (method, where) => {
    // When transactions are bulk-deleted
    await db[method](4);
    // Then the matching allocations go first
    const [sql, param] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('DELETE FROM goal_allocations WHERE transaction_id IN (SELECT id FROM transactions WHERE');
    expect(sql).toContain(where);
    expect(param).toBe(4);
    expect(mockDb.runAsync.mock.calls[1][0]).toContain('DELETE FROM transactions');
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

describe('useRecurringDb', () => {
  const db = useRecurringDb();

  it('should select account currency fields for recurring transactions', async () => {
    await db.getAll();

    const [sql] = mockDb.getAllAsync.mock.calls[0];
    expect(sql).toContain('a.currency as account_currency');
    expect(sql).toContain('ta.currency as to_account_currency');
  });
});

describe('useGoalsDb', () => {
  const db = useGoalsDb();

  const goal = { name: 'Japan trip', icon: 'flight', color: '#2196F3', account_id: 2, target_amount: 3000, target_date: '2026-12-31' };

  it('passes every goal field for insert', async () => {
    // Given a goal with a deadline
    // When it is inserted
    await db.insert(goal);
    // Then the row carries its name, look, account, target and deadline
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO goals');
    expect(params).toEqual(['Japan trip', 'flight', '#2196F3', 2, 3000, '2026-12-31']);
  });

  it('passes id as the last parameter for update', async () => {
    // Given an existing goal with no deadline
    // When it is updated
    await db.update(7, { ...goal, target_date: null });
    // Then the id binds last, after every column, and the deadline is null
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('UPDATE goals');
    expect(params).toEqual(['Japan trip', 'flight', '#2196F3', 2, 3000, null, 7]);
  });

  it('deletes the goal\'s allocations along with it', async () => {
    // When goal 12 is removed
    await db.remove(12);
    // Then its allocations go first, then the goal, both for id 12
    const [allocSql, allocId] = mockDb.runAsync.mock.calls[0];
    const [goalSql, goalId] = mockDb.runAsync.mock.calls[1];
    expect(allocSql).toContain('DELETE FROM goal_allocations WHERE goal_id=?');
    expect(goalSql).toContain('DELETE FROM goals WHERE id=?');
    expect([allocId, goalId]).toEqual([12, 12]);
  });

  it('deletes an account\'s goals and their allocations', async () => {
    // When account 4 is deleted
    await db.removeByAccount(4);
    // Then the allocations of its goals go, then the goals
    const [allocSql, allocParam] = mockDb.runAsync.mock.calls[0];
    const [goalSql, goalParam] = mockDb.runAsync.mock.calls[1];
    expect(allocSql).toContain('goal_id IN (SELECT id FROM goals WHERE account_id=?)');
    expect(goalSql).toContain('DELETE FROM goals WHERE account_id=?');
    expect([allocParam, goalParam]).toEqual([4, 4]);
  });

  it('records a manual add as a positive allocation with no transaction', async () => {
    // When 250 is added to goal 3 by hand
    await db.allocate(3, 250, '2026-05-01', 'bonus');
    // Then one unlinked allocation is written
    const [sql, ...params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO goal_allocations (goal_id, amount, date, note)');
    expect(params).toEqual([3, 250, '2026-05-01', 'bonus']);
  });

  it('sums allocations into saved and joins the account for getAll', async () => {
    // When goals are loaded
    await db.getAll();
    // Then each row carries what it holds and its account's name and currency
    const [sql] = mockDb.getAllAsync.mock.calls[0];
    expect(sql).toContain('FROM goals');
    expect(sql).toContain('JOIN accounts');
    expect(sql).toContain('SUM(ga.amount)');
    expect(sql).toContain('as saved');
    expect(sql).toContain('account_currency');
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
