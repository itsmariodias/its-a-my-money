# It's a My Money! 💰

A personal finance app for iOS and Android built with Expo. Track your income, expenses, transfers, and account balances — fully offline, no accounts, no cloud, no nonsense.

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

**Settings**
- Currency picker (50+ currencies)
- Accent color — 8 color presets to theme the whole app
- Number format — US, European, French, Indian, or no-grouping
- Manage income and expense categories (add, edit, delete)
- Export all data as JSON
- Full data reset

---

## Tech stack

- [Expo](https://expo.dev) (managed workflow)
- [expo-router](https://expo.github.io/router) — file-based navigation
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) — local SQLite database, all data on-device
- [Zustand](https://zustand-demo.pmnd.rs) — global state management
- TypeScript throughout

All data is stored locally on your device. There is no backend, no sync, no login.

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

---

## About

Built by [@itsmariodias](https://github.com/itsmariodias) as a personal project.

This app is 100% vibe coded — designed and built entirely through back-and-forth conversation with **Claude Code** by Anthropic, without writing a single line of code manually. Claude handled the architecture, components, database schema, state management, UI, and everything in between.
