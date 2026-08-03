/**
 * Manage Teams - browse teams per sport and toggle which ones are favorited.
 *
 * Reachable from two tabs (Favorites and Profile), so unlike the top-level
 * tab screens (Standings/Notifications/Favorites/Profile) which navigate
 * back to 'Home', this screen calls navigation.goBack() to return to
 * whichever tab it was opened from.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { SPORT_INFO, STANDINGS_SPORTS, STANDINGS_TO_HOME_SPORT } from '@constants/index';
import { ThemeColors } from '@constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { apiService } from '@services/api';
import { favoriteTeamKey, useGameStore } from '@store/gameStore';
import { StandingsSportType, Team } from '@types/index';
import EmptyState from '@components/EmptyState';

const COLLEGE_SPORTS: StandingsSportType[] = ['basketball-college', 'football-college'];
const ALL_CONFERENCES = 'All';

type ListItem =
  | { type: 'header'; key: string; label: string }
  | { type: 'divider'; key: string }
  | { type: 'team'; key: string; team: Team };

function buildListData(favoriteTeams: Team[], otherTeams: Team[]): ListItem[] {
  const items: ListItem[] = [];

  if (favoriteTeams.length > 0) {
    items.push({ type: 'header', key: 'favorites-header', label: '★ Favorites' });
    favoriteTeams.forEach((team) => items.push({ type: 'team', key: `favorite-${team.id}`, team }));
    items.push({ type: 'divider', key: 'favorites-divider' });
  }

  items.push({ type: 'header', key: 'all-header', label: 'All Teams' });
  otherTeams.forEach((team) => items.push({ type: 'team', key: `all-${team.id}`, team }));

  return items;
}

export default function ManageTeamsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();

  const [selectedSport, setSelectedSport] = useState<StandingsSportType>(STANDINGS_SPORTS[0]);
  const [selectedConference, setSelectedConference] = useState<string>(ALL_CONFERENCES);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const favoriteTeamIds = useGameStore((state) => state.preferences.favoriteTeams);
  const toggleFavoriteTeam = useGameStore((state) => state.toggleFavoriteTeam);

  // ESPN team ids aren't unique across sports (e.g. id "1" exists in both
  // MLB and NFL), so favorite lookups/toggles must go through the sport's
  // Home-screen key, not the bare team id — see favoriteTeamKey.
  const homeSport = STANDINGS_TO_HOME_SPORT[selectedSport];

  const fetchTeams = useCallback(async (sport: StandingsSportType) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getTeams(sport);
      setTeams(response.teams);
    } catch (err) {
      setTeams([]);
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams(selectedSport);
  }, [selectedSport, fetchTeams]);

  const handleSportSelect = (sport: StandingsSportType) => {
    setSelectedSport(sport);
    setSelectedConference(ALL_CONFERENCES);
  };

  const showConferenceFilter = COLLEGE_SPORTS.includes(selectedSport);

  // On web, a horizontal ScrollView only scrolls via a horizontal wheel
  // gesture (trackpad swipe / shift+wheel) — a plain vertical mouse-wheel
  // scroll, what most users try first, does nothing. Translate vertical
  // wheel input into horizontal scrolling so these rows are reachable with
  // an ordinary mouse.
  const handleWheelScroll = useCallback((event: unknown) => {
    if (Platform.OS !== 'web') return;
    const wheelEvent = event as { deltaX: number; deltaY: number; currentTarget: HTMLElement };
    if (Math.abs(wheelEvent.deltaY) <= Math.abs(wheelEvent.deltaX)) return;
    wheelEvent.currentTarget.scrollLeft += wheelEvent.deltaY;
  }, []);
  const webOnlyWheelProps = Platform.OS === 'web' ? { onWheel: handleWheelScroll } : {};

  const conferences = useMemo(() => {
    if (!showConferenceFilter) return [];
    const seen = new Set<string>();
    teams.forEach((team) => {
      if (team.conference) seen.add(team.conference);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [teams, showConferenceFilter]);

  const filteredTeams = useMemo(() => {
    if (!showConferenceFilter || selectedConference === ALL_CONFERENCES) return teams;
    return teams.filter((team) => team.conference === selectedConference);
  }, [teams, showConferenceFilter, selectedConference]);

  const favoriteTeams = useMemo(
    () =>
      filteredTeams
        .filter((team) => favoriteTeamIds.includes(favoriteTeamKey(homeSport, team.id)))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filteredTeams, favoriteTeamIds, homeSport]
  );

  const otherTeams = useMemo(
    () =>
      filteredTeams
        .filter((team) => !favoriteTeamIds.includes(favoriteTeamKey(homeSport, team.id)))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filteredTeams, favoriteTeamIds, homeSport]
  );

  const listData = useMemo(
    () => buildListData(favoriteTeams, otherTeams),
    [favoriteTeams, otherTeams]
  );

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return <Text style={styles.sectionHeader}>{item.label}</Text>;
    }
    if (item.type === 'divider') {
      return <View style={styles.divider} />;
    }
    const key = favoriteTeamKey(homeSport, item.team.id);
    return (
      <TeamRow
        team={item.team}
        isFavorite={favoriteTeamIds.includes(key)}
        onToggle={() => toggleFavoriteTeam(key)}
        styles={styles}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Teams</Text>
      </View>

      <View style={styles.pageContent}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsRow}
          contentContainerStyle={styles.tabsContent}
          {...webOnlyWheelProps}
        >
          {STANDINGS_SPORTS.map((sport) => {
            const info = SPORT_INFO[sport];
            const isActive = selectedSport === sport;
            return (
              <TouchableOpacity
                key={sport}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleSportSelect(sport)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {info.emoji} {info.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {showConferenceFilter && conferences.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={styles.chipsContent}
            {...webOnlyWheelProps}
          >
            {[ALL_CONFERENCES, ...conferences].map((conference) => {
              const isActive = selectedConference === conference;
              return (
                <TouchableOpacity
                  key={conference}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setSelectedConference(conference)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {conference}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <EmptyState
              title="⚠️ Oops!"
              subtitle="Failed to load teams"
              description={error}
              onRetry={() => fetchTeams(selectedSport)}
            />
          </View>
        ) : filteredTeams.length === 0 ? (
          <View style={styles.centered}>
            <EmptyState
              title="🏆"
              subtitle="No teams found"
              description="There are no teams to show for this selection."
            />
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={listData}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Team row subcomponent ─────────────────────────────────────────────────────

interface TeamRowProps {
  team: Team;
  isFavorite: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof createStyles>;
}

function TeamRow({ team, isFavorite, onToggle, styles }: TeamRowProps) {
  return (
    <View style={styles.teamRow}>
      {team.logo ? (
        <Image source={{ uri: team.logo }} style={styles.teamLogo} resizeMode="contain" />
      ) : (
        <View style={styles.teamLogoPlaceholder} />
      )}
      <View style={styles.teamInfo}>
        <Text style={styles.teamName} numberOfLines={1}>
          {team.name}
        </Text>
        <Text style={styles.teamAbbreviation} numberOfLines={1}>
          {team.abbreviation}
          {team.conference ? ` · ${team.conference}` : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={onToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={
          isFavorite
            ? `Remove ${team.name} from favorite teams`
            : `Add ${team.name} to favorite teams`
        }
        accessibilityRole="button"
      >
        <Text style={[styles.favoriteStar, isFavorite && styles.favoriteStarActive]}>
          {isFavorite ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Caps the team list to a phone-width column and centers it when the
    // screen is much wider than a phone (e.g. a desktop browser window).
    pageContent: {
      flex: 1,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
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

    // Sport tabs — mirrors StandingsScreen's tabsRow/tabsContent/tab/tabActive
    tabsRow: {
      flexGrow: 0,
      flexShrink: 0,
      height: 52,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tabsContent: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tabActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: theme.textInverse,
    },

    // Conference filter chips
    chipsRow: {
      flexGrow: 0,
      flexShrink: 0,
      height: 44,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    chipsContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 16,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipActive: {
      backgroundColor: theme.surfaceAlt,
      borderColor: theme.primary,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    chipTextActive: {
      color: theme.primary,
    },

    // List
    list: {
      flex: 1,
    },
    listContent: {
      paddingVertical: 12,
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginHorizontal: 16,
      marginBottom: 4,
    },
    teamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 12,
    },
    teamLogo: {
      width: 28,
      height: 28,
      flexShrink: 0,
    },
    teamLogoPlaceholder: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.border,
      flexShrink: 0,
    },
    teamInfo: {
      flex: 1,
    },
    teamName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    teamAbbreviation: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    favoriteButton: {
      padding: 4,
    },
    favoriteStar: {
      fontSize: 22,
      lineHeight: 24,
      color: theme.textSecondary,
    },
    favoriteStarActive: {
      color: theme.secondary,
    },
  });
