import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useGameStore, getUpcomingGames, getLiveGames } from '@store/gameStore';
import { Game } from '@types/index';
import { SPORTS } from '@constants/index';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@constants/theme';
import { cancelGameReminder } from '@services/notificationService';

interface Reminder {
  id: string;
  game: Game;
  emoji: string;
  title: string;
  subtitle: string;
  isFavorite: boolean;
  isLive: boolean;
}

const formatStartTime = (startTime: string): string => {
  const date = new Date(startTime);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();

  const games = useGameStore((state) => state.games);
  const favoriteGames = useGameStore((state) => state.preferences.favoriteGames);
  const favoriteTeams = useGameStore((state) => state.preferences.favoriteTeams);
  const selectedSports = useGameStore((state) => state.preferences.selectedSports);
  const scheduledReminders = useGameStore((state) => state.scheduledReminders);
  const removeScheduledReminder = useGameStore((state) => state.removeScheduledReminder);

  const reminders = useMemo<Reminder[]>(() => {
    const state = useGameStore.getState();
    const upcoming = getUpcomingGames(state);
    const live = getLiveGames(state);

    const isFavoriteGame = (game: Game): boolean =>
      favoriteGames.includes(game.id) ||
      favoriteTeams.includes(game.homeTeam.id) ||
      favoriteTeams.includes(game.awayTeam.id);

    const toReminder = (game: Game): Reminder => {
      const emoji = SPORTS[game.sport]?.emoji || '🔔';
      const title = `${game.awayTeam.name} vs ${game.homeTeam.name}`;
      const isLive = game.status === 'in_progress';
      const subtitle = isLive
        ? `LIVE now on ${game.network}`
        : `Starts at ${formatStartTime(game.startTime)} on ${game.network}`;

      return {
        id: game.id,
        game,
        emoji,
        title,
        subtitle,
        isFavorite: isFavoriteGame(game),
        isLive,
      };
    };

    // Only games with an active reminder actually belong on this page.
    const activeReminderGames = [...live, ...upcoming].filter((game) =>
      Boolean(scheduledReminders[game.id])
    );
    const built = activeReminderGames.map(toReminder);

    // Prioritize favorites at the top while keeping relative order otherwise.
    return [...built].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  }, [games, favoriteGames, favoriteTeams, selectedSports, scheduledReminders]);

  const handleCancelReminder = async (item: Reminder) => {
    const reminder = scheduledReminders[item.game.id];
    if (!reminder) return;

    await cancelGameReminder(reminder.notificationId);
    removeScheduledReminder(item.game.id);
  };

  const renderReminder = ({ item }: { item: Reminder }) => (
    <View style={styles.row}>
      <Text style={styles.rowEmoji}>{item.emoji}</Text>
      <View style={styles.rowTextGroup}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      {item.isFavorite && (
        <View style={styles.favoriteBadge}>
          <Text style={styles.favoriteBadgeText}>★ Favorite</Text>
        </View>
      )}
      <TouchableOpacity
        onPress={() => handleCancelReminder(item)}
        style={styles.reminderButton}
        accessibilityLabel="Cancel reminder"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.reminderIcon}>🔔</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home' as never)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {reminders.length > 0 ? (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyText}>
            No active reminders. Tap the 🔕 on a game to set one.
          </Text>
        </View>
      )}
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
      gap: 12,
    },
    backButton: {
      padding: 4,
    },
    backButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textInverse,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.textInverse,
    },
    listContent: {
      paddingVertical: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowEmoji: {
      fontSize: 24,
      marginRight: 12,
    },
    rowTextGroup: {
      flex: 1,
      paddingRight: 8,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    rowSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    favoriteBadge: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    favoriteBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.secondary,
    },
    reminderButton: {
      padding: 8,
      marginLeft: 4,
    },
    reminderIcon: {
      fontSize: 20,
    },
    separator: {
      height: 1,
      backgroundColor: theme.border,
      marginLeft: 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyEmoji: {
      fontSize: 40,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
