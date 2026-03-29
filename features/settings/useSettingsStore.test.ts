import { useSettingsStore } from './useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ currency: 'USD', accentColor: '#FFB300', numberFormat: 'en-US', biometricLock: false });
  });

  it('should have correct defaults', () => {
    // Given a fresh settings store
    // When getState is called
    const state = useSettingsStore.getState();
    // Then defaults should be USD, MD3 yellow, en-US
    expect(state.currency).toBe('USD');
    expect(state.accentColor).toBe('#FFB300');
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

  it('should have biometricLock defaulting to false', () => {
    // Given a fresh settings store
    // When getState is called
    const state = useSettingsStore.getState();
    // Then biometricLock should be false
    expect(state.biometricLock).toBe(false);
  });

  it('should update biometricLock', () => {
    // Given a fresh store
    // When setBiometricLock is called with true
    useSettingsStore.getState().setBiometricLock(true);
    // Then biometricLock should be true
    expect(useSettingsStore.getState().biometricLock).toBe(true);
  });
});
