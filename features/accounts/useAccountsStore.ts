import { create } from 'zustand';
import type { Account } from '@/types';

interface AccountsState {
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
  upsertAccount: (account: Account) => void;
  removeAccount: (id: number) => void;
}

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],

  setAccounts: (accounts) => set({ accounts }),

  upsertAccount: (account) =>
    set((state) => {
      const exists = state.accounts.some((a) => a.id === account.id);
      return {
        accounts: exists
          ? state.accounts.map((a) => (a.id === account.id ? account : a))
          : [...state.accounts, account],
      };
    }),

  removeAccount: (id) =>
    set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) })),
}));
