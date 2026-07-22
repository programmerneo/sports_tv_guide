import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGameStore } from '@store/gameStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@constants/theme';
import { cancelGameReminder } from '@services/notificationService';

export default function ProfileScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const darkModeEnabled = useGameStore((state) => state.preferences.darkModeEnabled);
  const notificationsEnabled = useGameStore((state) => state.preferences.notificationsEnabled);
  const setPreferences = useGameStore((state) => state.setPreferences);
  const scheduledReminders = useGameStore((state) => state.scheduledReminders);
  const removeScheduledReminder = useGameStore((state) => state.removeScheduledReminder);

  const handleNotificationsToggle = async (value: boolean) => {
    if (!value) {
      for (const [gameId, notificationId] of Object.entries(scheduledReminders)) {
        await cancelGameReminder(notificationId);
        removeScheduledReminder(gameId);
      }
    }
    setPreferences({ notificationsEnabled: value });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.row}>
          <View style={styles.rowLabelGroup}>
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Text style={styles.rowDescription}>Switch between light and dark themes</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={(value) => setPreferences({ darkModeEnabled: value })}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={theme.surface}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.row}>
          <View style={styles.rowLabelGroup}>
            <Text style={styles.rowLabel}>Game Reminders</Text>
            <Text style={styles.rowDescription}>Get notified before games start</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={theme.surface}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.headerBg,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.textInverse,
    },
    section: {
      backgroundColor: theme.surface,
      marginTop: 12,
      marginHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    rowLabelGroup: {
      flex: 1,
      paddingRight: 12,
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    rowDescription: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
  });
