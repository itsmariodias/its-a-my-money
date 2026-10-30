import type { Account, TransactionWithDetails, TransferWithDetails } from '@/types';
import { accountFlowAsOf } from '@/features/accounts/balanceUtils';
import { getTransferSide } from '@/features/transfers/transferSide';
import { toISODate } from '@/features/recurring/dateUtils';

export interface StatementRange {
  start: string;
  end: string;
}

/** The 12 months ending today: from the day after this date last year, through today. */
export function defaultStatementRange(today: Date = new Date()): StatementRange {
  const y = today.getFullYear() - 1;
  const m = today.getMonth();
  // Clamp so 29 Feb starts on 1 Mar of the year before, not 2 Mar.
  const lastDay = new Date(y, m + 1, 0).getDate();
  return { start: toISODate(new Date(y, m, Math.min(today.getDate(), lastDay) + 1)), end: toISODate(today) };
}

export const STATEMENT_PRESETS: { id: string; label: string; range: (today: Date) => StatementRange }[] = [
  { id: 'last-12-months', label: '12 months', range: defaultStatementRange },
  {
    id: 'this-month',
    label: 'This month',
    range: (today) => ({ start: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), end: toISODate(today) }),
  },
  {
    id: 'this-year',
    label: 'This year',
    range: (today) => ({ start: `${today.getFullYear()}-01-01`, end: toISODate(today) }),
  },
  {
    id: 'last-year',
    label: 'Last year',
    range: (today) => ({ start: `${today.getFullYear() - 1}-01-01`, end: `${today.getFullYear() - 1}-12-31` }),
  },
];

export interface StatementRow {
  date: string;
  kind: 'income' | 'expense' | 'transfer';
  description: string;
  /** Second line under the description: the category when a note took the first line, or a transfer's note. */
  detail: string | null;
  /** Category colour; null for transfers. */
  color: string | null;
  moneyIn: number;
  moneyOut: number;
  /** Account balance after this row. */
  balance: number;
}

export interface AccountStatement {
  account: Account;
  currency: string;
  opening: number;
  rows: StatementRow[];
  totalIn: number;
  totalOut: number;
  closing: number;
}

export interface CategoryTotal {
  name: string;
  color: string;
  total: number;
}

/** Income and spending in one currency. Transfers are left out — moving money between your own accounts is neither. */
export interface CurrencySummary {
  currency: string;
  income: number;
  expenses: number;
  net: number;
  incomeByCategory: CategoryTotal[];
  expensesByCategory: CategoryTotal[];
}

export interface Statement extends StatementRange {
  /** The account the statement is for; null = all accounts. */
  accountId: number | null;
  sections: AccountStatement[];
  summary: CurrencySummary[];
}

const inRange = (date: string, start: string, end: string) => date >= start && date <= end;

/**
 * One account's movements between `start` and `end` (both inclusive), oldest first, with a running
 * balance. Balances are the account's flow — on investment accounts that is the amount invested.
 */
export function buildAccountStatement(
  account: Account,
  transactions: readonly TransactionWithDetails[],
  transfers: readonly TransferWithDetails[],
  start: string,
  end: string,
): AccountStatement {
  const currency = account.currency;
  const opening = accountFlowAsOf(account, transactions, transfers, { endExclusive: start });

  const entries: { created_at: string; row: Omit<StatementRow, 'balance'> }[] = [];

  for (const tx of transactions) {
    if (tx.account_id !== account.id || !inRange(tx.date, start, end)) continue;
    const isIncome = tx.type === 'income';
    entries.push({ created_at: tx.created_at, row: {
      date: tx.date,
      kind: tx.type,
      description: tx.note || tx.category_name,
      detail: tx.note ? tx.category_name : null,
      color: tx.category_color,
      moneyIn: isIncome ? tx.amount : 0,
      moneyOut: isIncome ? 0 : tx.amount,
    } });
  }

  for (const tr of transfers) {
    if (tr.from_account_id !== account.id && tr.to_account_id !== account.id) continue;
    if (!inRange(tr.date, start, end)) continue;
    const side = getTransferSide(tr, account.id, currency);
    entries.push({ created_at: tr.created_at, row: {
      date: tr.date,
      kind: 'transfer',
      description: side.isOutgoing ? `Transfer to ${side.otherName}` : `Transfer from ${side.otherName}`,
      detail: tr.note || null,
      color: null,
      moneyIn: side.isOutgoing ? 0 : side.amount,
      moneyOut: side.isOutgoing ? side.amount : 0,
    } });
  }

  entries.sort((a, b) => a.row.date.localeCompare(b.row.date) || a.created_at.localeCompare(b.created_at));

  let balance = opening;
  let totalIn = 0;
  let totalOut = 0;
  const rows: StatementRow[] = entries.map(({ row }) => {
    balance += row.moneyIn - row.moneyOut;
    totalIn += row.moneyIn;
    totalOut += row.moneyOut;
    return { ...row, balance };
  });

  return { account, currency, opening, rows, totalIn, totalOut, closing: balance };
}

function addToCategory(map: Map<number, CategoryTotal>, tx: TransactionWithDetails) {
  const entry = map.get(tx.category_id);
  if (entry) entry.total += tx.amount;
  else map.set(tx.category_id, { name: tx.category_name, color: tx.category_color, total: tx.amount });
}

const byTotalDesc = (map: Map<number, CategoryTotal>) => [...map.values()].sort((a, b) => b.total - a.total);

export function buildStatement({
  accounts, transactions, transfers, start, end, accountId,
}: {
  accounts: readonly Account[];
  transactions: readonly TransactionWithDetails[];
  transfers: readonly TransferWithDetails[];
  start: string;
  end: string;
  accountId: number | null;
}): Statement {
  const selected = accountId === null ? accounts : accounts.filter((a) => a.id === accountId);
  const sections = selected
    .map((acc) => buildAccountStatement(acc, transactions, transfers, start, end))
    // With all accounts, leave out the ones with nothing to show. A chosen account always gets its page.
    .filter((s) => accountId !== null || s.rows.length > 0 || s.opening !== 0);

  const byCurrency = new Map<string, { income: Map<number, CategoryTotal>; expenses: Map<number, CategoryTotal> }>();
  const currencyOfAccount = new Map(sections.map((s) => [s.account.id, s.currency]));
  for (const tx of transactions) {
    const currency = currencyOfAccount.get(tx.account_id);
    if (!currency || !inRange(tx.date, start, end)) continue;
    let bucket = byCurrency.get(currency);
    if (!bucket) {
      bucket = { income: new Map(), expenses: new Map() };
      byCurrency.set(currency, bucket);
    }
    addToCategory(tx.type === 'income' ? bucket.income : bucket.expenses, tx);
  }

  const sum = (list: CategoryTotal[]) => list.reduce((s, c) => s + c.total, 0);
  // Currencies in the order their accounts appear.
  const currencies = [...new Set(sections.map((s) => s.currency))].filter((c) => byCurrency.has(c));
  const summary: CurrencySummary[] = currencies.map((currency) => {
    const bucket = byCurrency.get(currency)!;
    const incomeByCategory = byTotalDesc(bucket.income);
    const expensesByCategory = byTotalDesc(bucket.expenses);
    const income = sum(incomeByCategory);
    const expenses = sum(expensesByCategory);
    return { currency, income, expenses, net: income - expenses, incomeByCategory, expensesByCategory };
  });

  return { start, end, accountId, sections, summary };
}
