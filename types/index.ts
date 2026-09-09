export type TransactionType = 'income' | 'expense';

// These unions are derived from runtime arrays so backup validation can check against the same
// list the app writes. Adding a value here is enough — a value that exists only in the type is
// invisible to `validation.ts`, which is how 'quarterly' made older backups unimportable.
export const BUDGET_PERIODS = ['monthly', 'weekly', 'yearly'] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export const RECURRING_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export type AccountType = 'cash' | 'investment';

export interface Account {
  id: number;
  name: string;
  initial_balance: number;
  currency: string;
  color: string | null;
  icon: string | null;
  account_type: AccountType;
  current_value: number | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  is_default: number; // SQLite stores booleans as 0/1
}

export interface Transaction {
  id: number;
  amount: number;
  type: TransactionType;
  category_id: number;
  account_id: number;
  note: string | null;
  date: string;
  recurring_transaction_id: number | null;
  created_at: string;
}

export interface Transfer {
  id: number;
  from_account_id: number | null;
  to_account_id: number | null;
  amount: number;
  // Amount credited to the destination, used when the two accounts have different
  // currencies. NULL means same-currency, in which case `amount` applies on both sides.
  to_amount: number | null;
  note: string | null;
  date: string;
  recurring_transaction_id: number | null;
  created_at: string;
}

export interface Budget {
  id: number;
  category_id: number;
  amount: number;
  period: BudgetPeriod;
  currency: string;
  created_at: string;
}

export interface BudgetWithDetails extends Budget {
  category_name: string;
  category_color: string;
  category_icon: string;
}

export interface Goal {
  id: number;
  category_id: number;
  target_amount: number;
  currency: string;
  /** Spend before this date does not count — a new goal starts empty. */
  start_date: string;
  /** Optional deadline. Display only: it never filters which transactions count. */
  target_date: string | null;
  created_at: string;
}

export interface GoalWithDetails extends Goal {
  category_name: string;
  category_color: string;
  category_icon: string;
}

export type RecurringKind = 'transaction' | 'transfer';

export interface RecurringTransaction {
  id: number;
  amount: number;
  kind: RecurringKind;
  type: TransactionType | null;
  category_id: number | null;
  account_id: number; // for transfer: the "from" account
  to_account_id: number | null; // for transfer only
  note: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: number; // SQLite stores booleans as 0/1
  created_at: string;
}

export interface RecurringTransactionWithDetails extends RecurringTransaction {
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  account_name: string;
  account_currency: string;
  to_account_name: string | null;
  to_account_color: string | null;
  to_account_icon: string | null;
  to_account_currency: string | null;
}

// Enriched types (joins)
export interface TransactionWithDetails extends Transaction {
  category_name: string;
  category_color: string;
  category_icon: string;
  account_name: string;
  account_currency: string;
}

export interface TransferWithDetails extends Transfer {
  from_account_name: string | null;
  from_account_color: string | null;
  from_account_icon: string | null;
  // Null when the account has been deleted (ON DELETE SET NULL keeps the history).
  from_account_currency: string | null;
  to_account_name: string | null;
  to_account_color: string | null;
  to_account_icon: string | null;
  to_account_currency: string | null;
}
