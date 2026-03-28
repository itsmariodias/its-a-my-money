# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**It's a My Money!** — A cross-platform personal finance app for iOS and Android.
Built with Expo (managed workflow), TypeScript, expo-router, and SQLite for fully local, offline-first data storage.

## Rules

- **Never commit without explicit permission.** Do not run `git commit` unless the user explicitly asks to commit.
- **Always install Expo-compatible package versions.** Run `npx expo install --check` after adding any Expo-related dependency. The project uses Expo SDK 54 — packages from SDK 55+ will cause native build failures. Use `npx expo install <package>` instead of `pnpm add` for Expo packages to get the correct version automatically.

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
features/transactions/useTransactionsStore.test.ts
features/transfers/useTransfersStore.test.ts
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
    transactions.tsx                  # Transactions list screen
    accounts.tsx                      # Accounts list screen
  _layout.tsx                         # Root layout — SQLiteProvider, migrations, auto backup, biometric lock

features/                             # Feature modules (screens + logic co-located)
  accounts/
    AccountFormSheet.tsx              # Create/edit account bottom sheet
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
- `accounts` — wallets (e.g., Cash, Bank, Credit Card)
- `categories` — income and expense categories with icons/colors
- `transactions` — individual income/expense entries linked to an account and category
- `transfers` — money movements between accounts (full CRUD via `TransferSheet`)
- `budgets` — optional monthly budget limits per category (schema exists, UI not yet built)

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
- **`Themed`** — theme-aware `Text` and `View` wrappers.

### State Management
Zustand stores hold in-memory app state derived from the DB. DB writes always happen first, then stores are updated. Stores are not persisted — they are populated from SQLite on startup.

### Settings
User preferences are persisted in SQLite (`settings` table, key-value) and synced to `useSettingsStore` on app load and on settings screen focus.

- **Currency** — ISO code (e.g. `USD`). `formatAmount()` in `constants/currencies.ts` handles symbol + formatting.
- **Accent color** — hex string stored as `accent_color`. All screens read it from the store; never hardcode `#2f95dc`.
- **Number format** — locale string (`en-US`, `de-DE`, `fr-FR`, `en-IN`, `plain`). Pass as 4th arg to `formatAmount()`.
- **Biometric lock** — boolean. When enabled, locks the app after 3+ seconds in background. Uses `expo-local-authentication`. The 3-second threshold prevents lock during brief external activities (Google Sign-In, share sheets).
- **Cloud Backup** — Google Drive backup settings (see below).

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
- **Tab swipe**: `PanResponder` in `app/(tabs)/_layout.tsx`. Activates on clearly horizontal gestures (|dx|/|dy| > 2.5, dx > 30). Children (swipeable cards) claim their gestures first so there's no conflict.
- **Sheet swipe-down**: `PanResponder` on the drag handle in each sheet. Downward drag (dy > 120 or vy > 0.3) dismisses the sheet.

### Swipeable Cards
Both `transactions.tsx` and `accounts.tsx` have inline `SwipeableTransactionRow` / `SwipeableAccountCard` components using pure RN `Animated` + `PanResponder`. No extra packages needed. Delete zone reveals at `REVEAL_WIDTH = 80` on swipe-left.

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
