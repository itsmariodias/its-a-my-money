import { isValidExport } from './validation';
import { BUDGET_PERIODS, RECURRING_FREQUENCIES } from '@/types';

describe('isValidExport', () => {
  const validData = {
    version: 1,
    exported_at: '2026-03-21T00:00:00Z',
    accounts: [{ id: 1, name: 'Cash', initial_balance: 0, currency: 'USD', color: null, icon: null, created_at: '2026-01-01T00:00:00Z' }],
    categories: [{ id: 1, name: 'Food', type: 'expense', color: '#f00', icon: 'restaurant', is_default: 1 }],
    transactions: [{ id: 1, amount: 50, type: 'expense', category_id: 1, account_id: 1, note: null, date: '2026-03-01', created_at: '2026-03-01T00:00:00Z' }],
    transfers: [],
    settings: { currency: 'USD' },
  };

  it('should accept valid export data with all required fields', () => {
    // Given a complete ExportData object with version:1 and all arrays
    // When isValidExport is called
    // Then it should return true
    expect(isValidExport(validData)).toBe(true);
  });

  it('should accept valid data with empty arrays', () => {
    // Given a minimal valid object with empty arrays
    // When isValidExport is called
    // Then it should return true
    expect(isValidExport({
      version: 1, accounts: [], categories: [], transactions: [], transfers: [],
    })).toBe(true);
  });

  it('should reject data missing the version field', () => {
    // Given an object with all arrays but no version
    // When isValidExport is called
    // Then it should return false
    const { version, ...noVersion } = validData;
    expect(isValidExport(noVersion)).toBe(false);
  });

  it('should reject data with wrong version number', () => {
    // Given an object with version:2
    // When isValidExport is called
    // Then it should return false
    expect(isValidExport({ ...validData, version: 2 })).toBe(false);
  });

  it('should reject data missing the transfers array', () => {
    // Given an object missing the transfers array
    // When isValidExport is called
    // Then it should return false
    const { transfers, ...noTransfers } = validData;
    expect(isValidExport(noTransfers)).toBe(false);
  });

  it('should reject null input', () => {
    // Given null as input
    // When isValidExport is called
    // Then it should return false
    expect(isValidExport(null)).toBe(false);
  });

  it('should reject string input', () => {
    // Given a raw string
    // When isValidExport is called
    // Then it should return false
    expect(isValidExport('not an object')).toBe(false);
  });

  // --- Item-level validation tests ---

  it('should reject account with missing name', () => {
    const data = {
      ...validData,
      accounts: [{ id: 1, initial_balance: 0, currency: 'USD' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject account with non-numeric id', () => {
    const data = {
      ...validData,
      accounts: [{ id: 'abc', name: 'Cash', initial_balance: 0, currency: 'USD' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject account with non-numeric initial_balance', () => {
    const data = {
      ...validData,
      accounts: [{ id: 1, name: 'Cash', initial_balance: 'zero', currency: 'USD' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject category with invalid type', () => {
    const data = {
      ...validData,
      categories: [{ id: 1, name: 'Bad', type: 'savings', color: '#f00', icon: 'x', is_default: 0 }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject category missing icon', () => {
    const data = {
      ...validData,
      categories: [{ id: 1, name: 'Food', type: 'expense', color: '#f00' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject category missing color', () => {
    const data = {
      ...validData,
      categories: [{ id: 1, name: 'Food', type: 'expense', icon: 'restaurant' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject transaction with missing date', () => {
    const data = {
      ...validData,
      transactions: [{ id: 1, amount: 50, type: 'expense', category_id: 1, account_id: 1 }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject transaction with string amount', () => {
    const data = {
      ...validData,
      transactions: [{ id: 1, amount: '50', type: 'expense', category_id: 1, account_id: 1, date: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject transaction with invalid type', () => {
    const data = {
      ...validData,
      transactions: [{ id: 1, amount: 50, type: 'refund', category_id: 1, account_id: 1, date: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject transfer with missing from_account_id', () => {
    const data = {
      ...validData,
      transfers: [{ id: 1, amount: 100, to_account_id: 2, date: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should accept transfer with null account ids (deleted account)', () => {
    const data = {
      ...validData,
      transfers: [{ id: 1, amount: 100, from_account_id: null, to_account_id: 2, to_amount: null, date: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(true);
  });

  it('should accept cross-currency transfer with to_amount', () => {
    const data = {
      ...validData,
      transfers: [{ id: 1, amount: 100, from_account_id: 1, to_account_id: 2, to_amount: 92.5, date: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(true);
  });

  it('should reject transfer with non-numeric amount', () => {
    const data = {
      ...validData,
      transfers: [{ id: 1, amount: 'hundred', from_account_id: 1, to_account_id: 2, date: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject when accounts array contains a non-object item', () => {
    const data = { ...validData, accounts: [42] };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject when accounts array contains null', () => {
    const data = { ...validData, accounts: [null] };
    expect(isValidExport(data)).toBe(false);
  });

  it('should accept valid budgets array', () => {
    const data = {
      ...validData,
      budgets: [{ id: 1, category_id: 1, amount: 200, period: 'monthly', currency: 'USD', created_at: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(true);
  });

  it('should reject budget with invalid period', () => {
    const data = {
      ...validData,
      budgets: [{ id: 1, category_id: 1, amount: 200, period: 'daily', currency: 'USD', created_at: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should reject budget missing currency', () => {
    const data = {
      ...validData,
      budgets: [{ id: 1, category_id: 1, amount: 200, period: 'monthly', created_at: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should accept every recurring frequency the app can write', () => {
    // Given one export per frequency the form offers — quarterly included, which was added to
    // the schema and the form but not to validation, making those backups unimportable
    for (const frequency of RECURRING_FREQUENCIES) {
      const data = {
        ...validData,
        recurring_transactions: [{
          id: 1, amount: 100, kind: 'transaction', type: 'expense', category_id: 1,
          account_id: 1, to_account_id: null, frequency, start_date: '2026-01-01',
          next_due_date: '2026-02-01', is_active: 1, created_at: '2026-01-01',
        }],
      };
      // When validating
      // Then it passes
      expect(isValidExport(data)).toBe(true);
    }
  });

  it('should reject an unknown recurring frequency', () => {
    // Given a frequency the app never writes
    const data = {
      ...validData,
      recurring_transactions: [{
        id: 1, amount: 100, kind: 'transaction', type: 'expense', category_id: 1,
        account_id: 1, to_account_id: null, frequency: 'fortnightly', start_date: '2026-01-01',
        next_due_date: '2026-02-01', is_active: 1, created_at: '2026-01-01',
      }],
    };
    // When validating
    // Then it is still rejected — deriving the list did not loosen the check
    expect(isValidExport(data)).toBe(false);
  });

  it('should accept every budget period the app can write', () => {
    // Given one export per period
    for (const period of BUDGET_PERIODS) {
      const data = {
        ...validData,
        budgets: [{ id: 1, category_id: 1, amount: 200, period, currency: 'USD', created_at: '2026-03-01' }],
      };
      // When validating
      // Then it passes
      expect(isValidExport(data)).toBe(true);
    }
  });

  it('should accept valid goals array', () => {
    const data = {
      ...validData,
      goals: [{ id: 1, category_id: 1, target_amount: 10000, currency: 'USD', start_date: '2026-03-01', target_date: '2026-12-31', created_at: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(true);
  });

  it('should accept a goal with no target date', () => {
    const data = {
      ...validData,
      goals: [{ id: 1, category_id: 1, target_amount: 10000, currency: 'USD', start_date: '2026-03-01', target_date: null, created_at: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(true);
  });

  it('should reject goal missing start date', () => {
    const data = {
      ...validData,
      goals: [{ id: 1, category_id: 1, target_amount: 10000, currency: 'USD', target_date: null, created_at: '2026-03-01' }],
    };
    expect(isValidExport(data)).toBe(false);
  });

  it('should accept a backup exported before goals existed', () => {
    // Given a backup with no goals key at all
    // When validating
    // Then it still passes — goals are optional for backwards compatibility
    expect(isValidExport(validData)).toBe(true);
  });

  it('should validate a realistic round-trip export structure', () => {
    // Given a realistic export with multiple entities and valid FK references
    const data = {
      version: 1,
      exported_at: '2026-03-21T12:00:00Z',
      accounts: [
        { id: 1, name: 'Cash', initial_balance: 500, currency: 'USD', color: '#55A3FF', icon: 'wallet', created_at: '2026-01-01T00:00:00Z' },
        { id: 2, name: 'Bank', initial_balance: 2000, currency: 'USD', color: '#4CAF50', icon: 'bank', created_at: '2026-01-01T00:00:00Z' },
      ],
      categories: [
        { id: 1, name: 'Food', type: 'expense', color: '#F44336', icon: 'restaurant', is_default: 1 },
        { id: 2, name: 'Salary', type: 'income', color: '#4CAF50', icon: 'work', is_default: 1 },
        { id: 3, name: 'Transport', type: 'expense', color: '#2196F3', icon: 'directions-car', is_default: 1 },
      ],
      transactions: [
        { id: 1, amount: 25, type: 'expense', category_id: 1, account_id: 1, note: 'lunch', date: '2026-03-20', created_at: '2026-03-20T12:00:00Z' },
        { id: 2, amount: 3000, type: 'income', category_id: 2, account_id: 2, note: null, date: '2026-03-15', created_at: '2026-03-15T09:00:00Z' },
      ],
      transfers: [
        { id: 1, from_account_id: 2, to_account_id: 1, amount: 200, note: 'pocket money', date: '2026-03-18', created_at: '2026-03-18T10:00:00Z' },
      ],
      settings: { currency: 'EUR', accent_color: '#6366f1', number_format: 'de-DE' },
    };

    // When isValidExport is called
    // Then it should pass validation
    expect(isValidExport(data)).toBe(true);

    // And all FK references should be consistent
    const accountIds = new Set(data.accounts.map((a) => a.id));
    const categoryIds = new Set(data.categories.map((c) => c.id));
    for (const tx of data.transactions) {
      expect(accountIds.has(tx.account_id)).toBe(true);
      expect(categoryIds.has(tx.category_id)).toBe(true);
    }
    for (const tr of data.transfers) {
      expect(accountIds.has(tr.from_account_id)).toBe(true);
      expect(accountIds.has(tr.to_account_id)).toBe(true);
    }
  });
});
