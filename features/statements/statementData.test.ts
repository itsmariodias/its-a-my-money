import type { Account, TransactionWithDetails, TransferWithDetails } from '@/types';
import { accountFlowAsOf } from '@/features/accounts/balanceUtils';
import { STATEMENT_PRESETS, buildAccountStatement, buildStatement, defaultStatementRange } from './statementData';

function account(id: number, overrides: Partial<Account> = {}): Account {
  return {
    id, name: `Account ${id}`, initial_balance: 0, currency: 'EUR',
    color: '#123456', icon: null, account_type: 'cash', current_value: null,
    created_at: '2025-01-01',
    ...overrides,
  };
}

let nextId = 1;

function tx(
  accountId: number, type: 'income' | 'expense', amount: number, date: string,
  overrides: Partial<TransactionWithDetails> = {},
): TransactionWithDetails {
  const id = nextId++;
  return {
    id, amount, type, category_id: type === 'income' ? 1 : 2, account_id: accountId,
    note: null, date, recurring_transaction_id: null, created_at: `${date}T00:00:${String(id).padStart(2, '0')}`,
    category_name: type === 'income' ? 'Salary' : 'Groceries',
    category_color: type === 'income' ? '#4CAF50' : '#F44336',
    category_icon: 'label', account_name: `Account ${accountId}`, account_currency: 'EUR',
    ...overrides,
  };
}

function transfer(
  from: number | null, to: number | null, amount: number, date: string,
  overrides: Partial<TransferWithDetails> = {},
): TransferWithDetails {
  const id = nextId++;
  return {
    id, from_account_id: from, to_account_id: to, amount, to_amount: null, note: null, date,
    recurring_transaction_id: null, created_at: `${date}T00:00:${String(id).padStart(2, '0')}`,
    from_account_name: from === null ? null : `Account ${from}`, from_account_color: null, from_account_icon: null,
    from_account_currency: from === null ? null : 'EUR',
    to_account_name: to === null ? null : `Account ${to}`, to_account_color: null, to_account_icon: null,
    to_account_currency: to === null ? null : 'EUR',
    ...overrides,
  };
}

describe('defaultStatementRange', () => {
  it('covers the 12 months ending today', () => {
    // Given today is 30 Oct 2026
    // When the default range is taken
    const range = defaultStatementRange(new Date(2026, 9, 30));

    // Then it runs from 31 Oct 2025 through today
    expect(range).toEqual({ start: '2025-10-31', end: '2026-10-30' });
  });

  it('starts on 1 March when today is 29 February', () => {
    // Given today is a leap day
    // When the default range is taken
    const range = defaultStatementRange(new Date(2028, 1, 29));

    // Then the year before has no 29 Feb, so the range starts the day after 28 Feb
    expect(range).toEqual({ start: '2027-03-01', end: '2028-02-29' });
  });
});

describe('STATEMENT_PRESETS', () => {
  it('gives last year as the whole previous calendar year', () => {
    // Given the "Last year" preset
    const preset = STATEMENT_PRESETS.find((p) => p.id === 'last-year')!;

    // When applied in 2026
    // Then it spans all of 2025
    expect(preset.range(new Date(2026, 9, 30))).toEqual({ start: '2025-01-01', end: '2025-12-31' });
  });
});

