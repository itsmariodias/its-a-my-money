export interface AppColors {
  bg: string;         // page / screen background
  cardBg: string;     // card / surface background
  inputBg: string;    // text input / chip background
  textColor: string;
  subColor: string;
  borderColor: string;
}

export const ACCENT_COLORS = [
  '#2f95dc',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#22c55e',
  '#14b8a6',
];

export function getColors(isDark: boolean): AppColors {
  return isDark
    ? {
        bg: '#0d0d1a',
        cardBg: '#1a1a2e',
        inputBg: '#1a2035',
        textColor: '#e0e0e0',
        subColor: '#a0a0b0',
        borderColor: '#2a2a44',
      }
    : {
        bg: '#f2f2f7',
        cardBg: '#ffffff',
        inputBg: '#f0f4f8',
        textColor: '#1a1a2e',
        subColor: '#6b7280',
        borderColor: '#e2e8f0',
      };
}
