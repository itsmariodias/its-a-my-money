import { useSettingsStore } from './useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ currency: 'USD', accentColor: '#2f95dc', numberFormat: 'en-US' });
  });

  it('should have correct defaults', () => {
    // Given a fresh settings store
    // When getState is called
    const state = useSettingsStore.getState();
    // Then defaults should be USD, #2f95dc, en-US
    expect(state.currency).toBe('USD');
    expect(state.accentColor).toBe('#2f95dc');
    expect(state.numberFormat).toBe('en-US');
  });

  it('should update currency and accent color', () => {
    // Given a fresh store
    // When setCurrency and setAccentColor are called
    useSettingsStore.getState().setCurrency('EUR');
    useSettingsStore.getState().setAccentColor('#ef4444');
    // Then values should match
    expect(useSettingsStore.getState().currency).toBe('EUR');
    expect(useSettingsStore.getState().accentColor).toBe('#ef4444');
  });
});
