import { create } from 'zustand';

interface UIState {
  isAddTxOpen: boolean;
  openAddTx: () => void;
  closeAddTx: () => void;
  isTransferOpen: boolean;
  openTransfer: () => void;
  closeTransfer: () => void;
  selectedAccountId: number | null;
  setSelectedAccountId: (id: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAddTxOpen: false,
  openAddTx: () => set({ isAddTxOpen: true }),
  closeAddTx: () => set({ isAddTxOpen: false }),
  isTransferOpen: false,
  openTransfer: () => set({ isTransferOpen: true }),
  closeTransfer: () => set({ isTransferOpen: false }),
  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
}));