describe('buildAccountStatement', () => {
  it('opens with the balance before the start date and closes with the balance at the end date', () => {
    // Given an account with activity before, inside and after the range
    const acc = account(1, { initial_balance: 100 });
    const txs = [
      tx(1, 'income', 50, '2026-01-31'),
      tx(1, 'expense', 20, '2026-02-01'),
      tx(1, 'income', 200, '2026-02-28'),
      tx(1, 'expense', 999, '2026-03-01'),
    ];

    // When a February statement is built
    const s = buildAccountStatement(acc, txs, [], '2026-02-01', '2026-02-28');

    // Then the start and end dates are both inside, and the figures match the account's flow
    expect(s.opening).toBe(150);
    expect(s.rows.map((r) => r.date)).toEqual(['2026-02-01', '2026-02-28']);
    expect(s.totalIn).toBe(200);
    expect(s.totalOut).toBe(20);
    expect(s.closing).toBe(330);
    expect(s.closing).toBe(accountFlowAsOf(acc, txs, [], { endInclusive: '2026-02-28' }));
  });

  it('keeps a running balance across income, expenses and transfers, oldest first', () => {
    // Given mixed rows saved out of date order
    const acc = account(1, { initial_balance: 1000 });
    const txs = [tx(1, 'expense', 30, '2026-05-03'), tx(1, 'income', 500, '2026-05-01')];
    const trs = [transfer(1, 2, 200, '2026-05-02'), transfer(2, 1, 50, '2026-05-04')];

    // When the statement is built
    const s = buildAccountStatement(acc, txs, trs, '2026-05-01', '2026-05-31');

    // Then rows run by date and each carries the balance after it
    expect(s.rows.map((r) => [r.date, r.moneyIn, r.moneyOut, r.balance])).toEqual([
      ['2026-05-01', 500, 0, 1500],
      ['2026-05-02', 0, 200, 1300],
      ['2026-05-03', 0, 30, 1270],
      ['2026-05-04', 50, 0, 1320],
    ]);
    expect(s.closing).toBe(accountFlowAsOf(acc, txs, trs, { endInclusive: '2026-05-31' }));
  });

  it('describes transactions by note first, with the category underneath', () => {
    // Given one transaction with a note and one without
    const acc = account(1);
    const txs = [
      tx(1, 'expense', 10, '2026-05-01', { note: 'Lidl' }),
      tx(1, 'expense', 5, '2026-05-02'),
    ];

    // When the statement is built
    const s = buildAccountStatement(acc, txs, [], '2026-05-01', '2026-05-31');

    // Then the note leads and the category moves to the detail line
    expect(s.rows[0]).toMatchObject({ description: 'Lidl', detail: 'Groceries', color: '#F44336' });
    expect(s.rows[1]).toMatchObject({ description: 'Groceries', detail: null });
  });

  it('credits a cross-currency transfer with the amount received', () => {
    // Given US$100 that landed as €92.50
    const acc = account(1);
    const trs = [transfer(2, 1, 100, '2026-05-01', { to_amount: 92.5, from_account_currency: 'USD' })];

    // When the receiving account's statement is built
    const s = buildAccountStatement(acc, [], trs, '2026-05-01', '2026-05-31');

    // Then it shows €92.50 in, from the other account
    expect(s.rows[0]).toMatchObject({ kind: 'transfer', description: 'Transfer from Account 2', moneyIn: 92.5, moneyOut: 0 });
  });

  it('names a deleted counterpart account as Unknown', () => {
    // Given a transfer whose source account was deleted
    const acc = account(1);
    const trs = [transfer(null, 1, 40, '2026-05-01', { note: 'Old savings' })];

    // When the statement is built
    const s = buildAccountStatement(acc, [], trs, '2026-05-01', '2026-05-31');

    // Then it reads as a transfer from Unknown, with its note underneath
    expect(s.rows[0]).toMatchObject({ description: 'Transfer from Unknown', detail: 'Old savings', moneyIn: 40 });
  });
});

describe('buildStatement', () => {
  it('leaves out idle accounts with nothing in them when covering all accounts', () => {
    // Given one active account, one idle empty account, and one idle account holding money
    const accounts = [account(1), account(2), account(3, { initial_balance: 500 })];
    const txs = [tx(1, 'income', 10, '2026-05-01')];

    // When an all-accounts statement is built
    const s = buildStatement({ accounts, transactions: txs, transfers: [], start: '2026-05-01', end: '2026-05-31', accountId: null });

    // Then only the empty, idle account is left out
    expect(s.sections.map((sec) => sec.account.id)).toEqual([1, 3]);
  });

  it('always includes the chosen account, even when it is idle', () => {
    // Given an empty account
    const accounts = [account(1), account(2)];

    // When a statement for that account is built
    const s = buildStatement({ accounts, transactions: [], transfers: [], start: '2026-05-01', end: '2026-05-31', accountId: 2 });

    // Then it gets its section anyway
    expect(s.sections.map((sec) => sec.account.id)).toEqual([2]);
    expect(s.accountId).toBe(2);
  });

  it('sums income and spending per currency, by category, without transfers', () => {
    // Given a euro and a dollar account, with a transfer between them
    const accounts = [account(1), account(2, { currency: 'USD' })];
    const txs = [
      tx(1, 'income', 1000, '2026-05-01'),
      tx(1, 'expense', 40, '2026-05-02'),
      tx(1, 'expense', 60, '2026-05-03', { category_id: 3, category_name: 'Rent', category_color: '#000000' }),
      tx(2, 'expense', 25, '2026-05-04', { account_currency: 'USD' }),
      tx(1, 'income', 999, '2026-06-01'),
    ];
    const trs = [transfer(1, 2, 300, '2026-05-05', { to_amount: 320, to_account_currency: 'USD' })];

    // When an all-accounts May statement is built
    const s = buildStatement({ accounts, transactions: txs, transfers: trs, start: '2026-05-01', end: '2026-05-31', accountId: null });

    // Then each currency has its own totals, categories are largest first, and the transfer is not income
    expect(s.summary).toEqual([
      {
        currency: 'EUR', income: 1000, expenses: 100, net: 900,
        incomeByCategory: [{ name: 'Salary', color: '#4CAF50', total: 1000 }],
        expensesByCategory: [
          { name: 'Rent', color: '#000000', total: 60 },
          { name: 'Groceries', color: '#F44336', total: 40 },
        ],
      },
      {
        currency: 'USD', income: 0, expenses: 25, net: -25,
        incomeByCategory: [],
        expensesByCategory: [{ name: 'Groceries', color: '#F44336', total: 25 }],
      },
    ]);
  });

  it('limits the summary to the chosen account', () => {
    // Given two euro accounts with income
    const accounts = [account(1), account(2)];
    const txs = [tx(1, 'income', 100, '2026-05-01'), tx(2, 'income', 7, '2026-05-01')];

    // When a statement for the first one is built
    const s = buildStatement({ accounts, transactions: txs, transfers: [], start: '2026-05-01', end: '2026-05-31', accountId: 1 });

    // Then the other account's income is not counted
    expect(s.summary[0].income).toBe(100);
  });
});
