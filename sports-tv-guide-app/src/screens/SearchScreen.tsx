import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@constants/theme';

export default function SearchScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Search Screen</Text>
      <Text style={styles.subtext}>Find teams and games</Text>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    text: { fontSize: 18, fontWeight: 'bold', color: theme.text },
    subtext: { marginTop: 8, fontSize: 14, color: theme.textSecondary },
  });
