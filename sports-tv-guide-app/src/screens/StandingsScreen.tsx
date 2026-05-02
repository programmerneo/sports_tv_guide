import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { COLORS } from '@constants/index';
import { apiService } from '@services/api';
import { StandingsGroup, StandingsResponse, StandingsSportType } from '@types/index';

// ── Static config ─────────────────────────────────────────────────────────────

const STANDINGS_SPORTS: StandingsSportType[] = ['nhl', 'mlb', 'nfl', 'basketball-college'];

const SPORT_INFO: Record<StandingsSportType, { label: string; emoji: string }> = {
  nhl: { label: 'NHL', emoji: '🏒' },
  mlb: { label: 'MLB', emoji: '⚾' },
  nfl: { label: 'NFL', emoji: '🏈' },
  'basketball-college': { label: 'NCAAB', emoji: '🏀' },
};

interface ColumnDef {
  key: string;
  label: string;
  width: number;
}

// Fixed-width columns per sport — no flex, mirrors golf leaderboard approach
const TEAM_W = 120;

const COLUMNS: Record<StandingsSportType, ColumnDef[]> = {
  nhl: [
    { key: 'gamesPlayed', label: 'GP', width: 36 },
    { key: 'record', label: 'W-L-OT', width: 68 },
    { key: 'points', label: 'PTS', width: 40 },
    { key: 'pointsFor', label: 'GF', width: 36 },
    { key: 'pointsAgainst', label: 'GA', width: 36 },
  ],
  mlb: [
    { key: 'record', label: 'W-L', width: 52 },
    { key: 'winPercent', label: 'PCT', width: 44 },
    { key: 'gamesBehind', label: 'GB', width: 36 },
    { key: '_home', label: 'Home', width: 52 },
    { key: '_away', label: 'Away', width: 52 },
  ],
  nfl: [
    { key: 'record', label: 'W-L-T', width: 56 },
    { key: 'winPercent', label: 'PCT', width: 44 },
    { key: 'pointsFor', label: 'PF', width: 36 },
    { key: 'pointsAgainst', label: 'PA', width: 36 },
  ],
  'basketball-college': [
    { key: 'record', label: 'W-L', width: 52 },
    { key: 'winPercent', label: 'PCT', width: 44 },
    { key: 'leagueWinPercent', label: 'Conf', width: 52 },
  ],
};

// ── League grouping ───────────────────────────────────────────────────────────
// Maps a group to a short league key used for the second row of tabs.
// MLB: backend supplies group.league ("American League" / "National League")
// NHL/NFL: derived from division name patterns

function getGroupLeagueKey(group: StandingsGroup, sport: StandingsSportType): string | null {
  // Use backend-provided league field first (set when ESPN returns nested structure via ?level=3)
  if (group.league) {
    const l = group.league.toLowerCase();
    if (sport === 'mlb') {
      if (l.includes('american')) return 'AL';
      if (l.includes('national')) return 'NL';
    }
    if (sport === 'nhl') {
      if (l.includes('eastern')) return 'Eastern';
      if (l.includes('western')) return 'Western';
    }
    if (sport === 'nfl') {
      if (l.includes('american football') || l.includes('afc')) return 'AFC';
      if (l.includes('national football') || l.includes('nfc')) return 'NFC';
    }
    return group.league;
  }

  // Name-based fallback for when group.league is absent
  if (sport === 'mlb') {
    const n = group.name.toUpperCase();
    const a = group.abbreviation.toUpperCase();
    if (n.includes('AMERICAN') || a.startsWith('AL')) return 'AL';
    if (n.includes('NATIONAL') || a.startsWith('NL')) return 'NL';
  }
  if (sport === 'nhl') {
    const n = group.name.toLowerCase();
    if (n.includes('atlantic') || n.includes('metropolitan')) return 'Eastern';
    if (n.includes('central') || n.includes('pacific')) return 'Western';
  }
  if (sport === 'nfl') {
    const n = group.name.toUpperCase();
    if (n.startsWith('AFC') || n.includes('AMERICAN FOOTBALL')) return 'AFC';
    if (n.startsWith('NFC') || n.includes('NATIONAL FOOTBALL')) return 'NFC';
  }

  return null; // NCAAB — no league grouping
}

