import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '@/constants/google';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_FILENAME = 'its-a-my-money-backup.json';
const BACKUP_FOLDER_NAME = "It's a My Money! Backups";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  configured = true;
}

export async function signIn(): Promise<{ email: string }> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  const email = response.data?.user.email;
  if (!email) throw new Error('Sign-in failed: no email returned');
  return { email };
}

export async function signOut(): Promise<void> {
  await GoogleSignin.signOut();
}

export async function getAccessToken(): Promise<string> {
  ensureConfigured();
  const tokens = await GoogleSignin.getTokens();
  return tokens.accessToken;
}

async function driveGet(accessToken: string, url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function ensureBackupFolder(
  accessToken: string
): Promise<{ id: string; name: string }> {
  // Search for existing folder created by this app
  const escapedName = BACKUP_FOLDER_NAME.replace(/'/g, "\\'");
  const query = `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const result = await driveGet(
    accessToken,
    `${DRIVE_API}?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`
  );

  if (result.files?.length > 0) {
    return { id: result.files[0].id, name: result.files[0].name };
  }

  // Create the folder
  const res = await fetch(DRIVE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create backup folder: ${text}`);
  }

  const folder = await res.json();
  return { id: folder.id, name: folder.name };
}

async function findBackupFile(
  accessToken: string,
  folderId: string
): Promise<string | null> {
  const query = `name='${BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`;
  const result = await driveGet(
    accessToken,
    `${DRIVE_API}?q=${encodeURIComponent(query)}&fields=files(id)&spaces=drive`
  );
  return result.files?.[0]?.id ?? null;
}

export async function downloadBackup(
  accessToken: string,
  folderId: string
): Promise<string> {
  const fileId = await findBackupFile(accessToken, folderId);
  if (!fileId) throw new Error('No backup found in Google Drive');

  const res = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to download backup: ${text}`);
  }
  return res.text();
}

export async function uploadBackup(
  accessToken: string,
  folderId: string,
  jsonContent: string
): Promise<void> {
  const existingFileId = await findBackupFile(accessToken, folderId);

  if (existingFileId) {
    // Update existing file content
    const res = await fetch(
      `${DRIVE_UPLOAD_API}/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: jsonContent,
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to update backup: ${text}`);
    }
  } else {
    // Create new file with multipart upload (metadata + content)
    const boundary = 'backup_boundary_' + Date.now();
    const metadata = JSON.stringify({
      name: BACKUP_FILENAME,
      parents: [folderId],
      mimeType: 'application/json',
    });

    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      metadata + '\r\n' +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      jsonContent + '\r\n' +
      `--${boundary}--`;

    const res = await fetch(
      `${DRIVE_UPLOAD_API}?uploadType=multipart`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create backup: ${text}`);
    }
  }
}
