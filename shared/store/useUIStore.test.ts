import { useUIStore } from './useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ isAddTxOpen: false, isTransferOpen: false, selectedAccountId: null });
  });

  it('should toggle the add transaction sheet', () => {
    // Given isAddTxOpen is false
    expect(useUIStore.getState().isAddTxOpen).toBe(false);
    // When openAddTx is called
    useUIStore.getState().openAddTx();
    // Then it should be true
    expect(useUIStore.getState().isAddTxOpen).toBe(true);
    // And when closeAddTx is called
    useUIStore.getState().closeAddTx();
    // Then it should be false
    expect(useUIStore.getState().isAddTxOpen).toBe(false);
  });
});
