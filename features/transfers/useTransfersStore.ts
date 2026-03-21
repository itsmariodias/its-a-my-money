import { create } from 'zustand';
import type { TransferWithDetails } from '@/types';

interface TransfersState {
  transfers: TransferWithDetails[];
  setTransfers: (transfers: TransferWithDetails[]) => void;
  addTransfer: (transfer: TransferWithDetails) => void;
  updateTransfer: (transfer: TransferWithDetails) => void;
  removeTransfer: (id: number) => void;
}

export const useTransfersStore = create<TransfersState>((set) => ({
  transfers: [],
  setTransfers: (transfers) => set({ transfers }),
  addTransfer: (transfer) =>
    set((state) => ({ transfers: [transfer, ...state.transfers] })),
  updateTransfer: (transfer) =>
    set((state) => ({
      transfers: state.transfers.map((t) =>
        t.id === transfer.id ? transfer : t
      ),
    })),
  removeTransfer: (id) =>
    set((state) => ({ transfers: state.transfers.filter((t) => t.id !== id) })),
}));
