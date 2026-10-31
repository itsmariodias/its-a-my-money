import { useCallback } from 'react';
import { useGoalsDb } from '@/db';
import { useGoalsStore } from './useGoalsStore';

/**
 * Re-reads goals after anything that can change what they hold. `saved` is summed in SQL, so
 * deleting transactions with goal splits — or an account with goals — needs a reload to show.
 */
export function useReloadGoals(): () => Promise<void> {
  const goalsDb = useGoalsDb();
  const setGoals = useGoalsStore((s) => s.setGoals);
  return useCallback(async () => {
    setGoals(await goalsDb.getAll());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setGoals]);
}
