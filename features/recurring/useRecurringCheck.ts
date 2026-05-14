import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useSettingsDb } from '@/db';
import { advanceDate, todayString } from './dateUtils';
import type { RecurringFrequency, RecurringKind } from '@/types';

export function useRecurringCheck() {
  const db = useSQLiteContext();
  const settingsDb = useSettingsDb();
  const isRunningRef = useRef(false);

  useEffect(() => {
    // Also run once on mount (handles the initial app open, not just resume)
    runCheck();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      runCheck();
    });

    return () => subscription.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runCheck() {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      const today = todayString();

      // Skip if already checked today
      const lastCheck = await settingsDb.get('last_recurring_check');
      if (lastCheck?.value === today) return;

      await db.withTransactionAsync(async () => {
        const due = await db.getAllAsync<{
          id: number;
          amount: number;
          kind: RecurringKind;
          type: 'income' | 'expense' | null;
          category_id: number | null;
          account_id: number;
          to_account_id: number | null;
          note: string | null;
          frequency: RecurringFrequency;
          end_date: string | null;
          next_due_date: string;
        }>(
          `SELECT id, amount, kind, type, category_id, account_id, to_account_id, note, frequency, end_date, next_due_date
           FROM recurring_transactions
           WHERE is_active = 1 AND next_due_date <= ?`,
          today
        );

        for (const rec of due) {
          let dueDate = rec.next_due_date;

          // Generate one entry per missed due date up to today
          while (dueDate <= today) {
            if (rec.kind === 'transfer') {
              await db.runAsync(
                'INSERT INTO transfers (from_account_id, to_account_id, amount, note, date, recurring_transaction_id) VALUES (?, ?, ?, ?, ?, ?)',
                rec.account_id, rec.to_account_id!, rec.amount, rec.note ?? null, dueDate, rec.id
              );
              // Mirror useTransfersDb.insert: shift current_value on investment accounts
              await db.runAsync(
                "UPDATE accounts SET current_value = current_value + ? WHERE id=? AND account_type='investment' AND current_value IS NOT NULL",
                -rec.amount, rec.account_id
              );
              await db.runAsync(
                "UPDATE accounts SET current_value = current_value + ? WHERE id=? AND account_type='investment' AND current_value IS NOT NULL",
                rec.amount, rec.to_account_id!
              );
            } else {
              await db.runAsync(
                'INSERT INTO transactions (amount, type, category_id, account_id, note, date, recurring_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                rec.amount, rec.type!, rec.category_id!, rec.account_id, rec.note ?? null, dueDate, rec.id
              );
              // Mirror useTransactionsDb.insert: shift current_value on investment accounts
              await db.runAsync(
                "UPDATE accounts SET current_value = current_value + ? WHERE id=? AND account_type='investment' AND current_value IS NOT NULL",
                rec.type === 'income' ? rec.amount : -rec.amount, rec.account_id
              );
            }
            dueDate = advanceDate(dueDate, rec.frequency);
          }

          // dueDate is now past today — check if it exceeds end_date
          const isActive = rec.end_date == null || dueDate <= rec.end_date ? 1 : 0;
          await db.runAsync(
            'UPDATE recurring_transactions SET next_due_date=?, is_active=? WHERE id=?',
            dueDate, isActive, rec.id
          );
        }
      });

      await settingsDb.set('last_recurring_check', today);
    } catch {
      // Silently fail — will retry next app open
    } finally {
      isRunningRef.current = false;
    }
  }
}
