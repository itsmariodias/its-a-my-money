# It's a My Money! 💰

A personal finance app built with Expo. Track your income, expenses, transfers, and account balances — all data stored locally on your device. Cloud backup is opt-in and only stores data in your own Google Drive.

> **Platform support:** Android is fully supported. iOS is **not yet supported** — if you'd like to help test or contribute to iOS support, check the [issues](https://github.com/itsmariodias/its-a-my-money/issues) or open a new one!

> Vibe coded by [@itsmariodias](https://github.com/itsmariodias) with [Claude Code](https://claude.ai/code) (Anthropic). Every screen, component, and feature in this app was built through a conversation with Claude — no manual coding required.

---

## What it does

**Dashboard**
- Total balance and period income/expense summary
- Spending breakdown by category as an animated donut chart — tap a slice to highlight it
- Portfolio allocation donut — per-investment-account slices sized by invested amount, with live P&L % beside each
- Recent transactions list
- Filter by account or time period (day, month, year)
- Multi-currency aware — when no account filter is active, aggregates are scoped to your primary currency (no FX conversion); the currency code shows in the balance card

**Transactions**
- Full transaction history grouped by date
- Tap a row to edit; delete from inside the edit sheet
- Filter by account and time period
- Section totals per day
- Category filter chips — tap one or more to narrow the list; Transfers chip appears when an account is selected
- Group by category view — see per-category totals sorted by amount, expand each row to drill into individual entries

**Transfers**
- Move money between accounts with a dedicated transfer sheet
- Save & Add Another for entering multiple transfers in one session
- Cross-currency transfers — pick accounts in different currencies and the sheet reveals a second "Amount received" field. No FX rate ever invented; you type both sides

**Accounts**
- Manage multiple wallets (Cash, Bank, Credit Card, etc.) across any of 50+ currencies
- Each account has a name, icon, color, currency, and initial balance — currency is set per-account at creation
- Tap to edit; delete from inside the edit sheet. Linked transactions cascade-delete; transfers are kept and the deleted side renders as "Unknown"
- Running balance calculated from initial balance + net transactions
- Total Balance card is a swipeable carousel — one page per currency, primary currency leads (no cross-currency conversion)
- P&L stats — percentage change vs. previous period shown on each account card and total balance
- Investment accounts — track fixed deposits, mutual funds, trades alongside cash. Invested amount auto-computed from transfers and transactions; current market value is user-editable. P&L on each investment card is live market value vs. invested

**Budgets**
- Set spending limits per expense category — weekly, monthly, or yearly, in any currency
- Each budget tracks its own period independent of the Dashboard filter
- Currency-scoped spend — a USD food budget only counts expenses on USD accounts; same category in another currency is a separate budget
- Dashboard card with one row per budget: progress bar, percent used, spent vs. limit
- Color-coded status — green under 80%, amber 80–99%, red at or over 100%
- Local notification when a transaction pushes a budget over its limit
- Manage from Settings — add, edit, delete; deleting a category removes its budget too

**Cloud Backup**
- Automatic Google Drive backup — daily, weekly, or monthly
- Uses the same JSON format as manual export
- Single file in a dedicated Drive folder, overwritten each backup
- OS notifications when backup starts and completes
- Connect/disconnect from Settings with one tap

**Recurring Transactions**
- Define repeating income or expenses — subscriptions, rent, salary, bills
- Frequencies: daily, weekly, monthly, yearly
- Transactions are auto-generated on app open for any missed due dates
- Set an optional end date; entries gray out when expired
- Manage from Settings — add, edit, delete with optional cleanup of past transactions
- Auto-generated transactions appear in the transaction list with a recurring indicator

**Settings**
- Currency picker (50+ currencies) — sets the default for new accounts and budgets
- Theme — 4 presets: Dark Blue (default), White, OLED Black, Super Mario
- Accent color — 8 color presets
- Number format — US, European, French, Indian, or no-grouping
- Biometric lock — fingerprint/Face ID to protect the app
- Show P&L Stats toggle — enable/disable percentage change indicators on the Accounts tab
- Manage income and expense categories (add, edit, delete)
- Manage recurring transactions
- Manage budgets
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
