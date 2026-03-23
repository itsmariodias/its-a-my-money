import { useUIStore } from './useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      isAddTxOpen: false,
      isTransferOpen: false,
      selectedAccountId: null,
      periodMode: 'month',
      periodDate: new Date(),
      externalActivityActive: false,
    });
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

  it('should sync period across tabs via setPeriod', () => {
    // Given default period is month mode
    expect(useUIStore.getState().periodMode).toBe('month');

    // When setPeriod is called with year mode and a specific date
    const newDate = new Date(2025, 5, 15);
    useUIStore.getState().setPeriod('year', newDate);

    // Then both periodMode and periodDate should update
    expect(useUIStore.getState().periodMode).toBe('year');
    expect(useUIStore.getState().periodDate).toBe(newDate);
  });

  it('should update period mode independently of other state', () => {
    // Given a selected account filter is active
    useUIStore.getState().setSelectedAccountId(42);

    // When setPeriod is called
    const newDate = new Date(2025, 0, 1);
    useUIStore.getState().setPeriod('day', newDate);

    // Then account filter should be preserved
    expect(useUIStore.getState().selectedAccountId).toBe(42);
    expect(useUIStore.getState().periodMode).toBe('day');
  });

  it('should toggle externalActivityActive bypass flag', () => {
    // Given the flag is false by default
    expect(useUIStore.getState().externalActivityActive).toBe(false);

    // When an external activity starts
    useUIStore.getState().setExternalActivityActive(true);

    // Then the flag should be true
    expect(useUIStore.getState().externalActivityActive).toBe(true);

    // When the external activity ends
    useUIStore.getState().setExternalActivityActive(false);

    // Then the flag should be false again
    expect(useUIStore.getState().externalActivityActive).toBe(false);
  });
});
