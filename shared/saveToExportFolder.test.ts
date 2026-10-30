import { StorageAccessFramework } from 'expo-file-system/legacy';
import { useUIStore } from '@/shared/store/useUIStore';
import { safDirToPath, saveToExportFolder, type ExportFile } from './saveToExportFolder';

jest.mock('expo-file-system/legacy', () => ({
  StorageAccessFramework: {
    createFileAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
    requestDirectoryPermissionsAsync: jest.fn(),
  },
}));

const saf = StorageAccessFramework as jest.Mocked<typeof StorageAccessFramework>;

const CACHED = 'content://com.android.externalstorage.documents/tree/primary%3ADownload%2FBackups';
const PICKED = 'content://com.android.externalstorage.documents/tree/primary%3ADocuments';
const FILE: ExportFile = { filename: 'statement.pdf', mimeType: 'application/pdf', contents: 'UERG', encoding: 'base64' };

function settingsDb(cachedUri: string | null) {
  return {
    get: jest.fn().mockResolvedValue(cachedUri ? { value: cachedUri } : null),
    set: jest.fn().mockResolvedValue(undefined),
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  useUIStore.setState({ externalActivityActive: false });
  saf.createFileAsync.mockImplementation(async (dir, name) => `${dir}/document/${name}`);
  saf.writeAsStringAsync.mockResolvedValue(undefined);
});

describe('safDirToPath', () => {
  it('turns a primary-storage tree URI into a folder path', () => {
    // Given the URI Android hands back for Download/Backups
    // When converted
    // Then it reads as a plain path
    expect(safDirToPath(CACHED)).toBe('Download/Backups');
  });
});

describe('saveToExportFolder', () => {
  it('writes into the remembered folder without asking again', async () => {
    // Given a folder picked on an earlier export
    const db = settingsDb(CACHED);
    const onPicker = jest.fn();

    // When a file is saved
    const result = await saveToExportFolder(db, FILE, onPicker);

    // Then it lands there, in the file's own encoding, and no picker opens
    expect(result).toEqual({ status: 'saved', path: 'Download/Backups/statement.pdf' });
    expect(saf.createFileAsync).toHaveBeenCalledWith(CACHED, 'statement.pdf', 'application/pdf');
    expect(saf.writeAsStringAsync).toHaveBeenCalledWith(`${CACHED}/document/statement.pdf`, 'UERG', { encoding: 'base64' });
    expect(saf.requestDirectoryPermissionsAsync).not.toHaveBeenCalled();
    expect(onPicker).not.toHaveBeenCalled();
  });

  it('asks for a folder the first time and remembers it', async () => {
    // Given no folder yet
    const db = settingsDb(null);
    const onPicker = jest.fn();
    saf.requestDirectoryPermissionsAsync.mockResolvedValue({ granted: true, directoryUri: PICKED });

    // When a file is saved
    const result = await saveToExportFolder(db, FILE, onPicker);

    // Then the picker opens, the choice is stored for next time, and the file is written
    expect(onPicker.mock.calls).toEqual([[true], [false]]);
    expect(useUIStore.getState().externalActivityActive).toBe(true);
    expect(db.set).toHaveBeenCalledWith('export_directory_uri', PICKED);
    expect(result).toEqual({ status: 'saved', path: 'Documents/statement.pdf' });
  });

  it('asks again when access to the remembered folder was revoked', async () => {
    // Given a remembered folder that can no longer be written
    const db = settingsDb(CACHED);
    saf.createFileAsync.mockRejectedValueOnce(new Error('permission denied'));
    saf.requestDirectoryPermissionsAsync.mockResolvedValue({ granted: true, directoryUri: PICKED });

    // When a file is saved
    const result = await saveToExportFolder(db, FILE);

    // Then the new folder replaces it
    expect(db.set).toHaveBeenCalledWith('export_directory_uri', PICKED);
    expect(result).toEqual({ status: 'saved', path: 'Documents/statement.pdf' });
  });

  it('reports a cancel when no folder is picked', async () => {
    // Given the user backs out of the picker
    const db = settingsDb(null);
    saf.requestDirectoryPermissionsAsync.mockResolvedValue({ granted: false });

    // When a file is saved
    const result = await saveToExportFolder(db, FILE);

    // Then nothing is written or remembered
    expect(result).toEqual({ status: 'cancelled' });
    expect(db.set).not.toHaveBeenCalled();
    expect(saf.createFileAsync).not.toHaveBeenCalled();
  });

  it('reports a failure when the picked folder cannot be written', async () => {
    // Given a folder that rejects the write
    const db = settingsDb(null);
    saf.requestDirectoryPermissionsAsync.mockResolvedValue({ granted: true, directoryUri: PICKED });
    saf.writeAsStringAsync.mockRejectedValue(new Error('read-only'));

    // When a file is saved
    const result = await saveToExportFolder(db, FILE);

    // Then the caller is told it failed
    expect(result).toEqual({ status: 'failed' });
  });
});
