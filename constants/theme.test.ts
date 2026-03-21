import { getColors, ACCENT_COLORS } from '@/constants/theme';

describe('getColors', () => {
  it('should return dark backgrounds for dark mode', () => {
    // Given the app is in dark mode
    // When getColors(true) is called
    const colors = getColors(true);
    // Then bg and cardBg should be the dark theme values
    expect(colors.bg).toBe('#0d0d1a');
    expect(colors.cardBg).toBe('#1a1a2e');
  });

  it('should return light backgrounds for light mode', () => {
    // Given the app is in light mode
    // When getColors(false) is called
    const colors = getColors(false);
    // Then bg and cardBg should be the light theme values
    expect(colors.bg).toBe('#f2f2f7');
    expect(colors.cardBg).toBe('#ffffff');
  });

  it('should include all required color keys', () => {
    // Given either mode
    // When getColors is called
    const colors = getColors(true);
    // Then the result should contain all 6 keys
    expect(colors).toHaveProperty('bg');
    expect(colors).toHaveProperty('cardBg');
    expect(colors).toHaveProperty('inputBg');
    expect(colors).toHaveProperty('textColor');
    expect(colors).toHaveProperty('subColor');
    expect(colors).toHaveProperty('borderColor');
  });
});

describe('ACCENT_COLORS', () => {
  it('should include the default accent color', () => {
    // Given the ACCENT_COLORS array
    // When checked
    // Then it should include the default accent color
    expect(ACCENT_COLORS).toContain('#2f95dc');
  });

  it('should only contain valid hex color strings', () => {
    // Given the ACCENT_COLORS array
    // When each entry is validated
    // Then every entry should be a valid 6-digit hex color
    for (const color of ACCENT_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
