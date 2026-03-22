import { useBackupStore, initialBackupState } from './useBackupStore';

describe('useBackupStore', () => {
  beforeEach(() => {
    useBackupStore.setState(initialBackupState);
  });

  it('should have correct defaults', () => {
    const state = useBackupStore.getState();
    expect(state.googleDriveEnabled).toBe(false);
    expect(state.googleEmail).toBeNull();
    expect(state.folderId).toBeNull();
    expect(state.folderName).toBeNull();
    expect(state.backupFrequency).toBe('weekly');
    expect(state.lastBackupAt).toBeNull();
    expect(state.isBackingUp).toBe(false);
  });

  it('should update Google Drive connection state', () => {
    const { setGoogleDriveEnabled, setGoogleEmail, setFolder } = useBackupStore.getState();

    setGoogleDriveEnabled(true);
    setGoogleEmail('test@gmail.com');
    setFolder('folder-123', "It's a My Money! Backups");

    const state = useBackupStore.getState();
    expect(state.googleDriveEnabled).toBe(true);
    expect(state.googleEmail).toBe('test@gmail.com');
    expect(state.folderId).toBe('folder-123');
    expect(state.folderName).toBe("It's a My Money! Backups");
  });

  it('should update backup frequency', () => {
    useBackupStore.getState().setBackupFrequency('daily');
    expect(useBackupStore.getState().backupFrequency).toBe('daily');

    useBackupStore.getState().setBackupFrequency('monthly');
    expect(useBackupStore.getState().backupFrequency).toBe('monthly');
  });

  it('should update last backup timestamp', () => {
    const now = new Date().toISOString();
    useBackupStore.getState().setLastBackupAt(now);
    expect(useBackupStore.getState().lastBackupAt).toBe(now);
  });

  it('should update isBackingUp flag', () => {
    useBackupStore.getState().setIsBackingUp(true);
    expect(useBackupStore.getState().isBackingUp).toBe(true);
  });

  it('should clear state on disconnect', () => {
    // Given: a connected state
    const s = useBackupStore.getState();
    s.setGoogleDriveEnabled(true);
    s.setGoogleEmail('test@gmail.com');
    s.setFolder('folder-123', 'Backups');
    s.setLastBackupAt('2026-03-22T00:00:00Z');

    // When: resetting to initial state
    useBackupStore.setState(initialBackupState);

    // Then: all values are cleared
    const state = useBackupStore.getState();
    expect(state.googleDriveEnabled).toBe(false);
    expect(state.googleEmail).toBeNull();
    expect(state.folderId).toBeNull();
  });
});
