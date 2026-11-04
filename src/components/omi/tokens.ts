/**
 * Omi-inspired design tokens for Re:Mind Me.
 * Dark-first, high-contrast, low visual noise.
 * MindOrb remains unchanged; these tokens style surrounding surfaces only.
 */

export const omiTokens = {
  colors: {
    bg: "#000000",
    surface: "#1C1C1E",
    surfaceElevated: "#2C2C2E",
    textPrimary: "#FFFFFF",
    textSecondary: "#8E8E93",
    textTertiary: "#636366",
    accentRed: "#FF3B30",
    accentGreen: "#30D158",
    accentAmber: "#FF9F0A",
    iconBg: "#3A3A3C",
    border: "#3A3A3C",
  },
  radius: {
    card: 16,
    pill: 24,
    circle: 999,
  },
  spacing: {
    inset: 20,
    row: 56,
    section: 24,
  },
} as const;

export type OmiTokens = typeof omiTokens;
