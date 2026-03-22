import { signIn, signOut, getAccessToken, ensureBackupFolder, uploadBackup } from './googleDrive';

// Mock constants
jest.mock('@/constants/google', () => ({
  GOOGLE_WEB_CLIENT_ID: 'test-web-client-id',
  GOOGLE_IOS_CLIENT_ID: 'test-ios-client-id',
}));

// Mock @react-native-google-signin/google-signin
const mockConfigure = jest.fn();
const mockHasPlayServices = jest.fn().mockResolvedValue(true);
const mockSignIn = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockGetTokens = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (...args: any[]) => mockConfigure(...args),
    hasPlayServices: () => mockHasPlayServices(),
    signIn: () => mockSignIn(),
    signOut: () => mockSignOut(),
    getTokens: () => mockGetTokens(),
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('signIn', () => {
  it('should return the signed-in user email', async () => {
    mockSignIn.mockResolvedValue({ data: { user: { email: 'test@gmail.com' } } });

    const result = await signIn();

    expect(mockHasPlayServices).toHaveBeenCalled();
    expect(result.email).toBe('test@gmail.com');
  });

  it('should throw when no email is returned', async () => {
    mockSignIn.mockResolvedValue({ data: null });

    await expect(signIn()).rejects.toThrow('Sign-in failed: no email returned');
  });
});

describe('signOut', () => {
  it('should call GoogleSignin.signOut', async () => {
    await signOut();
    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe('getAccessToken', () => {
  it('should return the access token', async () => {
    mockGetTokens.mockResolvedValue({ accessToken: 'mock-token-123' });

    const token = await getAccessToken();

    expect(token).toBe('mock-token-123');
  });
});

describe('ensureBackupFolder', () => {
  it('should return existing folder if found', async () => {
    // Given: Drive API returns an existing folder
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: [{ id: 'folder-123', name: "It's a My Money! Backups" }] }),
    });

    const result = await ensureBackupFolder('token');

    expect(result).toEqual({ id: 'folder-123', name: "It's a My Money! Backups" });
  });

  it('should create a new folder if none exists', async () => {
    // Given: no existing folder found
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-folder-456', name: "It's a My Money! Backups" }),
      });

    const result = await ensureBackupFolder('token');

    expect(result).toEqual({ id: 'new-folder-456', name: "It's a My Money! Backups" });
    // Verify POST was called to create folder
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][1].method).toBe('POST');
  });
});

describe('uploadBackup', () => {
  it('should update existing file with PATCH when file exists', async () => {
    // Given: backup file already exists in folder
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'file-789' }] }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    await uploadBackup('token', 'folder-123', '{"version":1}');

    // Then: PATCH was used to update
    expect(mockFetch.mock.calls[1][1].method).toBe('PATCH');
    expect(mockFetch.mock.calls[1][0]).toContain('file-789');
  });

  it('should create new file with POST when no file exists', async () => {
    // Given: no existing backup file
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    await uploadBackup('token', 'folder-123', '{"version":1}');

    // Then: POST with multipart was used
    expect(mockFetch.mock.calls[1][1].method).toBe('POST');
    expect(mockFetch.mock.calls[1][1].headers['Content-Type']).toContain('multipart/related');
  });
});
