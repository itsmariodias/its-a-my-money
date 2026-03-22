import { generateExportData, generateExportJson } from './exportData';
import type { SQLiteDatabase } from 'expo-sqlite';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getMockDb } = require('../../__mocks__/expo-sqlite');
const mockDb = getMockDb() as unknown as SQLiteDatabase;

describe('exportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAccounts = [{ id: 1, name: 'Cash', initial_balance: 100, currency: 'USD', color: '#55A3FF', icon: 'account-balance-wallet', created_at: '2026-01-01' }];
  const mockCategories = [{ id: 1, name: 'Food', type: 'expense', color: '#FF5722', icon: 'restaurant', is_default: 1 }];
  const mockTransactions = [{ id: 1, amount: 50, type: 'expense', category_id: 1, account_id: 1, note: null, date: '2026-03-01', created_at: '2026-03-01' }];
  const mockTransfers = [{ id: 1, from_account_id: 1, to_account_id: 2, amount: 25, note: null, date: '2026-03-01', created_at: '2026-03-01' }];

  it('should return all data with correct structure', async () => {
    // Given: DB has accounts, categories, transactions, transfers, and settings
    (mockDb.getAllAsync as jest.Mock)
      .mockResolvedValueOnce(mockAccounts)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockTransactions)
      .mockResolvedValueOnce(mockTransfers);

    (mockDb.getFirstAsync as jest.Mock)
      .mockResolvedValueOnce({ value: 'EUR' })
      .mockResolvedValueOnce({ value: '#ff0000' })
      .mockResolvedValueOnce({ value: 'de-DE' })
      .mockResolvedValueOnce({ value: 'true' });

    // When: generating export data
    const result = await generateExportData(mockDb);

    // Then: data has the expected structure and values
    expect(result.version).toBe(1);
    expect(result.exported_at).toBeDefined();
    expect(result.accounts).toEqual(mockAccounts);
    expect(result.categories).toEqual(mockCategories);
    expect(result.transactions).toEqual(mockTransactions);
    expect(result.transfers).toEqual(mockTransfers);
    expect(result.settings).toEqual({
      currency: 'EUR',
      accent_color: '#ff0000',
      number_format: 'de-DE',
      biometric_lock: 'true',
    });
  });

  it('should use default settings when none are stored', async () => {
    // Given: no settings rows exist
    (mockDb.getAllAsync as jest.Mock).mockResolvedValue([]);
    (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);

    // When: generating export data
    const result = await generateExportData(mockDb);

    // Then: defaults are applied
    expect(result.settings.currency).toBe('USD');
    expect(result.settings.accent_color).toBeNull();
    expect(result.settings.number_format).toBe('en-US');
    expect(result.settings.biometric_lock).toBe('false');
  });

  it('should return valid JSON string from generateExportJson', async () => {
    // Given: DB returns data
    (mockDb.getAllAsync as jest.Mock).mockResolvedValue([]);
    (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);

    // When: generating export JSON
    const json = await generateExportJson(mockDb);

    // Then: it parses as valid JSON with expected keys
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('version', 1);
    expect(parsed).toHaveProperty('accounts');
    expect(parsed).toHaveProperty('categories');
    expect(parsed).toHaveProperty('transactions');
    expect(parsed).toHaveProperty('transfers');
    expect(parsed).toHaveProperty('settings');
  });
});
