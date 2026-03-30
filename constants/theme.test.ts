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
  it('should contain objects with label and color fields', () => {
    // Given the ACCENT_COLORS array
    // When each entry is inspected
    // Then every entry should have a label string and a color string
    for (const entry of ACCENT_COLORS) {
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('color');
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.color).toBe('string');
    }
  });

  it('should only contain valid hex color strings', () => {
    // Given the ACCENT_COLORS array
    // When each entry's color is validated
    // Then every color should be a valid 6-digit hex color
    for (const entry of ACCENT_COLORS) {
      expect(entry.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
