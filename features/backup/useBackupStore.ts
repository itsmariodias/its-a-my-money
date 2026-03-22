import { create } from 'zustand';

export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

interface BackupState {
  googleDriveEnabled: boolean;
  googleEmail: string | null;
  folderId: string | null;
  folderName: string | null;
  backupFrequency: BackupFrequency;
  lastBackupAt: string | null;
  isBackingUp: boolean;
  setGoogleDriveEnabled: (enabled: boolean) => void;
  setGoogleEmail: (email: string | null) => void;
  setFolder: (id: string | null, name: string | null) => void;
  setBackupFrequency: (freq: BackupFrequency) => void;
  setLastBackupAt: (date: string | null) => void;
  setIsBackingUp: (val: boolean) => void;
}

export const initialBackupState = {
  googleDriveEnabled: false,
  googleEmail: null as string | null,
  folderId: null as string | null,
  folderName: null as string | null,
  backupFrequency: 'weekly' as BackupFrequency,
  lastBackupAt: null as string | null,
  isBackingUp: false,
};

export const useBackupStore = create<BackupState>((set) => ({
  ...initialBackupState,
  setGoogleDriveEnabled: (googleDriveEnabled) => set({ googleDriveEnabled }),
  setGoogleEmail: (googleEmail) => set({ googleEmail }),
  setFolder: (folderId, folderName) => set({ folderId, folderName }),
  setBackupFrequency: (backupFrequency) => set({ backupFrequency }),
  setLastBackupAt: (lastBackupAt) => set({ lastBackupAt }),
  setIsBackingUp: (isBackingUp) => set({ isBackingUp }),
}));
