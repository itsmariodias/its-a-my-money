import { create } from 'zustand';
import type { PeriodMode } from '@/shared/components/PeriodSelector';

interface UIState {
  isAddTxOpen: boolean;
  openAddTx: () => void;
  closeAddTx: () => void;
  isTransferOpen: boolean;
  openTransfer: () => void;
  closeTransfer: () => void;
  isRecurringFormOpen: boolean;
  openRecurringForm: () => void;
  closeRecurringForm: () => void;
  editingRecurringId: number | null;
  setEditingRecurringId: (id: number | null) => void;
  selectedAccountId: number | null;
  setSelectedAccountId: (id: number | null) => void;
  periodMode: PeriodMode;
  periodDate: Date;
  setPeriod: (mode: PeriodMode, date: Date) => void;
  externalActivityActive: boolean;
  setExternalActivityActive: (active: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAddTxOpen: false,
  openAddTx: () => set({ isAddTxOpen: true }),
  closeAddTx: () => set({ isAddTxOpen: false }),
  isTransferOpen: false,
  openTransfer: () => set({ isTransferOpen: true }),
  closeTransfer: () => set({ isTransferOpen: false }),
  isRecurringFormOpen: false,
  openRecurringForm: () => set({ isRecurringFormOpen: true }),
  closeRecurringForm: () => set({ isRecurringFormOpen: false }),
  editingRecurringId: null,
  setEditingRecurringId: (id) => set({ editingRecurringId: id }),
  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  periodMode: 'month',
  periodDate: new Date(),
  setPeriod: (mode, date) => set({ periodMode: mode, periodDate: date }),
  externalActivityActive: false,
  setExternalActivityActive: (active) => set({ externalActivityActive: active }),
}));
