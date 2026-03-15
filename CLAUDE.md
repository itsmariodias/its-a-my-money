# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**It's a My Money!** — A cross-platform personal finance app for iOS and Android.
Built with Expo (managed workflow), TypeScript, expo-router, and SQLite for fully local, offline-first data storage.

## Commands

```bash
# Install dependencies
pnpm install

# Start Expo dev server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator/device
pnpm android

# Run tests
pnpm test

# Run a single test file
pnpm test -- path/to/file.test.ts

# Lint
pnpm lint

# Type-check
pnpm tsc --noEmit

# Build for production (via EAS)
eas build --platform all
```

## Architecture

### Tech Stack
- **Expo** (managed workflow) + **expo-router** (file-based routing)
- **expo-sqlite** — local SQLite database, all data on-device, no backend
- **Zustand** — global state management
- **pnpm** — package manager
- **TypeScript** throughout

### Directory Structure
```
app/                     # expo-router screens (file-based routing)
  (tabs)/                # Bottom tab navigator (Dashboard, Transactions, Accounts, Settings)
  _layout.tsx            # Root layout — wraps app in SQLiteProvider, runs migrations
components/              # Reusable UI components
db/
  index.ts               # Query helper hooks (useAccountsDb, useTransactionsDb, etc.)
  migrations.ts          # Migration runner — reads from db/migrations/
  migrations/            # Versioned migration files (001_initial.ts, ...)
store/
  useAccountsStore.ts    # Zustand store for accounts
  useTransactionsStore.ts
types/
  index.ts               # All shared TypeScript interfaces (Account, Transaction, etc.)
utils/
  monefy/                # Monefy backup CSV parser
constants/               # Colors, theme
assets/                  # Images and fonts
```

### Data Layer
The app is **local-first with no backend**. All data lives in SQLite via `expo-sqlite`.

Core entities:
- `accounts` — wallets (e.g., Cash, Bank, Credit Card)
- `categories` — income and expense categories with icons/colors
- `transactions` — individual income/expense entries linked to an account and category
- `transfers` — money movements between accounts
- `budgets` — optional monthly budget limits per category

`SQLiteProvider` wraps the app in `app/_layout.tsx` and calls `runMigrations` on init (via `useSuspense`).
All DB access goes through the hook-based helpers in `db/index.ts` — never raw SQL in components.
New migrations go in `db/migrations/` as `NNN_description.ts` exporting an `up(db)` function, then registered in `db/migrations.ts`.

### Navigation
expo-router with a bottom tab layout (`app/(tabs)/`). Modals and detail screens are stacked above the tab navigator.

### State Management
Zustand stores hold in-memory app state derived from the DB. DB writes always happen first, then stores are updated. Stores are not persisted — they are populated from SQLite on startup.

## Monefy Migration

`monefy_backup_2026_03_15_16_59_05` in the project root is a real Monefy backup file used as a reference for building the import feature. The Monefy backup format is a password-protected ZIP containing a CSV. Parser lives in `utils/monefy/`.