// Strip league prefix/suffix so headers read "East", "Atlantic", "North" etc.
// ESPN level=3 names: "American League East", "Atlantic Division", "AFC North"
function getDivisionLabel(name: string, sport: StandingsSportType): string {
  if (sport === 'mlb') return name.replace(/^(American|National) League\s+/i, '');
  if (sport === 'nfl') return name.replace(/^(AFC|NFC)\s+/i, '');
  if (sport === 'nhl') return name.replace(/\s+Division$/i, '');
  return name;
}

const LEAGUE_LABELS: Record<string, string> = {
  AL: 'American League',
  NL: 'National League',
  Eastern: 'Eastern',
  Western: 'Western',
  AFC: 'AFC',
  NFC: 'NFC',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCellValue(team: StandingsGroup['teams'][0], key: string): string {
  if (key === '_home') return `${team.homeWins ?? '0'}-${team.homeLosses ?? '0'}`;
  if (key === '_away') return `${team.roadWins ?? '0'}-${team.roadLosses ?? '0'}`;
  return team[key] ?? '-';
}

function isCurrentSeason(season: string): boolean {
  return season.includes(new Date().getFullYear().toString());
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StandingsScreen() {
  const navigation = useNavigation();
  const [allStandings, setAllStandings] = useState<Partial<Record<StandingsSportType, StandingsResponse>>>({});
  const [activeSports, setActiveSports] = useState<StandingsSportType[]>([]);
  const [selectedSport, setSelectedSport] = useState<StandingsSportType | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled(
      STANDINGS_SPORTS.map((sport) => apiService.getStandings(sport))
    );

    const standings: Partial<Record<StandingsSportType, StandingsResponse>> = {};
    const active: StandingsSportType[] = [];

    results.forEach((result, i) => {
      const sport = STANDINGS_SPORTS[i];
      if (result.status === 'fulfilled' && isCurrentSeason(result.value.season)) {
        standings[sport] = result.value;
        active.push(sport);
      }
    });

    setAllStandings(standings);
    setActiveSports(active);

    setSelectedSport((prev) => {
      const next = prev && active.includes(prev) ? prev : active[0] ?? null;
      if (next) {
        const firstLeague = getFirstLeagueKey(standings[next]?.groups ?? [], next);
        setSelectedLeague(firstLeague);
      }
      return next;
    });

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const handleSportSelect = (sport: StandingsSportType) => {
    setSelectedSport(sport);
    const firstLeague = getFirstLeagueKey(allStandings[sport]?.groups ?? [], sport);
    setSelectedLeague(firstLeague);
  };

  const currentStandings = selectedSport ? allStandings[selectedSport] : null;
  const columns = selectedSport ? COLUMNS[selectedSport] : [];

  // Derive league keys for the current sport
  const leagues = deriveLeagues(currentStandings?.groups ?? [], selectedSport ?? 'nhl');
  const hasLeagueTabs = leagues.length > 1;

  // Groups to render — filtered by selected league if tabs are present
  const groupsToShow = filterGroups(
    currentStandings?.groups ?? [],
    selectedSport ?? 'nhl',
    hasLeagueTabs ? selectedLeague : null
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  // ── No active seasons ──────────────────────────────────────────────────────
  if (activeSports.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={styles.emptyTitle}>No Active Standings</Text>
          <Text style={styles.emptySubtitle}>Check back during the season</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home' as never)} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Standings</Text>
        {currentStandings && (
          <Text style={styles.headerSeason}>{currentStandings.season}</Text>
        )}
      </View>

      {/* Sport tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabsContent}
      >
        {activeSports.map((sport) => {
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

      {/* League tabs — only shown when sport has multiple leagues */}
      {hasLeagueTabs && (
        <View style={styles.leagueTabsRow}>
          {leagues.map((key) => {
            const isActive = selectedLeague === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.leagueTab, isActive && styles.leagueTabActive]}
                onPress={() => setSelectedLeague(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.leagueTabText, isActive && styles.leagueTabTextActive]}>
                  {LEAGUE_LABELS[key] ?? key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Standings grid */}
      <ScrollView style={styles.grid} showsVerticalScrollIndicator={false}>
        {groupsToShow.map((group) => (
          <View key={group.name} style={styles.groupSection}>
            {/* Division header */}
            <View style={styles.groupHeader}>
              <Text style={styles.groupHeaderText}>
                {selectedSport ? getDivisionLabel(group.name, selectedSport) : group.name}
              </Text>
            </View>

            {/* Centered fixed-width table — mirrors golf leaderboard layout */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View>
                {/* Column headers */}
                <View style={styles.colHeaderRow}>
                  <View style={{ width: TEAM_W }}>
                    <Text style={styles.colHeaderText}>Team</Text>
                  </View>
                  {columns.map((col) => (
                    <Text
                      key={col.key}
                      style={[styles.colHeaderText, styles.colHeaderStat, { width: col.width }]}
                    >
                      {col.label}
                    </Text>
                  ))}
                </View>

                {/* Team rows */}
                {group.teams.map((team, idx) => (
                  <View
                    key={team.abbreviation || team.team}
                    style={[styles.teamRow, idx % 2 === 1 && styles.teamRowAlt]}
                  >
                    <View style={[styles.teamNameCell, { width: TEAM_W }]}>
                      {team.logo ? (
                        <Image
                          source={{ uri: team.logo }}
                          style={styles.teamLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.teamLogoPlaceholder} />
                      )}
                      <Text style={styles.teamName} numberOfLines={1}>
                        {team.shortName || team.abbreviation}
                      </Text>
                    </View>
                    {columns.map((col) => (
                      <Text key={col.key} style={[styles.statCell, { width: col.width }]}>
                        {getCellValue(team, col.key)}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ))}
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Pure helpers (outside component) ─────────────────────────────────────────

function getFirstLeagueKey(groups: StandingsGroup[], sport: StandingsSportType): string | null {
  const keys = groups.map((g) => getGroupLeagueKey(g, sport)).filter(Boolean) as string[];
  return keys[0] ?? null;
}

function deriveLeagues(groups: StandingsGroup[], sport: StandingsSportType): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const g of groups) {
    const key = getGroupLeagueKey(g, sport);
    if (key && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}

function filterGroups(
  groups: StandingsGroup[],
  sport: StandingsSportType,
  leagueKey: string | null
): StandingsGroup[] {
  if (!leagueKey) return groups;
  return groups.filter((g) => getGroupLeagueKey(g, sport) === leagueKey);
}

// ── Header subcomponent ───────────────────────────────────────────────────────

function Header() {
  const navigation = useNavigation();
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home' as never)} activeOpacity={0.7}>
        <Text style={styles.backButtonText}>← Home</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Standings</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.LIGHT_BG,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.DARK_TEXT,
  },
  headerSeason: {
    fontSize: 16,
    color: COLORS.LIGHT_TEXT,
    marginTop: 4,
  },

  // Sport tabs
  tabsRow: {
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    maxHeight: 52,
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
    backgroundColor: COLORS.LIGHT_BG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  tabActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.LIGHT_TEXT,
  },
  tabTextActive: {
    color: COLORS.WHITE,
  },

  // League tabs
  leagueTabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  leagueTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.LIGHT_BG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
  },
  leagueTabActive: {
    backgroundColor: '#eef0ff',
    borderColor: COLORS.PRIMARY,
  },
  leagueTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.LIGHT_TEXT,
  },
  leagueTabTextActive: {
    color: COLORS.PRIMARY,
  },

  // Grid
  grid: {
    flex: 1,
  },
  groupSection: {
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  groupHeader: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.WHITE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Table — fixed-width centered layout (golf leaderboard style)
  tableScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  colHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  colHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.LIGHT_TEXT,
    textTransform: 'uppercase',
  },
  colHeaderStat: {
    textAlign: 'center',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  teamRowAlt: {
    backgroundColor: '#fafafa',
  },
  teamNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  teamLogo: {
    width: 22,
    height: 22,
    flexShrink: 0,
  },
  teamLogoPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.BORDER,
    flexShrink: 0,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.DARK_TEXT,
  },
  statCell: {
    fontSize: 13,
    color: COLORS.DARK_TEXT,
    textAlign: 'center',
  },

  // Empty state
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.DARK_TEXT },
  emptySubtitle: { marginTop: 6, fontSize: 14, color: COLORS.LIGHT_TEXT },

  bottomPad: { height: 24 },
});
