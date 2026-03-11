/**
 * Application constants
 */

import { SportType } from '@types/index';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
export const API_TIMEOUT = 10000; // 10 seconds

export const SPORTS: Record<SportType, { label: string; emoji: string; displayName: string }> = {
  'basketball-college': { label: '🏀', emoji: '🏀', displayName: 'NCAAB' },
  'football-college': { label: '🏈', emoji: '🏈', displayName: 'NCAAF' },
  'football-nfl': { label: '🏈', emoji: '🏈', displayName: 'NFL' },
  'golf-pga': { label: '⛳', emoji: '⛳', displayName: 'PGA Golf' },
  'golf-liv': { label: '⛳', emoji: '⛳', displayName: 'LIV Golf' },
  'hockey-nhl': { label: '🏒', emoji: '🏒', displayName: 'NHL' },
  'baseball-mlb': { label: '⚾', emoji: '⚾', displayName: 'MLB' },
};

export const NETWORK_LOGOS: Record<string, string> = {
  ESPN: '📺',
  'ESPN+': '📱',
  FOX: '🦊',
  'FOX SPORTS': '🦊',
  NBC: '🎬',
  'NBC SPORTS': '🎬',
  CBS: '📻',
  'CBS SPORTS': '📻',
  TNT: '⚡',
  TURNER: '⚡',
  BRAVO: '🎭',
  MLBN: '⚾',
  NHL: '🏒',
  MLS: '⚽',
  'PEACOCK PREMIUM': '🦚',
  PARAMOUNT: '🎬',
  AMAZON: '🛒',
  APPLE: '🍎',
};

export const CACHE_DURATION = {
  SCHEDULE: 30 * 1000, // 30 seconds (matching refresh interval)
  GAME_SUMMARY: 60 * 1000, // 60 seconds (matching backend)
  STANDINGS: 5 * 60 * 1000, // 5 minutes
  PREFERENCES: 24 * 60 * 60 * 1000, // 24 hours
};

export const GAME_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  POSTPONED: 'postponed',
  CANCELED: 'canceled',
};

export const EMPTY_STATE_MESSAGES = {
  NO_GAMES_TODAY: {
    title: '⏰ Take a break!',
    subtitle: 'No games today',
    description: 'Check back tomorrow for upcoming games',
  },
  ERROR: {
    title: '⚠️ Oops!',
    subtitle: 'Failed to load games',
    description: 'Please check your connection and try again',
  },
  LOADING: {
    title: '⏳',
    subtitle: 'Loading games...',
    description: '',
  },
};

export const COLORS = {
  PRIMARY: '#667eea',
  PRIMARY_DARK: '#764ba2',
  SECONDARY: '#ffc107',
  SUCCESS: '#4caf50',
  ERROR: '#f44336',
  WARNING: '#ff9800',
  INFO: '#2196f3',
  LIGHT_BG: '#f5f5f5',
  WHITE: '#ffffff',
  DARK_TEXT: '#333333',
  LIGHT_TEXT: '#999999',
  BORDER: '#e0e0e0',
  LIVE_RED: '#ff4444',
  UPCOMING_PURPLE: '#667eea',
};

export const DEFAULT_USER_PREFERENCES = {
  favoriteTeams: [],
  favoriteGames: [],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notificationsEnabled: true,
  darkModeEnabled: false,
  selectedSports: [
    'football-nfl',
    'basketball-college',
    'hockey-nhl',
    'baseball-mlb',
    'golf-pga',
  ] as SportType[],
};

export const TIME_SLOTS = [
  '7:00 AM',
  '7:30 AM',
  '8:00 AM',
  '8:30 AM',
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
  '9:30 PM',
  '10:00 PM',
  '10:30 PM',
  '11:00 PM',
  '11:30 PM',
];

export const GAME_REFRESH_INTERVAL = 30 * 1000; // 30 seconds for live games
