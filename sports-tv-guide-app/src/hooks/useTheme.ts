/**
 * Theme hook - resolves the active theme from user preferences.
 */

import { useGameStore } from '@store/gameStore';
import { ThemeColors, darkTheme, lightTheme } from '@constants/theme';

/**
 * Return the active theme colors based on the dark mode preference.
 */
export const useTheme = (): ThemeColors => {
  const isDark = useGameStore((state) => state.preferences.darkModeEnabled);
  return isDark ? darkTheme : lightTheme;
};

/**
 * Return whether dark mode is currently enabled.
 */
export const useIsDark = (): boolean => {
  return useGameStore((state) => state.preferences.darkModeEnabled);
};
