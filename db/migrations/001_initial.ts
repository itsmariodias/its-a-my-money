import { type SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      initial_balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      color TEXT,
      icon TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category_id INTEGER NOT NULL REFERENCES categories(id),
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      note TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_account_id INTEGER NOT NULL REFERENCES accounts(id),
      to_account_id INTEGER NOT NULL REFERENCES accounts(id),
      amount REAL NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly' CHECK(period IN ('monthly', 'weekly', 'yearly')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Seed default categories
    INSERT INTO categories (name, type, color, icon, is_default) VALUES
      ('Bills', 'expense', '#607D8B', 'receipt', 1),
      ('Car', 'expense', '#2196F3', 'directions-car', 1),
      ('Clothes', 'expense', '#9C27B0', 'checkroom', 1),
      ('Communications', 'expense', '#00BCD4', 'phone', 1),
      ('Eating out', 'expense', '#FF5722', 'restaurant', 1),
      ('Entertainment', 'expense', '#FF9800', 'movie', 1),
      ('Food', 'expense', '#4CAF50', 'local-grocery-store', 1),
      ('Gifts', 'expense', '#E91E63', 'card-giftcard', 1),
      ('Health', 'expense', '#F44336', 'local-hospital', 1),
      ('House', 'expense', '#795548', 'home', 1),
      ('Pets', 'expense', '#8BC34A', 'pets', 1),
      ('Sports', 'expense', '#CDDC39', 'sports-soccer', 1),
      ('Taxi', 'expense', '#FFC107', 'local-taxi', 1),
      ('Toiletry', 'expense', '#FFEB3B', 'soap', 1),
      ('Transport', 'expense', '#3F51B5', 'directions-bus', 1),
      ('Other Expense', 'expense', '#9E9E9E', 'more-horiz', 1),
      ('Deposits', 'income', '#03A9F4', 'account-balance', 1),
      ('Freelance', 'income', '#673AB7', 'laptop', 1),
      ('Gift', 'income', '#E91E63', 'redeem', 1),
      ('Investment', 'income', '#4CAF50', 'trending-up', 1),
      ('Salary', 'income', '#4CAF50', 'work', 1),
      ('Savings', 'income', '#009688', 'savings', 1),
      ('Other Income', 'income', '#9E9E9E', 'attach-money', 1);

    -- Seed a default account
    INSERT INTO accounts (name, initial_balance, currency, color, icon)
    VALUES ('Cash', 0, 'USD', '#4CAF50', 'account-balance-wallet');
  `);
}
