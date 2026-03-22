import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { Text } from '@/shared/components/Themed';
import { useSettingsDb } from '@/db';
import { useBackupStore, initialBackupState } from './useBackupStore';
import type { BackupFrequency } from './useBackupStore';
import { signIn, signOut, getAccessToken, ensureBackupFolder, uploadBackup } from './googleDrive';
import { generateExportJson } from '@/features/settings/exportData';
import { requestNotificationPermission, notifyBackupStarted, notifyBackupCompleted } from './notifications';

const FREQUENCY_OPTIONS: { value: BackupFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Never';
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

interface Props {
  isDark: boolean;
  cardBg: string;
  textColor: string;
  subColor: string;
  borderColor: string;
  inputBg: string;
  accentColor: string;
}

export default function GoogleDriveSection({
  isDark, cardBg, textColor, subColor, borderColor, inputBg, accentColor,
}: Props) {
  const db = useSQLiteContext();
  const settingsDb = useSettingsDb();

  const googleDriveEnabled = useBackupStore((s) => s.googleDriveEnabled);
  const googleEmail = useBackupStore((s) => s.googleEmail);
  const folderName = useBackupStore((s) => s.folderName);
  const backupFrequency = useBackupStore((s) => s.backupFrequency);
  const lastBackupAt = useBackupStore((s) => s.lastBackupAt);
  const isBackingUp = useBackupStore((s) => s.isBackingUp);

  const setGoogleDriveEnabled = useBackupStore((s) => s.setGoogleDriveEnabled);
  const setGoogleEmail = useBackupStore((s) => s.setGoogleEmail);
  const setFolder = useBackupStore((s) => s.setFolder);
  const setBackupFrequency = useBackupStore((s) => s.setBackupFrequency);
  const setLastBackupAt = useBackupStore((s) => s.setLastBackupAt);
  const setIsBackingUp = useBackupStore((s) => s.setIsBackingUp);

  const [connecting, setConnecting] = useState(false);
  const [freqModalOpen, setFreqModalOpen] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { email } = await signIn();
      const token = await getAccessToken();
      const folder = await ensureBackupFolder(token);

      await requestNotificationPermission();

      setGoogleDriveEnabled(true);
      setGoogleEmail(email);
      setFolder(folder.id, folder.name);
      setBackupFrequency('weekly');

      await Promise.all([
        settingsDb.set('google_drive_enabled', 'true'),
        settingsDb.set('google_email', email),
        settingsDb.set('google_drive_folder_id', folder.id),
        settingsDb.set('google_drive_folder_name', folder.name),
        settingsDb.set('backup_frequency', 'weekly'),
      ]);
    } catch (e: any) {
      console.error('Google Drive connect failed:', e);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await signOut();
    } catch { /* ignore sign-out errors */ }

    useBackupStore.setState(initialBackupState);

    await Promise.all([
      settingsDb.set('google_drive_enabled', 'false'),
      settingsDb.set('google_email', ''),
      settingsDb.set('google_drive_folder_id', ''),
      settingsDb.set('google_drive_folder_name', ''),
      settingsDb.set('backup_frequency', 'weekly'),
      settingsDb.set('last_backup_at', ''),
    ]);
  };

  const handleBackupNow = async () => {
    const { folderId } = useBackupStore.getState();
    if (!folderId || isBackingUp) return;

    setIsBackingUp(true);
    try {
      await notifyBackupStarted();
      const token = await getAccessToken();
      const json = await generateExportJson(db);
      await uploadBackup(token, folderId, json);

      const now = new Date().toISOString();
      setLastBackupAt(now);
      await settingsDb.set('last_backup_at', now);
      await notifyBackupCompleted(true);
    } catch (e: any) {
      console.error('Manual backup failed:', e);
      await notifyBackupCompleted(false, e?.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFrequencyChange = async (freq: BackupFrequency) => {
    setBackupFrequency(freq);
    await settingsDb.set('backup_frequency', freq);
    setFreqModalOpen(false);
  };

  // --- Not connected ---
  if (!googleDriveEnabled) {
    return (
      <>
        <Text style={[styles.sectionLabel, { color: subColor }]}>Cloud Backup</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <TouchableOpacity style={styles.row} onPress={handleConnect} activeOpacity={0.7} disabled={connecting}>
            <View style={[styles.rowIcon, { backgroundColor: '#4285f420' }]}>
              <MaterialIcons name="cloud-upload" size={20} color="#4285f4" />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>Google Drive Backup</Text>
            {connecting ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <>
                <Text style={[styles.rowValue, { color: accentColor }]}>Connect</Text>
                <MaterialIcons name="chevron-right" size={20} color={subColor} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // --- Connected ---
  return (
    <>
      <Text style={[styles.sectionLabel, { color: subColor }]}>Cloud Backup</Text>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        {/* Account row */}
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: '#4285f420' }]}>
            <MaterialIcons name="account-circle" size={20} color="#4285f4" />
          </View>
          <Text style={[styles.rowLabel, { color: textColor }]}>Account</Text>
          <Text style={[styles.rowValue, { color: subColor }]} numberOfLines={1}>{googleEmail}</Text>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

        {/* Folder row */}
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: '#f59e0b20' }]}>
            <MaterialIcons name="folder" size={20} color="#f59e0b" />
          </View>
          <Text style={[styles.rowLabel, { color: textColor }]}>Folder</Text>
          <Text style={[styles.rowValue, { color: subColor }]} numberOfLines={1}>{folderName}</Text>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

        {/* Frequency row */}
        <TouchableOpacity style={styles.row} onPress={() => setFreqModalOpen(true)} activeOpacity={0.7}>
          <View style={[styles.rowIcon, { backgroundColor: '#8b5cf620' }]}>
            <MaterialIcons name="schedule" size={20} color="#8b5cf6" />
          </View>
          <Text style={[styles.rowLabel, { color: textColor }]}>Frequency</Text>
          <Text style={[styles.rowValue, { color: subColor }]}>
            {FREQUENCY_OPTIONS.find((o) => o.value === backupFrequency)?.label}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={subColor} />
        </TouchableOpacity>

        <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

        {/* Last backup row */}
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: '#22c55e20' }]}>
            <MaterialIcons name="history" size={20} color="#22c55e" />
          </View>
          <Text style={[styles.rowLabel, { color: textColor }]}>Last Backup</Text>
          <Text style={[styles.rowValue, { color: subColor }]}>{formatRelativeTime(lastBackupAt)}</Text>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

        {/* Backup Now button */}
        <TouchableOpacity style={styles.row} onPress={handleBackupNow} activeOpacity={0.7} disabled={isBackingUp}>
          <View style={[styles.rowIcon, { backgroundColor: accentColor + '20' }]}>
            {isBackingUp ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <MaterialIcons name="cloud-upload" size={20} color={accentColor} />
            )}
          </View>
          <Text style={[styles.rowLabel, { color: accentColor, fontWeight: '600' }]}>
            {isBackingUp ? 'Backing up...' : 'Backup Now'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

        {/* Disconnect */}
        <TouchableOpacity style={styles.row} onPress={handleDisconnect} activeOpacity={0.7}>
          <View style={[styles.rowIcon, { backgroundColor: '#ef444420' }]}>
            <MaterialIcons name="link-off" size={20} color="#ef4444" />
          </View>
          <Text style={[styles.rowLabel, { color: '#ef4444' }]}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Frequency picker modal */}
      <Modal visible={freqModalOpen} animationType="fade" transparent onRequestClose={() => setFreqModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFreqModalOpen(false)} />
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Backup Frequency</Text>
            {FREQUENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.freqOption, { backgroundColor: inputBg }]}
                onPress={() => handleFrequencyChange(opt.value)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={backupFrequency === opt.value ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={22}
                  color={backupFrequency === opt.value ? accentColor : subColor}
                />
                <Text style={[styles.freqLabel, { color: textColor }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.freqCancel} onPress={() => setFreqModalOpen(false)}>
              <Text style={[styles.freqCancelText, { color: subColor }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 24, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 14, maxWidth: 180 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalCard: { width: '100%', borderRadius: 20, overflow: 'hidden', paddingTop: 28, paddingHorizontal: 24, paddingBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  freqOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8 },
  freqLabel: { fontSize: 15, fontWeight: '500' },
  freqCancel: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  freqCancelText: { fontSize: 15, fontWeight: '500' },
});
