import { isValidExport } from './validation';

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
