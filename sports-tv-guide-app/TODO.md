# 🚀 Sports TV Guide - Development Roadmap

Track of what's in progress and what still needs work.

---

## 🚧 Phase 3: Feature Implementation (IN PROGRESS / NEEDED)

### High Priority (Recommended First)

#### Standings — College Sports
- ✅ Add `basketball-college` standings to UI (shipped in commit `03e76da`)
- 📋 Add `football-college` standings (backend + UI)
  - [ ] Add ESPN URL to `STANDINGS_URLS` in `constants/espn.py`
  - [ ] Add route to `api/standings.py` (`_PATH_TO_SPORT`)
  - [ ] Add `football-college` to `STANDINGS_SPORTS` in `StandingsScreen.tsx`
  - [ ] Define column config in `COLUMNS` (W-L-T, PCT, PF, PA)
  - [ ] Add label/emoji to `SPORT_INFO`
  - [ ] Add to `StandingsSportType` in `src/types/index.ts`

**Estimated:** 1-2 hours

#### Favorites Functionality
FavoritesScreen is shipped: shows saved games (sorted by start time), star toggle to
add/remove, wired to the store, and persisted via AsyncStorage. Remaining:
- [ ] Display favorite teams (currently games only)
- [ ] Filter by sport

**Estimated:** 1 hour

#### Search Functionality
- 📋 Implement SearchScreen
  - [ ] Search by team name
  - [ ] Search by sport
  - [ ] Search by date
  - [ ] Display results
- 📋 Add search logic to store

**Estimated:** 2-3 hours

#### Settings/Profile
- 📋 Expand ProfileScreen (dark mode toggle already shipped)
  - [ ] Edit timezone selection
  - [ ] Toggle notifications
  - [ ] View favorite teams list
  - [ ] Clear cache button

**Estimated:** 2 hours

#### Notifications (Reminders)
- 📋 Implement notification system
  - [ ] Set reminder for game
  - [ ] Schedule local notifications
  - [ ] Show notification alerts
  - [ ] Manage notification history
- 📋 Use `expo-notifications` package

**Estimated:** 3-4 hours

### Medium Priority

#### Offline Support
- 📋 Cache games data locally
- 📋 Show cached data when offline
- 📋 Sync when online again

**Estimated:** 2-3 hours

#### Error Boundaries
- 📋 Add ErrorBoundary component
- 📋 Graceful error handling
- 📋 Error logging

**Estimated:** 1 hour

#### Loading States
- 📋 Add skeleton loaders
- 📋 Better loading indicators
- 📋 Progress feedback

**Estimated:** 1-2 hours

#### Testing
- 📋 Unit tests for components
- 📋 API client tests
- 📋 State management tests
- 📋 Integration tests

**Estimated:** 4-5 hours

### Lower Priority (Polish)

#### UI/UX Polish
- 📋 Add animations
- 📋 Haptic feedback for interactions
- 📋 Loading skeletons
- 📋 Smooth page transitions
- 📋 Pull-to-refresh animation

**Estimated:** 3-4 hours

#### Accessibility (a11y)
- 📋 Screen reader support
- 📋 Keyboard navigation
- 📋 Alt text for all images

**Estimated:** 2-3 hours

#### Dark Mode
Dark theme, color scheme (`constants/theme.ts`), and the Profile toggle are shipped.
Remaining:
- [ ] System theme detection (follow OS light/dark via `Appearance`/`useColorScheme`)

**Estimated:** 30 min

#### App Icons & Splash Screen
- 📋 Generate app icons (multiple sizes)
- 📋 Create splash screen design
- 📋 Update assets

**Estimated:** 1 hour

---

## 🔧 Known Issues & Limitations

### Current Limitations
1. **Sports Data Source**
   - Only supports sports your backend provides
   - May need to add more sports endpoints

2. **Game Details**
   - Boxscore depends on ESPN API data availability
   - Some games may have limited stats

3. **Notifications**
   - Currently UI only (no actual notifications)
   - Requires `expo-notifications` setup

