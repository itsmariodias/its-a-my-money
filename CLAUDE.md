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
  (tabs)/_layout.tsx     # Tab layout — FAB, AddTransactionSheet, tab swipe gesture
  _layout.tsx            # Root layout — wraps app in SQLiteProvider, runs migrations
components/              # Reusable UI components
  AddTransactionSheet.tsx
  AccountFormSheet.tsx
  CategoryFormSheet.tsx
  PeriodSelector.tsx
db/
  index.ts               # Query helper hooks (useAccountsDb, useTransactionsDb, etc.)
  migrations.ts          # Migration runner — reads from db/migrations/
  migrations/            # Versioned migration files (001_initial.ts, ...)
store/
  useAccountsStore.ts    # Zustand store for accounts
  useTransactionsStore.ts
  useSettingsStore.ts    # currency, accentColor, numberFormat
  useUIStore.ts          # isAddTxOpen, openAddTx, closeAddTx
types/
  index.ts               # All shared TypeScript interfaces (Account, Transaction, etc.)
utils/
  monefy/                # Monefy backup CSV parser (stub)
constants/
  currencies.ts          # formatAmount(), NUMBER_FORMATS, getCurrencySymbol()
  theme.ts               # getColors(), ACCENT_COLORS
assets/                  # Images and fonts
.github/
  workflows/
    ci.yml               # Lint + type-check on push/PR
    build-android.yml    # Signed APK build on GitHub release publish
```

### Data Layer
The app is **local-first with no backend**. All data lives in SQLite via `expo-sqlite`.

Core entities:
- `accounts` — wallets (e.g., Cash, Bank, Credit Card)
- `categories` — income and expense categories with icons/colors
- `transactions` — individual income/expense entries linked to an account and category
- `transfers` — money movements between accounts (schema exists, UI not yet built)
- `budgets` — optional monthly budget limits per category (schema exists, UI not yet built)

`SQLiteProvider` wraps the app in `app/_layout.tsx` and calls `runMigrations` on init (via `useSuspense`).
All DB access goes through the hook-based helpers in `db/index.ts` — never raw SQL in components.
New migrations go in `db/migrations/` as `NNN_description.ts` exporting an `up(db)` function, then registered in `db/migrations.ts`.

### Navigation
expo-router with a bottom tab layout (`app/(tabs)/`). Tabs support horizontal swipe via a `PanResponder` in `_layout.tsx`. Modals and detail screens are stacked above the tab navigator.

### State Management
Zustand stores hold in-memory app state derived from the DB. DB writes always happen first, then stores are updated. Stores are not persisted — they are populated from SQLite on startup.

### Settings
User preferences are persisted in SQLite (`settings` table, key-value) and synced to `useSettingsStore` on app load and on settings screen focus.

- **Currency** — ISO code (e.g. `USD`). `formatAmount()` in `constants/currencies.ts` handles symbol + formatting.
- **Accent color** — hex string stored as `accent_color`. All screens read it from the store; never hardcode `#2f95dc`.
- **Number format** — locale string (`en-US`, `de-DE`, `fr-FR`, `en-IN`, `plain`). Pass as 4th arg to `formatAmount()`.

### Theming
`getColors(isDark)` in `constants/theme.ts` returns the full color set for light/dark mode. The tab bar, headers, and all screens share the same `bg` color — no separate header background.

Dynamic values (accentColor, etc.) cannot go in `StyleSheet.create` — use inline style overrides: `[styles.foo, { color: accentColor }]`.

### Gestures
- **Tab swipe**: `PanResponder` in `app/(tabs)/_layout.tsx`. Activates on clearly horizontal gestures (|dx|/|dy| > 2.5, dx > 30). Children (swipeable cards) claim their gestures first so there's no conflict.
- **Sheet swipe-down**: `PanResponder` on the drag handle in `AddTransactionSheet`. Downward drag (dy > 100 or vy > 0.5) animates the sheet out and calls `onClose`.

### Swipeable Cards
Both `transactions.tsx` and `accounts.tsx` have inline `SwipeableTransactionRow` / `SwipeableAccountCard` components using pure RN `Animated` + `PanResponder`. No extra packages needed. Delete zone reveals at `REVEAL_WIDTH = 80` on swipe-left.

## CI/CD

### CI (`ci.yml`)
Runs on every push to `main` and on all PRs. Runs `pnpm lint` and `pnpm tsc`.

### Android APK build (`build-android.yml`)
Triggers on GitHub Release published. Uses `expo prebuild --platform android --clean` + Gradle (no EAS account needed). Caches pnpm store and Gradle. Signs with keystore stored as GitHub secrets:
- `KEYSTORE_BASE64` — base64-encoded `.keystore` file
- `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`

Output APK is named `its-a-my-money-{tag}.apk` and uploaded as a release asset.

The workflow job requires `permissions: contents: write` to upload to releases.

## Monefy Migration

The Monefy backup format is a password-protected ZIP containing a CSV. Parser stub lives in `utils/monefy/`.
