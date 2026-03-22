# Privacy Policy

**Last updated:** March 22, 2026

**It's a My Money!** is a personal finance app built for Android. This privacy policy explains how the app handles your data.

## Data Storage

All your financial data — accounts, transactions, transfers, categories, and settings — is stored **locally on your device** in a SQLite database. The app does not have a server, backend, or cloud infrastructure. Your data never leaves your device unless you explicitly choose to export or back it up.

## Google Drive Backup (Optional)

If you choose to enable Google Drive backup:

- The app uses Google Sign-In to authenticate with your Google account.
- The app requests the `drive.file` scope, which only allows access to files the app itself creates. It cannot read, modify, or delete any other files in your Google Drive.
- A single backup file is stored in a dedicated folder ("It's a My Money! Backups") in your Google Drive.
- Backups contain the same data as a manual JSON export: accounts, categories, transactions, transfers, and app settings.
- You can disconnect Google Drive at any time from the app's settings. The backup file will remain in your Google Drive until you delete it manually.

The app does **not** store your Google password or OAuth tokens. Authentication is handled entirely by the Google Sign-In library on your device.

## Data Collection

The app does **not** collect, transmit, or share any data with the developer or any third party. Specifically:

- No analytics or tracking SDKs
- No crash reporting services
- No advertising networks
- No telemetry of any kind
- No personal information sent to any server

## Biometric Lock

If you enable biometric lock, the app uses your device's fingerprint or face recognition to restrict access. Biometric data is handled entirely by your device's operating system — the app never accesses, stores, or transmits biometric information.

## Your Controls

You have full control over your data at all times:

- **Export** — Export all data as a JSON file from Settings.
- **Import** — Import data from a JSON backup or Monefy CSV.
- **Delete** — Reset all data from Settings, which permanently erases everything.
- **Google Drive** — Connect or disconnect backup at any time.
- **Biometric lock** — Enable or disable device authentication.

## Children's Privacy

The app does not knowingly collect data from children under 13. Since no data is collected from any user, this is not applicable.

## Changes to This Policy

If this policy is updated, the changes will be reflected in this file with an updated date.

## Contact

If you have questions about this privacy policy, you can reach the developer at:

- GitHub: [@itsmariodias](https://github.com/itsmariodias)
- Repository: [its-a-my-money](https://github.com/itsmariodias/its-a-my-money)