4. **Performance**
   - Large game lists may need virtualization
   - Images are emojis (not optimized images)

### Potential Issues to Monitor
- [ ] API timeout handling on slow networks
- [ ] Cache invalidation edge cases
- [ ] State sync across navigation
- [ ] Memory leaks with subscriptions
- [ ] Keyboard layout issues on small devices

---

## 📋 Not Yet Implemented

### Authentication
- [ ] User login/signup
- [ ] User profiles
- [ ] Syncing favorites to backend
- [ ] Social sharing

### Advanced Features
- [ ] Video highlights integration
- [ ] Betting odds display
- [ ] Fantasy sports integration
- [ ] Social comments/reactions
- [ ] Live chat during games
- [ ] Replay notifications

### Backend Integration
- [ ] WebSocket for real-time updates
- [ ] User account system
- [ ] Favorites syncing
- [ ] Analytics tracking
- [ ] Push notification service

---

## 📊 Implementation Order (Recommended)

**Week 1:**
1. College football standings
2. Finish Favorites (favorite-teams list + sport filter)

**Week 2:**
3. Implement Search
4. Implement Notifications UI + logic
5. Add error boundaries

**Week 3:**
6. Profile/Settings screen
7. Testing suite

**Week 4:**
8. Polish UI/animations
9. Accessibility improvements
10. App icons/splash screen

---

## 🎯 Milestones

### V1.0 (Next)
- [ ] Favorites functionality
- [ ] Search capability
- [ ] Notification reminders
- [ ] Settings/profile
- [ ] Full test coverage

### V1.1 (Later)
- [ ] Offline support
- [ ] Advanced search
- [ ] Social features
- [ ] Analytics

### V2.0 (Future)
- [ ] User accounts
- [ ] Cloud sync
- [ ] Advanced features
- [ ] Performance optimizations

---

## 🔧 Technical Debt & Improvements

### Code Quality
- [ ] Add JSDoc comments to all components
- [ ] Improve error messages
- [ ] Standardize error handling
- [ ] Extract magic strings to constants

### Performance
- [ ] Implement FlatList virtualization for large lists
- [ ] Optimize re-renders with useMemo
- [ ] Code splitting by screen
- [ ] Image optimization

### Testing
- [ ] Add unit tests for utils
- [ ] Add integration tests
- [ ] Add E2E tests
- [ ] Improve test coverage

### Documentation
- [ ] API client usage guide
- [ ] Component prop documentation
- [ ] Setup troubleshooting guide
- [ ] Architecture decision records (ADR)

---

## 📦 Dependencies to Consider

Already installed (see `package.json`): `@react-native-async-storage/async-storage`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-local-authentication`, `expo-secure-store`.

Still to add when their feature lands:
- 📦 `expo-notifications` - Local/push notifications
- 📦 `expo-linear-gradient` - Background gradients
- 📦 `lottie-react-native` - Animations

---

## ✨ Quick Wins (Easy to Implement)

1. **Pull-to-Refresh Animation** (30 min)
   - Add visual feedback when refreshing

2. **Better Empty State** (1 hour)
   - More helpful messaging
   - Suggest actions

3. **Game Notifications** (2 hours)
   - Toast notifications for live updates
   - Sound effect option

---

## 📞 Questions to Answer

Before implementing new features, consider:

1. **Backend Support** - Does the API support this?
2. **Performance** - Will it impact performance?
3. **UX** - Does it improve user experience?
4. **Priority** - Is this user-requested?
5. **Effort** - Time to implement vs. benefit?

---

## 🚀 Getting Help

### For Feature Implementation
1. Check this TODO for priority
2. Review DEVELOPMENT.md for patterns
3. Look at existing components for examples
4. Ask if unclear

### For Bug Fixes
1. Document the issue
2. Create a minimal reproduction
3. Check console logs
4. Use React DevTools/Expo debugger

---

**Last Updated:** July 18, 2026
**Current Status:** Feature Development Phase
**Next Priority:** College Football Standings + Search (Favorites, dark mode & persistence shipped)
