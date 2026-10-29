import type { Account, GoalWithDetails } from '@/types';
import { findOverspentAccounts, findReachedGoals, type BalanceSnapshot } from './goalCrossings';

const goal = (overrides: Partial<GoalWithDetails> = {}): GoalWithDetails => ({
  id: 1,
  name: 'Japan trip',
  icon: 'flight',
  color: '#2196F3',
  account_id: 1,
  target_amount: 1000,
  target_date: null,
  archived_at: null,
  created_at: '2026-01-01',
  account_name: 'Savings',
  account_currency: 'USD',
  saved: 0,
  ...overrides,
});

describe('findReachedGoals', () => {
  it('flags a goal a save pushed to its target', () => {
    // Given a goal at 900 that a save took to 1,000
    const prev = [goal({ saved: 900 })];
    const curr = [goal({ saved: 1000 })];

    // When looking for reached goals
    // Then it is flagged
    expect(findReachedGoals(prev, curr).map((g) => g.id)).toEqual([1]);
  });

  it('stays quiet once a goal is already reached', () => {
    // Given a goal already over its target that receives more
    const prev = [goal({ saved: 1000 })];
    const curr = [goal({ saved: 1200 })];

    // When looking for reached goals
    // Then nothing fires again — the edge is strict
    expect(findReachedGoals(prev, curr)).toEqual([]);
  });

  it('ignores goals still under target', () => {
    // Given a goal that grew but is not yet full
    // When looking for reached goals
    // Then nothing fires
    expect(findReachedGoals([goal({ saved: 100 })], [goal({ saved: 500 })])).toEqual([]);
  });

  it('flags a goal created and filled in one step', () => {
    // Given a goal missing from the before-snapshot
    // When it arrives already full
    // Then it counts as reached from empty
    expect(findReachedGoals([], [goal({ saved: 1000 })]).map((g) => g.id)).toEqual([1]);
  });

  it('fires when the target is lowered to what is already saved', () => {
    // Given a goal holding 800 toward 1,000
    const prev = [goal({ saved: 800, target_amount: 1000 })];
    // When the target is edited down to 750
    const curr = [goal({ saved: 800, target_amount: 750 })];
    // Then it counts as reached — judged against each side's own target
    expect(findReachedGoals(prev, curr).map((g) => g.id)).toEqual([1]);
  });

  it('stays quiet when a reached goal\'s target is raised and lowered back', () => {
    // Given a goal that was already full
    const prev = [goal({ saved: 1000, target_amount: 900 })];
    // When its target is changed but it is still full
    // Then it does not fire again
    expect(findReachedGoals(prev, [goal({ saved: 1000, target_amount: 950 })])).toEqual([]);
  });

  it('never fires for a completed goal', () => {
    // Given an archived goal that receives a back-dated split
    // Then it is finished already and stays quiet
    const archived = { archived_at: '2026-10-01T00:00:00.000Z' };
    expect(findReachedGoals([goal({ saved: 0, ...archived })], [goal({ saved: 1000, ...archived })])).toEqual([]);
  });

  it('never fires for a goal with no target', () => {
    // Given a zero-target goal
    // When money arrives
    // Then it is skipped
    expect(findReachedGoals([goal({ target_amount: 0 })], [goal({ target_amount: 0, saved: 10 })])).toEqual([]);
  });
});

describe('findOverspentAccounts', () => {
  const account = (id: number, initial_balance: number): Account => ({
    id, name: `Account ${id}`, initial_balance, currency: 'EUR', color: null, icon: null,
    account_type: 'cash', current_value: null, created_at: '2026-01-01',
  });
  const savings = account(1, 1000);
  const TODAY = '2026-10-29';
  // 800 of Savings' 1,000 is set aside in a goal.
  const base: BalanceSnapshot = { transactions: [], transfers: [], goals: [{ account_id: 1, saved: 800 }] };
  const expense = (amount: number, date = TODAY) => ({ account_id: 1, type: 'expense' as const, amount, date });

  it('flags an expense that spends money set aside for goals', () => {
    // Given 200 unreserved, and a 300 expense not paid from the goal
    const curr = { ...base, transactions: [expense(300)] };

    // When checking after the save
    const overspent = findOverspentAccounts([savings], base, curr, TODAY);

    // Then Savings is reported 100 short
    expect(overspent).toEqual([{ account: savings, available: -100 }]);
  });

  it('flags a transfer out that does the same', () => {
    // Given 300 transferred out of Savings
    const curr = { ...base, transfers: [{ from_account_id: 1, to_account_id: 2, amount: 300, to_amount: null, date: TODAY }] };

    // Then Savings is reported, the destination is not
    expect(findOverspentAccounts([savings, account(2, 0)], base, curr, TODAY).map((o) => o.account.id)).toEqual([1]);
  });

  it('stays quiet when the unreserved money covers it', () => {
    // Given a 200 expense against 200 unreserved
    expect(findOverspentAccounts([savings], base, { ...base, transactions: [expense(200)] }, TODAY)).toEqual([]);
  });

  it('stays quiet when the expense is paid from the goal', () => {
    // Given a 300 expense that also takes 300 out of the goal
    const curr = { transactions: [expense(300)], transfers: [], goals: [{ account_id: 1, saved: 500 }] };
    // Then balance and goal fall together — nothing set aside was spent elsewhere
    expect(findOverspentAccounts([savings], base, curr, TODAY)).toEqual([]);
  });

  it('does not fire again for a save that leaves an overspent account no worse', () => {
    // Given Savings already 100 short
    const short = { ...base, transactions: [expense(300)] };
    // When a later save leaves the figures unchanged (say, a note edit)
    // Then nothing new is reported
    expect(findOverspentAccounts([savings], short, short, TODAY)).toEqual([]);
  });

  it('ignores future-dated spend until its day', () => {
    // Given the 300 expense is dated next month
    const curr = { ...base, transactions: [expense(300, '2026-11-15')] };
    // Then today's Available is untouched
    expect(findOverspentAccounts([savings], base, curr, TODAY)).toEqual([]);
  });

  it('ignores completed goals — their money is no longer set aside', () => {
    // Given Savings' only goal is archived, and a 900 expense leaves 100
    const archivedOnly: BalanceSnapshot = { transactions: [], transfers: [], goals: [{ account_id: 1, saved: 800, archived_at: '2026-10-01' }] };
    const curr = { ...archivedOnly, transactions: [expense(900)] };
    // Then nothing set aside was spent
    expect(findOverspentAccounts([savings], archivedOnly, curr, TODAY)).toEqual([]);
  });

  it('skips accounts without goals', () => {
    // Given an account with no goals going negative
    const current = account(2, 100);
    const curr = { ...base, transactions: [{ account_id: 2, type: 'expense' as const, amount: 500, date: TODAY }] };
    // Then it is not a goal overspend
    expect(findOverspentAccounts([current], base, curr, TODAY)).toEqual([]);
  });
});
