# It's a My Money! 💰

A personal finance app built with Expo. Track your income, expenses, transfers, and account balances — fully offline, no accounts, no cloud, no nonsense.

> **Platform support:** Android is fully supported. iOS is **not yet supported** — if you'd like to help test or contribute to iOS support, check the [issues](https://github.com/itsmariodias/its-a-my-money/issues) or open a new one!

> Vibe coded by [@itsmariodias](https://github.com/itsmariodias) with [Claude Code](https://claude.ai/code) (Anthropic). Every screen, component, and feature in this app was built through a conversation with Claude — no manual coding required.

---

## What it does

**Dashboard**
- Total balance and period income/expense summary
- Spending breakdown by category as an animated donut chart — tap a slice to highlight it
- Recent transactions list
- Filter by account or time period (day, month, year)

**Transactions**
- Full transaction history grouped by date
- Tap to edit, swipe left to delete
- Filter by account and time period
- Section totals per day

**Transfers**
- Move money between accounts with a dedicated transfer sheet
- Save & Add Another for entering multiple transfers in one session

**Accounts**
- Manage multiple wallets (Cash, Bank, Credit Card, etc.)
- Each account has a name, icon, color, currency, and initial balance
- Swipe left to delete (with cascade delete of linked transactions)
- Running balance calculated from initial balance + net transactions

**Cloud Backup**
- Automatic Google Drive backup — daily, weekly, or monthly
- Uses the same JSON format as manual export
- Single file in a dedicated Drive folder, overwritten each backup
- OS notifications when backup starts and completes
- Connect/disconnect from Settings with one tap

**Settings**
- Currency picker (50+ currencies)
- Theme — 4 presets: Dark Blue (default), White, OLED Black, Super Mario
- Accent color — 8 color presets
- Number format — US, European, French, Indian, or no-grouping
- Biometric lock — fingerprint/Face ID to protect the app
- Manage income and expense categories (add, edit, delete)
- Export all data as JSON (includes theme preference)
- Import from JSON backup or Monefy CSV
- Full data reset

---

## Tech stack

- [Expo](https://expo.dev) (managed workflow)
- [expo-router](https://expo.github.io/router) — file-based navigation
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) — local SQLite database, all data on-device
- [Zustand](https://zustand-demo.pmnd.rs) — global state management
- [@react-native-google-signin/google-signin](https://github.com/react-native-google-signin/google-signin) — Google OAuth for Drive backup
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) — local backup notifications
- [expo-local-authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/) — biometric lock
- TypeScript throughout

All data is stored locally on your device. Cloud backup to Google Drive is optional and user-initiated.

---

## Running locally

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android
```

### Environment setup

Copy `.env.example` to `.env.local` and fill in your Google OAuth credentials:

```bash
cp .env.example .env.local
```

Google Drive backup requires OAuth client IDs from the [Google Cloud Console](https://console.cloud.google.com/). Create OAuth 2.0 credentials for Web, iOS, and Android clients with the `drive.file` scope.

### Development builds

Native modules (Google Sign-In, notifications) require a development build — Expo Go is not supported. Use [EAS Build](https://docs.expo.dev/develop/development-builds/create-a-build/) to create one:

```bash
npx eas build --profile development --platform android
```

Install the resulting APK/IPA on your device, then run `pnpm start` and scan the QR code.

---

## About

Built by [@itsmariodias](https://github.com/itsmariodias) as a personal project.

This app is 100% vibe coded — designed and built entirely through back-and-forth conversation with **Claude Code** by Anthropic, without writing a single line of code manually. Claude handled the architecture, components, database schema, state management, UI, and everything in between.
