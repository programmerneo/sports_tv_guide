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
Edit `app.json` and set your backend URL:
```json
{
  "extra": {
    "apiUrl": "http://localhost:8000",
    "apiTimeout": 10000
  }
}
```

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

Before running the app, update the API endpoint to match your backend:

**Option A: Local Development**
If your backend is running locally on port 8000:

```json
{
  "extra": {
    "apiUrl": "http://localhost:8000",
    "apiTimeout": 10000
  }
}
```

**Option B: Remote Backend**
If you have a deployed backend, update `app.json`:

```json
{
  "extra": {
    "apiUrl": "https://your-api-domain.com",
    "apiTimeout": 10000
  }
}
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
# From your backend directory
cd /path/to/backend
python main.py
# or
fastapi dev main.py
```

The backend should be running on `http://localhost:8000`

#### Test Backend Connection

Once both are running, check if the API is accessible:

```bash
curl http://localhost:8000/api/schedule/football-nfl?date=20260310&seasontype=2
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
├── src/
│   ├── components/       # Reusable React Native components
│   │   ├── InProgressTodaySection.tsx
│   │   ├── SportTabs.tsx
│   │   ├── TVGuideGrid.tsx
│   │   ├── GameCard.tsx
│   │   ├── BoxScoreModal.tsx
│   │   └── EmptyState.tsx
│   ├── screens/          # Screen components (full-screen views)
│   │   ├── HomeScreen.tsx
│   │   ├── FavoritesScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/         # API and external service clients
│   │   └── api.ts        # ESPN API client
│   ├── store/            # State management (Zustand)
│   │   └── gameStore.ts  # Game state and selectors
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   ├── constants/        # App constants and configuration
│   │   └── index.ts
│   ├── hooks/            # Custom React hooks (future)
│   ├── utils/            # Utility functions (future)
│   └── App.tsx           # Main app component with navigation
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

- **Schedule Data**: 45 seconds cache
- **Game Summary**: 60 seconds cache
- **Preferences**: 24 hours cache
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
File: `app.json`
```json
"extra": {
  "apiUrl": "https://your-api.com"
}
```

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

**Solutions:**
1. Verify backend is running: `curl http://localhost:8000/api/health`
2. Check API URL in `app.json` is correct
3. Verify backend port matches `app.json` configuration
4. Check firewall settings allow connection

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