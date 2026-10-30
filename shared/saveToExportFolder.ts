import { StorageAccessFramework } from 'expo-file-system/legacy';
import type { useSettingsDb } from '@/db';
import { useUIStore } from '@/shared/store/useUIStore';

type SettingsDb = ReturnType<typeof useSettingsDb>;

export interface ExportFile {
  filename: string;
  mimeType: string;
  contents: string;
  encoding: 'utf8' | 'base64';
}

export type SaveResult =
  | { status: 'saved'; path: string }
  | { status: 'cancelled' }
  | { status: 'failed' };

/** A SAF tree URI as a readable folder path, e.g. "Download/Backups". */
export function safDirToPath(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const match = decoded.match(/tree\/primary:(.*)$/);
  return match ? match[1] : decoded.replace(/^content:\/\/.*\/tree\//, '');
}

async function writeToDirectory(dirUri: string, file: ExportFile): Promise<boolean> {
  try {
    const fileUri = await StorageAccessFramework.createFileAsync(dirUri, file.filename, file.mimeType);
    await StorageAccessFramework.writeAsStringAsync(fileUri, file.contents, { encoding: file.encoding });
    return true;
  } catch {
    return false;
  }
}

/**
 * Android only: saves the file into the user's export folder (`export_directory_uri`), shared by
 * every export. The folder is asked for the first time, and again if access was revoked.
 * `onPicker(true)` runs just before the OS folder picker opens and `onPicker(false)` once a folder
 * was granted, so the caller can hide and re-show its progress overlay.
 */
export async function saveToExportFolder(
  settingsDb: SettingsDb,
  file: ExportFile,
  onPicker?: (open: boolean) => void,
): Promise<SaveResult> {
  const cached = await settingsDb.get('export_directory_uri');
  if (cached?.value && await writeToDirectory(cached.value, file)) {
    return { status: 'saved', path: `${safDirToPath(cached.value)}/${file.filename}` };
  }

  onPicker?.(true);
  useUIStore.getState().setExternalActivityActive(true);
  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted) return { status: 'cancelled' };

  onPicker?.(false);
  await settingsDb.set('export_directory_uri', perm.directoryUri);
  return await writeToDirectory(perm.directoryUri, file)
    ? { status: 'saved', path: `${safDirToPath(perm.directoryUri)}/${file.filename}` }
    : { status: 'failed' };
}
