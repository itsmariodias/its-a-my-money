export type TransactionType = 'income' | 'expense';
export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';

export interface Account {
  id: number;
  name: string;
  initial_balance: number;
  currency: string;
  color: string | null;
  icon: string | null;
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
  created_at: string;
}

export interface Transfer {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  note: string | null;
  date: string;
  created_at: string;
}

export interface Budget {
  id: number;
  category_id: number;
  amount: number;
  period: BudgetPeriod;
  created_at: string;
}

// Enriched types (joins)
export interface TransactionWithDetails extends Transaction {
  category_name: string;
  category_color: string;
  category_icon: string;
  account_name: string;
}

export interface TransferWithDetails extends Transfer {
  from_account_name: string;
  from_account_color: string | null;
  from_account_icon: string | null;
  to_account_name: string;
  to_account_color: string | null;
  to_account_icon: string | null;
}
