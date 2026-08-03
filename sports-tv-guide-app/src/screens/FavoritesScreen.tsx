import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useGameStore, getFavoriteGames } from '@store/gameStore';
import { Game } from '@types/index';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@constants/theme';
import GameCard from '@components/GameCard';
import BoxScoreModal from '@components/BoxScoreModal';

export default function FavoritesScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Subscribe to the individual state slices getFavoriteGames reads, and
  // recompute with useMemo rather than selecting getFavoriteGames(state)
  // directly — that selector allocates a new array on every call, which
  // fails useSyncExternalStore's reference check and loops forever.
  const games = useGameStore((state) => state.games);
  const favoriteGameIds = useGameStore((state) => state.preferences.favoriteGames);
  const favoriteTeamIds = useGameStore((state) => state.preferences.favoriteTeams);
  const favorites = useMemo(
    () => getFavoriteGames(useGameStore.getState()),
    [games, favoriteGameIds, favoriteTeamIds]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home' as never)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      <TouchableOpacity
        style={styles.manageTeamsRow}
        onPress={() => navigation.navigate('ManageTeams' as never)}
        activeOpacity={0.7}
      >
        <Text style={styles.manageTeamsText}>⭐ Manage Favorite Teams</Text>
        <Text style={styles.manageTeamsChevron}>›</Text>
      </TouchableOpacity>

      {favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(game) => game.id}
          renderItem={({ item }) => <GameCard game={item} onPress={() => setSelectedGame(item)} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyDescription}>Tap the star on a game to save it here.</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ManageTeams' as never)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.emptyManageTeamsLink}>Manage Favorite Teams ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedGame && (
        <BoxScoreModal
          game={selectedGame}
          visible={!!selectedGame}
          onClose={() => setSelectedGame(null)}
        />
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.headerBg,
      paddingHorizontal: 16,
      paddingVertical: 16,
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
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.textInverse,
    },
    manageTeamsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    manageTeamsText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    manageTeamsChevron: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    listContent: {
      paddingVertical: 12,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyManageTeamsLink: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
      marginTop: 20,
    },
  });
