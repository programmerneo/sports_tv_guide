# ⚽ Sports TV Guide - Mobile App

A modern, mobile-first sports broadcast TV guide application built with **Expo** and **React Native**.

## Features

✨ **Key Features:**
- 📺 **TV Guide Grid** - Time-based layout with sports as columns
- 🏈 **Multi-Sport Support** - Basketball, Football, Baseball, Hockey, Soccer, and Golf
- ⏱️ **Live Games Section** - Upcoming games at the top with countdown timers
- 📊 **Box Score Details** - Detailed game statistics and play-by-play
- 🔔 **Notifications** - Set reminders for favorite teams and games
- ⭐ **Favorites** - Save favorite teams and games for quick access
- 🌐 **Timezone-Aware** - Displays times in user's local timezone
- 📱 **Responsive Design** - Optimized for mobile devices
- 🎨 **Modern UI** - Clean, intuitive interface

---

## ⚡ Quick Start (5 Minutes)

For a fast setup, follow these 5 steps:

### Prerequisites ✓
- Node.js 18+ installed
- npm installed

### Step 1: Install Dependencies (2 minutes)
```bash
cd sports-tv-guide-app
npm install
```

### Step 2: Configure API (30 seconds)
The app defaults to `http://localhost:3001` (the backend's documented port — see the root README). To point at a different host, set `EXPO_PUBLIC_API_URL` before starting Expo:

```bash
# macOS / Linux
EXPO_PUBLIC_API_URL=http://localhost:3001 npx expo start

# Windows PowerShell
$env:EXPO_PUBLIC_API_URL = "http://localhost:3001"; npx expo start
```

Android emulator users: the app auto-rewrites `localhost` to `10.0.2.2`, so no override is needed.

### Step 3: Start Development Server (30 seconds)
```bash
npx expo start
```

### Step 4: Open App (1 minute)
Choose one:
- **iOS Simulator**: Press `i`
- **Android Emulator**: Press `a`
- **Web**: Press `w`
- **Expo Go (Mobile)**: Press `o` and scan QR code

### Step 5: Verify
✅ See the TV guide grid
✅ Sport tabs at top
✅ Time slots on left
✅ Games displayed

**Done! 🎉**

> **Need more detail?** Continue reading the [Detailed Setup](#-detailed-setup-full-guide) section below.

---

## 🚀 Detailed Setup (Full Guide)

### Prerequisites

Ensure you have the following installed:

```bash
# Check Node version (need 18+)
node --version

# Check npm version
npm --version
```

If you don't have Node.js, download from https://nodejs.org/

> **Note:** Global `expo-cli` is no longer required. All Expo commands use `npx expo` which runs the locally installed CLI.

### Project Setup

Navigate to the project directory:

```bash
cd sports-tv-guide-app
```

Install dependencies:

```bash
npm install
```

Wait for installation to complete. This may take 2-5 minutes.

### Backend Configuration

The API base URL is resolved at startup by [`src/constants/index.ts`](src/constants/index.ts):

1. If `EXPO_PUBLIC_API_URL` is set, that value is used.
2. Otherwise, the app defaults to `http://localhost:3001` (Android emulators use `http://10.0.2.2:3001`).

**Option A: Local Development**
No config needed — start your backend on port 3001 (see the root [README](../README.md)) and run `npx expo start`.

**Option B: Remote Backend or Custom Port**
Export `EXPO_PUBLIC_API_URL` before starting Expo:

```bash
EXPO_PUBLIC_API_URL=https://your-api-domain.com npx expo start
```

### Run the App

Start the development server:

```bash
npx expo start
```

You should see output like:

```
Expo Go
To run your app with live reload on your phone, choose one of these options:

[i] iOS Simulator
[a] Android Emulator
[w] Expo Go on web
[r] Reload
[m] Toggle menu
[j] Toggle slow animations
[o] Open in Expo Go
```

### Choose Your Platform

#### Option A: iOS Simulator (macOS only)

Press `i` in the terminal to launch iOS Simulator.

The app will automatically build and install on the simulator.

#### Option B: Android Emulator

1. Open Android Studio
2. Start an Android Virtual Device
3. Press `a` in the terminal

The app will build and install on the emulator.

#### Option C: Physical Device with Expo Go

1. Download **Expo Go** app from:
   - iOS App Store
   - Google Play Store

2. In the terminal, press `o` or scan the QR code

3. The app will load on your device

#### Option D: Web (Browser)

Press `w` in the terminal to open in a web browser.

### Verify Setup

Once the app loads:

1. ✅ You should see the Home screen with the TV Guide
2. ✅ The app should fetch today's sports games
3. ✅ You can see:
   - Time slots on the left
   - Sport tabs at the top
   - Upcoming Today section
   - Games grid
   - Bottom navigation tabs

If you see an empty state or errors, check the [Troubleshooting](#-troubleshooting) section below.

### Backend Setup

Your backend should be running to provide sports data.

#### Ensure Your FastAPI Backend is Running

```bash
# From the repo root
uv run python main.py
```

The backend reads its port from `config.py` (`settings.port`, default `3001`) and listens on `http://localhost:3001`.

#### Test Backend Connection

Once both are running, check if the API is accessible:

```bash
curl "http://localhost:3001/api/schedule/football-nfl?date=20260310&seasontype=2"
```

You should get a JSON response with game data.

---

## 📖 Usage

### Home Screen
- **Main view** showing today's games organized by time and sport
- **Pull to refresh** to get the latest games and scores
- **Tap on sport tabs** to filter by specific sport
- **Tap on a game** to see detailed box score

### Upcoming Today Section
- Shows live and upcoming games at the top
- Displays countdown timers for upcoming games
- Tap to view game details

### Game Details
- View comprehensive box score
- See team statistics and player leaders
- Set reminders with the 🔔 button
- Check game venue and broadcast network

### Navigation
- **Home** (🏠): Main TV guide
- **Favorites** (⭐): Your favorite teams and games
- **Search** (🔍): Find teams and games
- **Notifications** (🔔): Game reminders
- **Profile** (👤): Settings and preferences

---

## 🏗️ Architecture

### Project Structure

```
sports-tv-guide-app/
├── index.tsx             # Expo entry point
├── src/
│   ├── App.tsx           # Root component with navigation
│   ├── components/       # Reusable React Native components
│   │   ├── BoxScoreModal.tsx
│   │   ├── BracketView.tsx
│   │   ├── EmptyState.tsx
│   │   ├── GameCard.tsx
│   │   ├── InProgressTodaySection.tsx
│   │   ├── SportTabs.tsx
│   │   └── TVGuideGrid.tsx
│   ├── screens/          # Screen components (full-screen views)
│   │   ├── HomeScreen.tsx
│   │   ├── BracketScreen.tsx
│   │   ├── StandingsScreen.tsx
│   │   ├── FavoritesScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/         # API and external service clients
│   │   └── api.ts        # FastAPI backend client
│   ├── store/            # State management (Zustand)
│   │   └── gameStore.ts  # Game state and selectors
│   ├── constants/
│   │   └── index.ts      # API URL, sports, colors, cache TTLs
│   └── types/
│       └── index.ts
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── babel.config.js       # Babel configuration
└── README.md             # This file
```

### Technology Stack

- **Framework**: Expo SDK 55 (React Native 0.83)
- **React**: 19.2
- **Language**: TypeScript 5.9
- **State Management**: Zustand
- **Navigation**: React Navigation (Bottom Tab + Stack Navigation)
- **Styling**: React Native StyleSheet
- **API Client**: Native Fetch API
- **Type Safety**: Full TypeScript coverage

### System Architecture

```
┌─────────────────────────────────┐
│   React Native (Expo)           │
│   ├─ Navigation Stack           │
│   ├─ Screens (Home, Favorites)  │
│   └─ Components (Cards, Grids)  │
└────────────┬────────────────────┘
             │
       HTTP Request
             │
             ▼
┌─────────────────────────────────┐
│   FastAPI Backend               │
│   ├─ /api/schedule/{sport}      │
│   ├─ /api/game/{sport}/{id}     │
│   └─ ESPN API Integration       │
└─────────────────────────────────┘
             │
       HTTP Request
             │
             ▼
┌─────────────────────────────────┐
│   ESPN Public API               │
│   (Sports data provider)        │
└─────────────────────────────────┘
```

---

## 💾 API Integration

### ESPN API Endpoints Used

The app connects to your FastAPI backend which provides ESPN data:

```
GET  /api/schedule/{sport}?date={YYYYMMDD}&seasontype={2|3}
GET  /api/game/{sport}/{eventId}
```

### Supported Sports

- `basketball-college` - NCAA Basketball
- `football-college` - NCAA Football
- `football-nfl` - NFL Football
- `baseball-mlb` - MLB Baseball
- `hockey-nhl` - NHL Hockey
- `golf-pga` - PGA Golf
- `golf-liv` - LIV Golf

---

## 🔧 State Management

### Zustand Store (`src/store/gameStore.ts`)

The app uses Zustand for centralized state management:

```typescript
// Get all games
const games = useGameStore((state) => getAllGames(state));

// Get live games
const liveGames = useGameStore((state) => getLiveGames(state));

// Update preferences
useGameStore((state) => state.setPreferences({ ... }));

// Toggle favorite
useGameStore((state) => state.toggleFavoriteGame(gameId));
```

### Caching Strategy

Defined in [`src/constants/index.ts`](src/constants/index.ts) (`CACHE_DURATION`):

- **Schedule Data**: 30 seconds
- **Game Summary**: 60 seconds
- **Standings / Brackets**: 5 minutes
- **Preferences**: 24 hours
- **Manual Refresh**: Clears all caches

---

---

## ⚙️ Customization

### Change Colors
File: `src/constants/index.ts`
```typescript
PRIMARY: '#667eea',     // Change this
LIVE_RED: '#ff4444',    // Or this
```

### Change API URL
Set the `EXPO_PUBLIC_API_URL` environment variable before starting Expo:
```bash
EXPO_PUBLIC_API_URL=https://your-api.com npx expo start
```
The default (when unset) is defined in [`src/constants/index.ts`](src/constants/index.ts).

### Add Sport
File: `src/constants/index.ts`
```typescript
SPORTS: {
  'new-sport': { label: '⚾', displayName: 'New Sport' }
}
```

---

## 🧪 Testing

```bash
npm test
```

Tests use Jest and React Testing Library. Add tests to `src/**/__tests__/` directories.

---

## 🚢 Deployment

### Building for Production

**iOS:**
```bash
eas build --platform ios --auto-submit
```

**Android:**
```bash
eas build --platform android
```

### Release Process

1. Update version in `app.json`
2. Build for release
3. Submit to App Store (iOS) or Google Play (Android)

---

## 🐛 Troubleshooting

### Issue: "Module not found" errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: App won't start after changes

**Solution:**
```bash
npx expo start --clear
```

### Issue: API connection errors

If you see the banner **"Cannot reach API at http://localhost:3001 — is the backend running on port 3001?"**, the frontend can't talk to the backend.

**Solutions:**
1. Verify backend is running: `curl http://localhost:3001/docs` should return HTML.
2. Confirm the backend started on the expected port. `uv run python main.py` honors `settings.port` (default 3001); `fastapi dev main.py` without `--port 3001` will silently use 8000.
3. If you've overridden `EXPO_PUBLIC_API_URL`, double-check it matches the backend's host and port.
4. Check firewall settings allow connection.

### Issue: TypeScript errors

**Solution:**
```bash
npm run lint
```

Then fix any reported issues.

### Issue: Port 8081 already in use

**Solution:**
```bash
# Kill process on port 8081
lsof -i :8081
kill -9 <PID>

# Or use different port
npx expo start --port 8082
```

### Issue: "Couldn't connect to Expo"

**Solutions:**
1. Restart the development server: `npx expo start`
2. Restart Expo Go on your device
3. Try scanning the QR code again

### Issue: Blank screen or errors

**Checks:**
1. Check browser console for errors (press `j`)
2. Verify backend is running and accessible
3. Check network tab in DevTools
4. Review API response in network tab

---

## 📚 Additional Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development patterns and best practices
- **[TODO.md](./TODO.md)** - Development roadmap and feature backlog

---

## 🔗 Useful Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Zustand Documentation](https://zustand-demo.vercel.app/)
- [React Navigation Guide](https://reactnavigation.org/)

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/name`
2. Make your changes
3. Write tests
4. Submit a pull request

---

## 📄 License

MIT

---

## 💬 Support

For issues or questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review existing GitHub issues
3. Create a new issue with details and screenshots

---

**Built with ❤️ using Expo and React Native**