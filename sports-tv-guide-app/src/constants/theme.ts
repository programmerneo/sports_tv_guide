/**
 * Theme definitions for light/dark mode.
 *
 * Provides semantic color tokens consumed across screens and components.
 * The legacy COLORS export in ./index.ts is intentionally kept for
 * backward compatibility — these themes map the same identity (indigo/purple
 * primary, red live color) onto light and dark surfaces.
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  text: string;
  textSecondary: string;
  textInverse: string;
  border: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  live: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  tabBar: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;
  headerBg: string;
  overlay: string;
}

export const lightTheme: ThemeColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  surfaceAlt: '#f9f9f9',
  card: '#ffffff',
  text: '#333333',
  textSecondary: '#999999',
  textInverse: '#ffffff',
  border: '#e0e0e0',
  primary: '#667eea',
  primaryDark: '#764ba2',
  secondary: '#ffc107',
  live: '#ff4444',
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',
  tabBar: '#ffffff',
  tabBarBorder: '#e0e0e0',
  tabActive: '#667eea',
  tabInactive: '#999999',
  headerBg: '#667eea',
  overlay: 'rgba(0, 0, 0, 0.3)',
};

export const darkTheme: ThemeColors = {
  background: '#0f1115',
  surface: '#1e2128',
  surfaceAlt: '#15171c',
  card: '#1e2128',
  text: '#f2f3f5',
  textSecondary: '#9aa0aa',
  textInverse: '#ffffff',
  border: '#2a2e37',
  primary: '#7c8cff',
  primaryDark: '#9a6fd6',
  secondary: '#ffc107',
  live: '#ff5a5a',
  success: '#4caf50',
  error: '#ef5350',
  warning: '#ffa726',
  info: '#42a5f5',
  tabBar: '#15171c',
  tabBarBorder: '#2a2e37',
  tabActive: '#7c8cff',
  tabInactive: '#9aa0aa',
  headerBg: '#1e2128',
  overlay: 'rgba(0, 0, 0, 0.6)',
};
