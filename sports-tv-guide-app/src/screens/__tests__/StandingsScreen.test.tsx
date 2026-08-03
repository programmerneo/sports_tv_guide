/**
 * Tests for StandingsScreen's handling of sports that fail to load
 * (e.g. nfl/mlb returning 404 once their postseason has ended).
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, screen, waitFor } from '@testing-library/react-native';

import StandingsScreen from '../StandingsScreen';
import { apiService } from '@services/api';
import { lightTheme } from '@constants/theme';
import { StandingsResponse, StandingsScreenParams } from '@types/index';

const NHL_STANDINGS: StandingsResponse = {
  sport: 'nhl',
  league: 'National Hockey League',
  season: `${new Date().getFullYear()}`,
  groups: [],
};

const MLB_STANDINGS: StandingsResponse = {
  sport: 'mlb',
  league: 'Major League Baseball',
  season: `${new Date().getFullYear()}`,
  groups: [],
};

const CFB_STANDINGS: StandingsResponse = {
  sport: 'football-college',
  league: 'NCAA Football',
  season: `${new Date().getFullYear()}`,
  groups: [
    {
      name: 'Big Ten Conference',
      abbreviation: 'B1G',
      league: null,
      teams: [
        {
          team: 'Ohio State Buckeyes',
          shortName: 'Ohio State',
          abbreviation: 'OSU',
          logo: '',
          record: '11-1',
          leagueWinPercent: '.875',
          pointsFor: '480',
          pointsAgainst: '210',
        },
      ],
    },
  ],
};

const Stack = createNativeStackNavigator();

// StandingsScreen uses useRoute(), which requires being rendered as an actual
// screen within a navigator (not just inside a bare NavigationContainer).
function renderScreen(params?: StandingsScreenParams) {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Standings" component={StandingsScreen} initialParams={params} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('StandingsScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('omits a sport whose standings request rejects (e.g. gated 404) from the tab list', async () => {
    jest.spyOn(apiService, 'getStandings').mockImplementation(async (sport) => {
      if (sport === 'nfl' || sport === 'mlb') {
        throw new Error(`HTTP 404: ${sport} season has ended`);
      }
      return NHL_STANDINGS;
    });

    renderScreen();

    await waitFor(() => expect(screen.queryByText('🏒 NHL')).toBeTruthy());

    expect(screen.queryByText('🏈 NFL')).toBeNull();
    expect(screen.queryByText('⚾ MLB')).toBeNull();
  });

  it('preselects the sport passed via route params when it is active', async () => {
    jest.spyOn(apiService, 'getStandings').mockImplementation(async (sport) => {
      if (sport === 'nhl') return NHL_STANDINGS;
      if (sport === 'mlb') return MLB_STANDINGS;
      throw new Error(`HTTP 404: ${sport} season has ended`);
    });

    renderScreen({ sport: 'mlb' });

    await waitFor(() => expect(screen.queryByText('🏒 NHL')).toBeTruthy());

    // MLB tab (not NHL, the first active sport) should be the selected/active one.
    const mlbTabText = screen.getByText('⚾ MLB');
    const nhlTabText = screen.getByText('🏒 NHL');
    expect(mlbTabText.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: lightTheme.textInverse })])
    );
    expect(nhlTabText.props.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ color: lightTheme.textInverse })])
    );
  });

  it('renders football-college standings with its conference groups and columns', async () => {
    jest.spyOn(apiService, 'getStandings').mockImplementation(async (sport) => {
      if (sport === 'football-college') return CFB_STANDINGS;
      throw new Error(`HTTP 404: ${sport} season has ended`);
    });

    renderScreen({ sport: 'football-college' });

    await waitFor(() => expect(screen.queryByText('🏈 NCAAF')).toBeTruthy());

    // Conference name is the section header (no league sub-tabs for college sports).
    expect(screen.getByText('Big Ten')).toBeTruthy();
    ['W', 'L', 'Conf', 'PF', 'PA'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
    // Record "11-1" is split into separate W/L cells rather than shown combined.
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('.875')).toBeTruthy();
  });

  it('omits football-college when it is out of season', async () => {
    jest.spyOn(apiService, 'getStandings').mockImplementation(async (sport) => {
      if (sport === 'nhl') return NHL_STANDINGS;
      throw new Error(`HTTP 404: ${sport} season has ended`);
    });

    renderScreen({ sport: 'football-college' });

    await waitFor(() => expect(screen.queryByText('🏒 NHL')).toBeTruthy());

    expect(screen.queryByText('🏈 NCAAF')).toBeNull();
    // The unavailable requested sport must not be selected — NHL falls back in.
    expect(screen.getByText('🏒 NHL').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: lightTheme.textInverse })])
    );
  });
});
