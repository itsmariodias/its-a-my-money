# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**It's a My Money!** — A cross-platform personal finance app for iOS and Android.
Built with Expo (managed workflow), TypeScript, expo-router, and SQLite for fully local, offline-first data storage.

## Rules

- **Never commit without explicit permission.** Do not run `git commit` unless the user explicitly asks to commit.
- **Always install Expo-compatible package versions.** Run `npx expo install --check` after adding any Expo-related dependency. The project uses Expo SDK 54 — packages from SDK 55+ will cause native build failures. Use `npx expo install <package>` instead of `pnpm add` for Expo packages to get the correct version automatically.
- **Keep backup/restore in sync with the schema.** Any new SQLite table, new column on an existing table, or new user-preference settings key must be added to the JSON backup round-trip. See the [Backup/Restore contract](#backuprestore-contract) for the exact files to touch and the checklist.

## Code Principles

### Deduplication and Reusability

**This is the most important principle in this codebase.** Before writing any new code, check if the same logic or UI already exists. If two or more components share the same behavior, extract it into a shared module.

- **Shared UI components** go in `shared/components/` (e.g., `DatePickerField`, `AccountIcon`, `PeriodSelector`).
- **Shared styles** go in `constants/sheetStyles.ts` — do not duplicate any style that already exists there.
- **Shared types** go in `types/index.ts`.
- **Shared store logic** goes in `shared/store/`.

When adding a feature, always ask: "Does another component already do something similar?" If yes, extract the common part first, then use it in both places. Three similar lines duplicated across files is a signal to extract, not to copy-paste.

### Keep Code Simple

- Prefer flat, readable code over clever abstractions.
- Inline styles only for dynamic values (accentColor, isDark). Static styles go in `StyleSheet.create`.
- Avoid deeply nested ternaries — extract into small helper components or early returns.
- Name things clearly. If a function name needs a comment to explain it, rename the function.

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
pnpm typecheck
```

## Testing

### Stack
- **Jest** with `ts-jest` preset — configured in `jest.config.js`
- Tests are **co-located** with their source files, named `*.test.ts` (e.g., `features/accounts/useAccountsStore.test.ts`)
- Mock for `expo-sqlite` in `__mocks__/expo-sqlite.ts` (auto-discovered by Jest)

### Strategy
- **BDD / Given-When-Then**: Every test follows scenario-based structure. Each `it()` block reads like a user story.
- **Pure logic first**: Test utility functions (`formatAmount`, `getColors`, `isValidExport`) and Zustand store reducers directly — these are the easiest to test and the most valuable to protect.
- **DB hooks via mock**: Verify that the correct SQL statements and parameters are sent to SQLite, without running a real database. The mock in `__mocks__/expo-sqlite.ts` captures all calls.
- **No component rendering tests**: We test logic and data, not UI. No React test renderer, no `@testing-library/react-native`.

### Why This Strategy
The app is local-first with all business logic in pure functions and Zustand stores. Testing at this layer catches real bugs (wrong SQL, incorrect state transitions, formatting errors) without the brittleness of UI snapshot tests. If a store function computes the wrong balance or a DB hook sends the wrong query, these tests catch it.

### Adding Tests
1. Create `feature-name.test.ts` **next to the source file** it tests (co-located, not in a separate `__tests__/` directory)
2. Use `describe` for features, `it` for scenarios with Given/When/Then comments
3. For DB hook tests, import mock and clear between tests with `jest.clearAllMocks()`
4. Reset Zustand stores in `beforeEach` with `store.setState(initialState)`

### Test File Locations
```
constants/currencies.test.ts          # formatAmount, getCurrencySymbol
constants/theme.test.ts               # getColors, ACCENT_COLORS
db/index.test.ts                      # DB hook SQL verification
features/accounts/useAccountsStore.test.ts
features/accounts/balanceUtils.test.ts
features/transactions/useTransactionsStore.test.ts
features/transfers/useTransfersStore.test.ts
features/recurring/dateUtils.test.ts
features/recurring/useRecurringStore.test.ts
features/settings/useSettingsStore.test.ts
features/settings/validation.test.ts
features/settings/exportData.test.ts
features/backup/googleDrive.test.ts
features/backup/useBackupStore.test.ts
shared/store/useUIStore.test.ts
```

## Architecture

### Tech Stack
- **Expo SDK 54** (managed workflow) + **expo-router** (file-based routing)
- **expo-sqlite** — local SQLite database, all data on-device
- **expo-notifications** — local notifications for backup status
- **expo-local-authentication** — biometric lock (fingerprint/Face ID)
- **@react-native-google-signin/google-signin** — Google OAuth for Drive backup
- **react-native-calendars** — cross-platform date picker (shared `DatePickerField` component)
- **react-native-gifted-charts** — charts on the dashboard
- **Zustand** — global state management
- **pnpm** — package manager
- **TypeScript** throughout

### Directory Structure
```
app/                                  # expo-router screens (file-based routing)
  (tabs)/                             # Bottom tab navigator
    _layout.tsx                       # Tab layout — FAB, sheets, tab swipe, header, account filter
    index.tsx                         # Dashboard screen
    transactions.tsx                  # Transactions list screen — date-grouped list, category filter chips, group-by-category view
    accounts.tsx                      # Accounts list screen
  _layout.tsx                         # Root layout — SQLiteProvider, migrations, auto backup, recurring check, biometric lock

features/                             # Feature modules (screens + logic co-located)
  accounts/
    AccountFormSheet.tsx              # Create/edit account bottom sheet (Cash vs Investment toggle, current market value field)
    balanceUtils.ts                   # accountFlowAsOf, accountBalanceAsOf, computePnL, aggregatePortfolio
    balanceUtils.test.ts
    useAccountsStore.ts              # Zustand store
    useAccountsStore.test.ts
  transactions/
    AddTransactionSheet.tsx           # Create/edit transaction bottom sheet
    CategoryFormSheet.tsx             # Create/edit category bottom sheet
    useTransactionsStore.ts
    useTransactionsStore.test.ts
  transfers/
    TransferSheet.tsx                 # Create/edit transfer bottom sheet
    useTransfersStore.ts
    useTransfersStore.test.ts
  recurring/
    RecurringListScreen.tsx           # Full-screen modal listing recurring entries (opened from Settings)
    RecurringFormSheet.tsx            # Create/edit recurring transaction bottom sheet
    useRecurringStore.ts              # Zustand store
    useRecurringStore.test.ts
    useRecurringCheck.ts              # AppState-based auto-generation trigger (mirrors useAutoBackup pattern)
    dateUtils.ts                      # advanceDate() — date math for recurring schedules with month-end clamping
    dateUtils.test.ts
  budgets/
    BudgetsListScreen.tsx             # Full-screen modal listing budgets (opened from Settings)
    BudgetFormSheet.tsx               # Create/edit budget bottom sheet (amount, period, expense-category)
    BudgetsDashboardCard.tsx          # Dashboard widget with per-budget color-coded progress bars
    useBudgetsStore.ts                # Zustand store
    useBudgetsStore.test.ts
    periodUtils.ts                    # currentPeriodRange (ISO Mon–Sun week, month, year), spentInRange, periodLabel
    periodUtils.test.ts
    budgetCrossings.ts                # findCrossings() — pure detector for budgets crossing the limit
    budgetCrossings.test.ts
    budgetAlerts.ts                   # expo-notifications wrapper that fires "Budget exceeded" alerts
  settings/
    SettingsScreen.tsx                # Settings overlay
    useSettingsStore.ts
    useSettingsStore.test.ts
    validation.ts                     # Export validation helpers
    validation.test.ts
    exportData.ts                     # Reusable JSON export generator (used by manual export + Drive backup)
    exportData.test.ts
    monefy/                           # Monefy backup CSV parser (stub)
  backup/
    googleDrive.ts                    # Google Drive API service (sign-in, upload, folder management)
    googleDrive.test.ts
    useBackupStore.ts                 # Zustand store for backup state
    useBackupStore.test.ts
    useAutoBackup.ts                  # AppState-based auto backup trigger
    notifications.ts                  # expo-notifications wrapper for backup alerts
    GoogleDriveSection.tsx            # Cloud Backup settings UI

shared/                               # Cross-feature reusable code
  components/
    DatePickerField.tsx               # Calendar date picker popup (used by transaction + transfer sheets)
    AccountIcon.tsx                   # Account icon renderer
    PeriodSelector.tsx                # Month/year period navigation
    CurrencyPicker.tsx                # Full-screen searchable currency picker (used by Settings, AccountFormSheet, BudgetFormSheet)
    Themed.tsx                        # Theme-aware Text/View wrappers
  store/
    useUIStore.ts                     # UI state (open sheets, selected account filter)
    useUIStore.test.ts

constants/
  currencies.ts                       # formatAmount(), NUMBER_FORMATS, getCurrencySymbol()
  currencies.test.ts
  theme.ts                            # getColors(), ACCENT_COLORS, sheetErrorText
  theme.test.ts
  sheetStyles.ts                      # Shared bottom sheet + date picker styles
  google.ts                           # Google OAuth client IDs (read from Expo constants)

db/
  index.ts                            # Query helper hooks (useAccountsDb, useTransactionsDb, etc.)
  index.test.ts
  migrations.ts                       # Migration runner
  migrations/                         # Versioned migration files (001_initial.ts, ...)

types/
  index.ts                            # All shared TypeScript interfaces

__mocks__/
  expo-sqlite.ts                      # Jest mock for expo-sqlite

app.config.ts                         # Dynamic Expo config (env vars for credentials, version from git tags)
.env.local                            # Local env vars (gitignored) — Google client IDs, EAS project ID
.env.example                          # Template for .env.local
eas.json                              # EAS Build profiles (development + production)

.github/
  workflows/
    ci.yml                            # Lint + type-check on push/PR
    build-android.yml                 # Signed APK build on tag push (v*)
```

### Data Layer
The app is **local-first with no backend**. All data lives in SQLite via `expo-sqlite`.

Core entities:
- `accounts` — wallets. `account_type` is `'cash'` or `'investment'`. Investment accounts additionally have a `current_value` (user-entered market value) used for P&L
- `categories` — income and expense categories with icons/colors
- `transactions` — individual income/expense entries linked to an account and category
- `transfers` — money movements between accounts (full CRUD via `TransferSheet`)
- `recurring_transactions` — repeating transaction templates; auto-generate real transactions on app open via `useRecurringCheck`
- `budgets` — per-category spending limits with weekly/monthly/yearly periods (full CRUD via `BudgetFormSheet`)
- `transfers.from_account_id` and `to_account_id` are nullable with `ON DELETE SET NULL` (migration 010) so deleting an account preserves transfer history; the deleted side renders as "Unknown"

`SQLiteProvider` wraps the app in `app/_layout.tsx` and calls `runMigrations` on init (via `useSuspense`).
All DB access goes through the hook-based helpers in `db/index.ts` — never raw SQL in components.
New migrations go in `db/migrations/` as `NNN_description.ts` exporting an `up(db)` function, then registered in `db/migrations.ts`.

### Navigation
expo-router with a bottom tab layout (`app/(tabs)/`). Tabs support horizontal swipe via a `PanResponder` in `_layout.tsx`. Modals and detail screens are stacked above the tab navigator.

### FAB (Floating Action Button)
A single expandable speed-dial FAB lives in `app/(tabs)/_layout.tsx`. Tapping it expands to two labeled options: **Transaction** and **Transfer**. Tapping either opens the corresponding sheet and collapses the menu. A dimmed backdrop closes the menu on tap. The FAB icon rotates 45 degrees when expanded. Hidden when the settings overlay is open.

### Bottom Sheets
All sheets (`AddTransactionSheet`, `TransferSheet`, `AccountFormSheet`, `CategoryFormSheet`) share the same animation pattern:
- Slide in via `Animated.spring` on `sheetTranslateY`; backdrop (`absoluteFill`, `rgba(0,0,0,0.4)`) snaps to full opacity instantly on open
- Slide out via `Animated.timing`; backdrop fades out after the sheet has fully exited
- Drag handle with `PanResponder` — swipe down to dismiss (dy > 120 or vy > 0.3)
- `ScrollView` uses `automaticallyAdjustKeyboardInsets` for keyboard avoidance (no `KeyboardAvoidingView`)
- Outer container is a plain `View` with `justifyContent: 'flex-end'` — the sheet never moves when the keyboard opens
- "Save & Add Another" resets only `amount` and `note`, preserving other fields

### Shared Components

Components used by multiple features live in `shared/components/`. If you find yourself copying UI logic between two sheets or screens, stop and extract it into a shared component.

Current shared components:
- **`DatePickerField`** — calendar date picker rendered as a modal popup. Includes month navigation, a year picker grid (years from 1977), and full theme support. Used by both `AddTransactionSheet` and `TransferSheet`. Accepts `date` (YYYY-MM-DD string) and `onChange` callback.
- **`AccountIcon`** — renders account icons consistently across all screens.
- **`PeriodSelector`** — month/year navigation used on Dashboard and Transactions.
- **`CurrencyPicker`** — full-screen searchable currency picker modal. Used by `SettingsScreen`, `AccountFormSheet`, and `BudgetFormSheet`. Accepts `{ visible, selectedCode, onSelect, onClose }`.
- **`Themed`** — theme-aware `Text` and `View` wrappers.

### State Management
Zustand stores hold in-memory app state derived from the DB. DB writes always happen first, then stores are updated. Stores are not persisted — they are populated from SQLite on startup.

### Settings
User preferences are persisted in SQLite (`settings` table, key-value) and synced to `useSettingsStore` on app load and on settings screen focus.

- **Currency** — ISO code (e.g. `USD`). The global setting is the default for new accounts and budgets; actual money is displayed in each account's own currency. `formatAmount()` in `constants/currencies.ts` handles symbol + formatting.
- **Accent color** — hex string stored as `accent_color`. All screens read it from the store; never hardcode `#2f95dc`.
- **Number format** — locale string (`en-US`, `de-DE`, `fr-FR`, `en-IN`, `plain`). Pass as 4th arg to `formatAmount()`.
- **Biometric lock** — boolean. When enabled, locks the app after 3+ seconds in background. Uses `expo-local-authentication`. The 3-second threshold prevents lock during brief external activities (Google Sign-In, share sheets).
- **Show P&L Stats** — boolean (`show_pct_change`). When enabled, shows percentage change vs. previous period on each account card and the total balance card in the Accounts tab. Defaults to `true`.
- **Cloud Backup** — Google Drive backup settings (see below).
- **Budgets** — per-category spending limits (see below).

### Investment Accounts
Accounts carry an `account_type` column (`'cash' | 'investment'`). Investment accounts also have a nullable `current_value` — the user-entered market value. Everything else (transfers, transactions, delete flow, migration) is shared with cash accounts.

- **Invested amount** — derived by `accountFlowAsOf` in `features/accounts/balanceUtils.ts`: initial balance + net transactions + net transfers. Date-filter aware
- **Market value** — `current_value` on the account. Used by `accountBalanceAsOf` as the account's "worth" on current/future periods; falls back to flow on past periods (no historical valuations are stored)
- **P&L** — `computePnL` returns `{ invested, current, pnl, pnlPct }`. `aggregatePortfolio` sums across all investment accounts. Both accept the same date-range filter
- **Auto-adjust** — when money flows into or out of an investment account (transfer in/out, income/expense), `db/index.ts` atomically shifts `current_value` by the same delta so P&L reflects market drift only, not cashflow. Wrapped in `withTransactionAsync` in `useTransfersDb` and `useTransactionsDb`
- **Form UX** — `AccountFormSheet` shows a Cash/Investment toggle; investment mode reveals a "Current Market Value" field. Editing the invested amount on an existing investment account without touching the current value shifts current by the same delta (so only the market moves reflect P&L)
- **Accounts tab** — sectioned into Cash and Investments. Investment cards show current value as the primary amount and P&L vs invested as the stat line
- **Dashboard** — portfolio donut card: slices sized by invested amount per account; center shows total invested + aggregate P&L %; legend shows allocation % + per-account current value and P&L %. Hidden when zero investment accounts, or when a non-investment account filter is active. Past periods show invested-only

### Multi-currency
The app supports holding accounts in different currencies. It **never** invents an FX rate — there is no conversion to a base currency anywhere. The user types every amount in the currency it belongs to.

- **Schema** — `accounts.currency` is the per-account ISO code (back-filled from the global setting in migration 011 for accounts created before multi-currency landed). `transfers.to_amount` (migration 012, nullable) holds the destination-side amount when from/to currencies differ; `NULL` means same-currency and `amount` applies on both sides. `budgets.currency` (migration 013) scopes a budget to one currency.
- **Display rule** — at the row level, each transaction/transfer/account is formatted in its own account's currency. At the aggregate level, the app shows **per-currency subtotals** rather than a blended number. `totalsByCurrency(accounts, balanceMap)` in `balanceUtils.ts` returns `Record<code, number>`.
- **Accounts tab total card** — swipeable horizontal carousel, one page per currency, primary (global) currency first. Dots inline in the header next to the currency code (no extra vertical space). Single-currency users see the regular card layout.
- **Transfers** — `accountFlowAsOf` debits the source with `amount` and credits the destination with `to_amount ?? amount`. `TransferSheet` shows an "Amount received (XXX)" field only when from/to currencies differ; `useTransfersDb` persists both, and the investment auto-adjust uses each side's own amount. `DeleteTransferModal` shows `100 USD → 92.50 EUR` for cross-currency.
- **Recurring transfers** — blocked at the form when the two accounts have different currencies (a recurring template carries a single amount; cross-currency would require inventing an FX rate every fire). `RecurringFormSheet` shows an inline error and disables save.
- **Dashboard** — when an account is selected, aggregates follow that account's currency. When nothing is selected, `scopedAccounts`/`scopedTransactions`/`scopedTransfers` filter to accounts of the **primary** (global) currency only. A small currency-code tag in the top-right of the balance card surfaces this scope when multiple currencies exist.
- **Where to read currency in row components** — pass an `accountCurrencyById: Record<number, string>` map down. Each row resolves its own side's currency. See `app/(tabs)/transactions.tsx` `TransferRow` for the canonical pattern (outgoing → `from_account_id` + `amount`; incoming → `to_account_id` + `to_amount ?? amount`).

### Budgets
Per-category spending limits with weekly, monthly, or yearly periods. Managed from Settings; tracked on the Dashboard.

- **Schema**: `budgets (id, category_id, amount, period, currency, created_at)` with `period ∈ 'weekly' | 'monthly' | 'yearly'`. Income categories are not budgetable (the form filters to `type='expense'`).
- **Period scope** — each budget tracks its own period independent of the Dashboard period filter. `currentPeriodRange()` in `features/budgets/periodUtils.ts`: weekly = ISO Monday–Sunday of current week, monthly = 1st–last of current month, yearly = Jan 1–Dec 31 of current year.
- **Currency scope** — `spentInRange(transactions, categoryId, start, end, { currency, accountCurrencyById })` only counts expenses on accounts of the budget's currency. Same category in two different currencies = two distinct budgets.
- **Uniqueness** — one budget per (category, currency) enforced UX-side: in the create form, picking a category that already has a budget *in the selected currency* switches the form into edit mode for that existing budget.
- **Cascade delete** — deleting a category in Settings also calls `useBudgetsDb().removeByCategory(id)`.
- **Dashboard card** (`BudgetsDashboardCard`) — hidden when no budgets exist; renders one row per budget with a progress bar. Tapping it opens `BudgetsListScreen`.
- **Color thresholds** — `< 80%` green `#4CAF50`, `80–99%` amber `#FFC107`, `≥ 100%` red `#F44336`.
- **Alerts** — when a manual transaction save in `AddTransactionSheet` pushes a budget from `<limit` to `≥limit` for the current period, `findCrossings()` in `budgetCrossings.ts` flags it and `notifyCrossedBudgets()` fires a local notification via `expo-notifications` (Android channel `'budgets'`). `findCrossings` receives `accountCurrencyById` so only budgets matching the transaction's account currency are evaluated. Permission is requested best-effort when the user first saves a budget. Recurring auto-generated transactions don't fire alerts.

### Cloud Backup (Google Drive)
Automatic backups to Google Drive using the same JSON format as manual export.

- **Auth**: `@react-native-google-signin/google-signin` with `drive.file` scope (only accesses files the app creates)
- **API**: Plain `fetch()` to Google Drive REST API v3 — no heavy SDK
- **Storage**: Single file (`its-a-my-money-backup.json`) in a dedicated folder (`It's a My Money! Backups`), overwritten each backup
- **Trigger**: `useAutoBackup` hook listens to `AppState` changes. When the app comes to foreground and the chosen interval (daily/weekly/monthly) has elapsed, it triggers a backup
- **Notifications**: `expo-notifications` shows local notifications for backup start/completion
- **State**: `useBackupStore` (Zustand) holds backup state; persisted in SQLite `settings` table as key-value pairs
- **UI**: `GoogleDriveSection` component in Settings — connect/disconnect, frequency picker, backup now, last backup time

Backup settings stored in SQLite: `google_drive_enabled`, `google_email`, `google_drive_folder_id`, `google_drive_folder_name`, `backup_frequency`, `last_backup_at`.

### Backup/Restore contract

Both manual JSON export/import and Google Drive backup share one code path. Whenever the schema or settings keys change, the round-trip must be updated in lockstep or restoring a backup will silently drop data (or reject the file).

**When you add a new SQLite table** (e.g., a future `goals` table):
1. **`features/settings/exportData.ts`** — add a `SELECT` for the table and a new field on `ExportJson`
2. **`db/index.ts`** — add the field to the `ExportData` interface (optional, for backwards compat with old backups) and a wipe + re-insert step in `useImportDb().importAll`, remapping any foreign keys (`category_id`, etc.) via the existing `categoryIdMap` / `recurringIdMap` pattern
3. **`features/settings/validation.ts`** — add an `isValid<Entity>` helper; treat the new array as optional in `isValidExport` so older backups still validate
4. **`features/settings/SettingsScreen.tsx` `doImport`** — reload the corresponding Zustand store after import, and clear it in `handleReset`
5. **Tests** — extend `features/settings/exportData.test.ts` and `validation.test.ts`

**When you add a new column to an existing table** — usually free if the table is exported via `SELECT *` (e.g., `accounts`), but explicit selects (`transactions`, `transfers`, budgets) need the new column in the SELECT, and the `INSERT` in `importAll` needs the matching column + bind parameter. Verify by exporting a row that uses the new column and round-tripping it.

**When you add a new user-preference settings key** (e.g., `date_format`):
1. **`features/settings/exportData.ts`** — read the key alongside the others, add to `ExportJson.settings`
2. **`db/index.ts`** — extend the `ExportData.settings` shape with the optional field
3. **`features/settings/SettingsScreen.tsx` `doImport`** — restore via `settingsDb.set(...)` + Zustand setter; also reset to default in `handleReset`
4. **`app/_layout.tsx`** — load the key on boot
5. **`features/settings/useSettingsStore.ts`** — add field + setter
6. **Tests** — update `exportData.test.ts` for the new key

**Settings keys that must NOT be exported** (device-specific): `google_drive_enabled`, `google_email`, `google_drive_folder_id`, `google_drive_folder_name`, `backup_frequency`, `last_backup_at`, `last_recurring_check`, `export_directory_uri`. Restoring these onto a different device would break OAuth state and timing.

**Schema version** stays at `1` — additions are made via optional fields so older backups still validate. Only bump the version on breaking changes.

### Environment Variables
Google OAuth credentials and EAS config are injected via environment variables, not hardcoded.

- **`.env.local`** — local env file (gitignored), see `.env.example` for template
- **`app.config.ts`** — dynamic Expo config reads env vars and exposes them via `extra`
- **`constants/google.ts`** — reads credentials from `expo-constants` at runtime

Required env vars:
- `GOOGLE_WEB_CLIENT_ID` — Google OAuth web client ID
- `GOOGLE_IOS_CLIENT_ID` — Google OAuth iOS client ID
- `GOOGLE_IOS_URL_SCHEME` — reversed iOS client ID for OAuth redirect
- `GOOGLE_ANDROID_CLIENT_ID` — Google OAuth Android client ID (for SHA-1 certificate matching)
- `EAS_PROJECT_ID` — EAS Build project ID (optional for local dev)
- `APP_VERSION` — set automatically in CI from git tag (defaults to `0.0.1`)

### Theming
`getColors(isDark)` in `constants/theme.ts` returns the full color set for light/dark mode. The tab bar, headers, and all screens share the same `bg` color — no separate header background.

Dynamic values (accentColor, etc.) cannot go in `StyleSheet.create` — use inline style overrides: `[styles.foo, { color: accentColor }]`.

### Shared Sheet Styles
All bottom sheet components share a common style library in `constants/sheetStyles.ts`. It exports `sheetStyles` — a `StyleSheet.create` object covering modal structure, labels, amount input, type toggle, account picker, date picker modal + year picker, text inputs, color/icon pickers, and action buttons.

Usage pattern in every sheet:
```tsx
import { sheetStyles } from '@/constants/sheetStyles';
// Only define sheet-specific overrides locally:
const localStyles = StyleSheet.create({ ... });
const styles = { ...sheetStyles, ...localStyles };
```

Do not duplicate any style already in `sheetStyles` — add it there instead. `constants/theme.ts` also exports `sheetErrorText` (used inside `sheetStyles` as `errorText`).

### Header
The shared header lives in `app/(tabs)/_layout.tsx` (not in individual screens). It contains:
- Screen title (left)
- **Account filter dropdown** — filters Dashboard and Transactions by account. Hidden on Accounts tab. State lives in `useUIStore` (`selectedAccountId`). Dropdown positioned at `insets.top + HEADER_HEIGHT` to avoid safe area overlap.
- Settings gear (right) — opens the settings overlay

### Gestures
- **Tab swipe**: `PanResponder` in `app/(tabs)/_layout.tsx`. Activates on clearly horizontal gestures (|dx|/|dy| > 2.5, dx > 30).
- **Sheet swipe-down**: `PanResponder` on the drag handle in each sheet. Downward drag (dy > 120 or vy > 0.3) dismisses the sheet.

### Delete UX
Swipe-to-delete on rows is **not used** — it conflicted with horizontal tab swipe. Deletion happens from inside the corresponding form sheet (transaction, transfer, account, budget, recurring), using the shared `DeleteModal` in `shared/components/DeleteModal.tsx`. Category deletion in `SettingsScreen` cascades to recurring entries, transactions, and budgets via the matching `removeByCategory` helpers in `db/index.ts`.

### Transaction Filters (transactions.tsx)
All filter state is local to `TransactionsScreen` — nothing in UIStore.

- **`CategoryFilterBar`** — horizontal `ScrollView` of chips derived from the currently visible transactions. A **Transfers** chip is appended when an account is selected and transfers exist in the period. Multi-select; "All" resets. Includes a list/grouped view toggle (two icon buttons).
- **`CategoryGroupRow`** — collapsible row showing category icon, name, count, and net total. Expanded view renders individual transaction or transfer rows. Transfers use `category_id: -1` as a sentinel.
- Filter chain: `filteredTx` (period + account) → `categoryFilteredTx` (chip selection) → `mergedItems` / `categoryGroups`.
- Transfers are hidden in filtered list view and grouped view when a category filter is active and the Transfers chip is not selected.

## CI/CD

### CI (`ci.yml`)
Runs on every push to `main` and on all PRs. Runs `pnpm lint` and `pnpm typecheck`.

### Android APK build (`build-android.yml`)
Triggers on tag push (`v*`). Uses `expo prebuild --platform android --clean` + Gradle (no EAS account needed). Caches pnpm store and Gradle. Signs with keystore stored as GitHub secrets:
- `KEYSTORE_BASE64` — base64-encoded `.keystore` file
- `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
- `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_IOS_URL_SCHEME`, `GOOGLE_ANDROID_CLIENT_ID` — Google OAuth credentials
- `EAS_PROJECT_ID` — EAS project identifier

`APP_VERSION` is set automatically from the tag (e.g., `v1.2.0` → `1.2.0`).

Output APK is named `its-a-my-money-{tag}.apk` and attached to a GitHub release.

The workflow job requires `permissions: contents: write` to create releases.

**Release flow:**
1. (Optional) Create a **draft** release on GitHub with the tag name and changelog
2. Push the tag: `git tag v1.x.x && git push origin v1.x.x`
3. Workflow builds the APK and creates/updates the release with the APK attached
4. If a draft release exists for the tag, the APK is uploaded to it — then publish when ready

### EAS Build
Used for development builds (replacing Expo Go, which cannot handle native modules like Google Sign-In). Configured in `eas.json` with `development` and `production` profiles. `expo-dev-client` is a dev dependency only.

## Monefy Migration

The Monefy backup format is a password-protected ZIP containing a CSV. Parser stub lives in `features/settings/monefy/`.
